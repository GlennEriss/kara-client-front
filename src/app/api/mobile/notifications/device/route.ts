import { saveNotificationDevice } from '@/domains/mobile/server/notifications'
import type { NextRequest } from 'next/server'
export const runtime = 'nodejs'
export const PUT = (request: NextRequest) => saveNotificationDevice(request)
export const DELETE = (request: NextRequest) =>
  saveNotificationDevice(request, true)
