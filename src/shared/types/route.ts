// src/shared/types/route.ts

export interface Route {
  id: string
  gameId: string

  name: string
  description?: string
  routeType: RouteType

  playStatus: RoutePlayStatus
}

type RoutePlayStatus =
  | 'NotStarted'
  | 'Playing'
  | 'OnHold'
  | 'Completed'

type RouteType = 'Normal' | 'True' | 'Bad' | 'Extra'