import type { Route } from './types'

export function getRouteLockState(route: Route, routesById: Map<string, Route>) {
  const condition = route.type === 'common' ? null : route.lockCondition
  if (!condition) return null
  const prerequisites = condition.preRouteIds.map(id => {
    const prerequisite = routesById.get(id)
    return { id, route: prerequisite, completed: prerequisite?.status === 'Completed' }
  })
  const completedCount = prerequisites.filter(item => item.completed).length
  // 缺失引用不算完成；空条件也不能因 every([]) 被误判为解锁。
  const conditionsMet = prerequisites.length > 0 && (condition.mode === 'all'
    ? completedCount === prerequisites.length
    : completedCount > 0)
  const unlocked = condition.unlocked || conditionsMet
  return { mode: condition.mode, prerequisites, completedCount, conditionsMet, unlocked }
}
