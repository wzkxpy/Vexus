!macro customUnInstall
  # 覆盖安装会复用卸载流程，此时保留启动项；真正卸载才清理。
  ${ifNot} ${isUpdated}
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Vexus"
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run" "Vexus"
  ${endif}
!macroend