import { on, emit } from '@create-figma-plugin/utilities'
import { InitTrackingHandler, TrackEventHandler } from '../types'

const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxC4m2vX_68JypeKbsrVR5wCnJp-YjYnYBM6kuQpvUXNQbF1sRMD6O5Zu2e5S_9WDxX/exec'

let trackingUserId = 'anonymous'
// no longer sending fileKey
const isDev = process.env.NODE_ENV === 'development'
let trackingReady = false

function getIsoMinuteUTC() {
  const d = new Date()
  return d.toISOString().slice(0, 16) + 'Z'
}

function toJson(data: Record<string, any>) {
  return JSON.stringify(data)
}

function sendToGAS(eventName: string, data?: { [key: string]: any }) {
  if (!trackingReady) {
    emit<any>('REQUEST_INIT_TRACKING')
    setTimeout(() => sendToGAS(eventName, data), 100)
    return
  }
  const ts = getIsoMinuteUTC()
  const nodeCount = data && typeof data['Node Count'] === 'number' ? data['Node Count'] : undefined
  const payload: Record<string, any> = {
    'event': eventName,
    'nodeCount': nodeCount ?? 0,
    'userId': trackingUserId,
  }

  if (isDev) {
    console.info('[Tracking] Dev payload', payload)
  }

  fetch(GAS_WEB_APP_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: {
      'Content-Type': 'application/json'
    },
    body: toJson(payload)
  }).then(() => {
    console.info(`[Tracking] Event sent: ${eventName} @ ${ts}`)
  }).catch((error) => {
    console.error(`[Tracking] Failed to send: ${eventName}`, error)
  })
}

export function registerTrackingHandlers() {
  on<InitTrackingHandler>('INIT_TRACKING', (userId: string, fileKey: string) => {
    void fileKey
    trackingUserId = userId || 'anonymous'
    trackingReady = true
  })

  on<TrackEventHandler>('TRACK_EVENT', (eventName: string, data?: { [key: string]: any }) => {
    if (typeof eventName !== 'string' || eventName.length === 0) {
      return
    }
    sendToGAS(eventName, data)
  })
}
