// src/main/services/magpie.ts
import { execFile, spawn, type ChildProcess } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import { logger } from '../logger'
import { getSetting } from '../settings'

// 游戏窗口出现前最多等待的时间；超时后不再补发热键，避免误缩放其它前台窗口。
const WINDOW_WAIT_TIMEOUT_MS = 60_000
// 冷启动 Magpie（WinUI 3）到注册全局热键需要一段时间，先等它初始化完成再模拟按键。
const COLD_START_GRACE_MS = 3_000
const HOTKEY_SENT_EXIT_CODE = 10

export interface MagpieLaunch {
  coldStart: boolean
}

let triggerProcess: ChildProcess | null = null

// Magpie 没有提供缩放窗口的调用接口，只能模拟它注册的全局热键。
// 其键盘钩子不过滤注入事件，keybd_event 可以正常触发。
export async function ensureMagpieRunning(): Promise<MagpieLaunch | null> {
  const magpiePath = getSetting('magpiePath').trim()
  if (!magpiePath) {
    logger.warn('magpie', 'magpie enabled but path is empty')
    return null
  }
  if (!fs.existsSync(magpiePath)) {
    logger.warn('magpie', 'magpie executable not found', { magpiePath })
    return null
  }

  const running = await isMagpieRunning(magpiePath)
  if (running === null) return null
  if (running) {
    logger.info('magpie', 'already running')
    return { coldStart: false }
  }

  if (!await startMagpie(magpiePath)) return null
  logger.info('magpie', 'started', { magpiePath })
  return { coldStart: true }
}

// 已运行的 Magpie 收到新实例时会广播消息显示主窗口，必须先检查，避免启动时抢焦点。
function isMagpieRunning(magpiePath: string): Promise<boolean | null> {
  const command = 'if (Get-Process -Name $env:VEXUS_MAGPIE_NAME -ErrorAction SilentlyContinue) { "running" } else { "stopped" }'
  return new Promise(resolve => {
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], {
      env: { ...process.env, VEXUS_MAGPIE_NAME: path.basename(magpiePath, path.extname(magpiePath)) },
      timeout: 10_000,
      windowsHide: true
    }, (error, stdout, stderr) => {
      if (error) {
        const detail = stderr.trim()
        logger.warn('magpie', 'failed to query magpie process', { error: detail || error.message })
        resolve(null)
        return
      }
      resolve(stdout.trim() === 'running')
    })
  })
}

function startMagpie(magpiePath: string): Promise<boolean> {
  let child: ChildProcess
  try {
    // -t 表示只驻留托盘（Magpie 0.12+），不创建主窗口，避免抢走游戏焦点。
    child = spawn(magpiePath, ['-t'], {
      cwd: path.dirname(magpiePath),
      detached: true,
      stdio: 'ignore'
    })
  } catch (error) {
    logger.warn('magpie', 'failed to start magpie', { magpiePath, error })
    return Promise.resolve(false)
  }
  return new Promise(resolve => {
    child.once('spawn', () => {
      child.unref()
      resolve(true)
    })
    child.once('error', error => {
      logger.warn('magpie', 'magpie process error', { magpiePath, error })
      resolve(false)
    })
  })
}

// 在后台等待游戏窗口进入前台，再模拟热键；不阻塞启动流程。
export function triggerMagpieHotkey(gameId: string, rootPid: number, coldStart: boolean): void {
  const hotkey = getSetting('magpieHotkey').trim()
  if (!hotkey) {
    logger.warn('magpie', 'magpie hotkey not configured', { gameId })
    return
  }
  const keys = parseHotkey(hotkey)
  if (!keys) {
    logger.warn('magpie', 'invalid magpie hotkey', { gameId, hotkey })
    return
  }

  const magpiePath = getSetting('magpiePath').trim()
  cancelMagpieTrigger()
  const script = buildTriggerScript(rootPid, keys, coldStart ? COLD_START_GRACE_MS : 0)
  let child: ChildProcess
  try {
    child = spawn('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-EncodedCommand',
      Buffer.from(script, 'utf16le').toString('base64')
    ], {
      env: { ...process.env, VEXUS_MAGPIE_NAME: path.basename(magpiePath, path.extname(magpiePath)) },
      stdio: 'ignore',
      windowsHide: true
    })
  } catch (error) {
    logger.warn('magpie', 'failed to start hotkey trigger', { gameId, error })
    return
  }

  triggerProcess = child
  child.once('error', error => {
    logger.warn('magpie', 'hotkey trigger failed', { gameId, error })
    if (triggerProcess === child) triggerProcess = null
  })
  child.once('close', code => {
    if (triggerProcess !== child) return
    triggerProcess = null
    if (code === HOTKEY_SENT_EXIT_CODE) logger.info('magpie', 'hotkey sent', { gameId })
    else logger.info('magpie', 'hotkey trigger ended', { gameId, code })
  })
  child.unref()
}

export function cancelMagpieTrigger(): void {
  const child = triggerProcess
  if (!child) return
  triggerProcess = null
  try {
    child.kill()
  } catch (error) {
    logger.warn('magpie', 'failed to cancel hotkey trigger', { error })
  }
}

// 设置页保存的格式为 "Ctrl+Alt+F"，这里转换为按下顺序的虚拟键码。
const MODIFIER_VK: Record<string, number> = {
  ctrl: 0x11,
  control: 0x11,
  alt: 0x12,
  shift: 0x10,
  win: 0x5B,
  super: 0x5B,
  meta: 0x5B
}

const NAMED_KEY_VK: Record<string, number> = {
  space: 0x20,
  enter: 0x0D,
  esc: 0x1B,
  escape: 0x1B,
  tab: 0x09,
  backspace: 0x08,
  delete: 0x2E,
  insert: 0x2D,
  home: 0x24,
  end: 0x23,
  pageup: 0x21,
  pagedown: 0x22,
  up: 0x26,
  down: 0x28,
  left: 0x25,
  right: 0x27,
  plus: 0xBB,
  ';': 0xBA,
  '=': 0xBB,
  ',': 0xBC,
  '-': 0xBD,
  '.': 0xBE,
  '/': 0xBF,
  '`': 0xC0,
  '[': 0xDB,
  '\\': 0xDC,
  ']': 0xDD,
  "'": 0xDE
}

function keyToVk(key: string): number | undefined {
  if (/^[a-z]$/i.test(key)) return key.toUpperCase().charCodeAt(0)
  if (/^[0-9]$/.test(key)) return key.charCodeAt(0)
  const fn = /^f([1-9]|1[0-9]|2[0-4])$/i.exec(key)
  if (fn) return 0x70 + Number(fn[1]) - 1
  return NAMED_KEY_VK[key.toLowerCase()]
}

function parseHotkey(hotkey: string): number[] | null {
  const parts = hotkey.split('+').map(part => part.trim()).filter(Boolean)
  if (parts.length === 0) return null
  const modifiers: number[] = []
  let mainKey: number | undefined
  for (const part of parts) {
    const modifier = MODIFIER_VK[part.toLowerCase()]
    if (modifier !== undefined) {
      if (!modifiers.includes(modifier)) modifiers.push(modifier)
      continue
    }
    if (mainKey !== undefined) return null
    mainKey = keyToVk(part)
    if (mainKey === undefined) return null
  }
  if (mainKey === undefined) return null
  // Magpie 的快捷键必须包含修饰键；裸按键无法注册，也不应注入到游戏中。
  if (modifiers.length === 0) return null
  return [...modifiers, mainKey]
}

// PowerShell 轮询游戏进程树：前台窗口属于游戏后，注入热键触发 Magpie 缩放。
function buildTriggerScript(rootPid: number, keys: number[], graceMs: number): string {
  return `$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class VexusMagpieKeys {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
  [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
}
'@
$rootPid = ${rootPid}
$keys = @(${keys.join(',')})
$deadline = (Get-Date).AddMilliseconds(${WINDOW_WAIT_TIMEOUT_MS})
$notBefore = (Get-Date).AddMilliseconds(${graceMs})
$magpieName = $env:VEXUS_MAGPIE_NAME
$emptyPolls = 0
while ((Get-Date) -lt $deadline) {
  $rows = Get-CimInstance Win32_Process -Property ProcessId,ParentProcessId
  $children = @{}
  $alive = [System.Collections.Generic.HashSet[int]]::new()
  foreach ($row in $rows) {
    $processId = [int]$row.ProcessId
    $parentId = [int]$row.ParentProcessId
    [void]$alive.Add($processId)
    if (-not $children.ContainsKey($parentId)) { $children[$parentId] = [System.Collections.Generic.List[int]]::new() }
    [void]$children[$parentId].Add($processId)
  }
  $tree = [System.Collections.Generic.HashSet[int]]::new()
  $queue = [System.Collections.Generic.Queue[int]]::new()
  $queue.Enqueue($rootPid)
  while ($queue.Count -gt 0) {
    $current = $queue.Dequeue()
    if ($tree.Add($current) -and $children.ContainsKey($current)) {
      foreach ($childId in $children[$current]) { $queue.Enqueue($childId) }
    }
  }
  $treeAlive = $false
  foreach ($processId in $tree) { if ($alive.Contains($processId)) { $treeAlive = $true; break } }
  if (-not $treeAlive) {
    $emptyPolls += 1
    if ($emptyPolls -ge 4) { exit 0 }
  } else {
    $emptyPolls = 0
    if ((Get-Date) -ge $notBefore) {
      $handle = [VexusMagpieKeys]::GetForegroundWindow()
      $fgPid = [uint32]0
      [void][VexusMagpieKeys]::GetWindowThreadProcessId($handle, [ref]$fgPid)
      if ($tree.Contains([int]$fgPid)) {
        Start-Sleep -Milliseconds 400
        $handle = [VexusMagpieKeys]::GetForegroundWindow()
        $fgPid = [uint32]0
        [void][VexusMagpieKeys]::GetWindowThreadProcessId($handle, [ref]$fgPid)
        if ($tree.Contains([int]$fgPid) -and (Get-Process -Name $magpieName -ErrorAction SilentlyContinue)) {
          foreach ($vk in $keys) { [VexusMagpieKeys]::keybd_event([byte]$vk, 0, 0, [UIntPtr]::Zero); Start-Sleep -Milliseconds 30 }
          [array]::Reverse($keys)
          foreach ($vk in $keys) { [VexusMagpieKeys]::keybd_event([byte]$vk, 0, 2, [UIntPtr]::Zero); Start-Sleep -Milliseconds 30 }
          exit ${HOTKEY_SENT_EXIT_CODE}
        }
      }
    }
  }
  Start-Sleep -Milliseconds 600
}
exit 0
`
}