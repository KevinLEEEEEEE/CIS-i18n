type Level = 'debug' | 'info' | 'log' | 'warn' | 'error'

const levelOrder: Record<Level, number> = {
  debug: 10,
  info: 20,
  log: 20,
  warn: 30,
  error: 40,
}

let currentLevel: Level = 'debug'

function getLocalStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

const original = {
  debug: console.debug.bind(console),
  info: console.info.bind(console),
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
}

function shouldPrint(level: Level) {
  return levelOrder[level] >= levelOrder[currentLevel]
}

function isoNow() {
  return new Date().toISOString()
}

function safeStringify(value: unknown) {
  if (typeof value === 'string') return value
  try {
    const seen = new WeakSet()
    return JSON.stringify(value, function (_key, val) {
      if (typeof val === 'object' && val !== null) {
        if (seen.has(val as object)) return '[Circular]'
        seen.add(val as object)
      }
      if (val instanceof Error) {
        return { name: val.name, message: val.message, stack: val.stack }
      }
      return val
    })
  } catch {
    return String(value)
  }
}

function extractContext(args: unknown[]) {
  let stage = 'General'
  let step = ''
  let message = ''
  const rest: unknown[] = []

  if (args.length > 0 && typeof args[0] === 'string') {
    const s = String(args[0])
    const m = s.match(/^\[([^\]]+)\]\s*(.*)$/)
    if (m) {
      stage = m[1]
      const remaining = m[2] || ''
      if (remaining.includes(':')) {
        const idx = remaining.indexOf(':')
        step = remaining.slice(0, idx).trim()
        message = remaining.slice(idx + 1).trim()
      } else {
        message = remaining
      }
      for (let i = 1; i < args.length; i++) rest.push(args[i])
    } else {
      const str = s
      if (str.includes(':')) {
        const idx = str.indexOf(':')
        step = str.slice(0, idx).trim()
        message = str.slice(idx + 1).trim()
      } else {
        message = str
      }
      for (let i = 1; i < args.length; i++) rest.push(args[i])
    }
  } else {
    rest.push(...args)
  }

  return { stage, step, message, rest }
}

function format(level: Level, args: unknown[]) {
  const ts = isoNow()
  const { stage, step, message, rest } = extractContext(args)
  const segs = [`[${ts}]`, `[${level.toUpperCase()}]`, `[Stage: ${stage}]`]
  if (step) segs.push(`[Step: ${step}]`)
  const head = segs.join(' ')
  const msg = message ? `Message: ${message}` : ''
  const line = msg ? `${head} ${msg}` : head
  return [line, ...rest]
}

function print(level: Level, args: unknown[]) {
  if (!shouldPrint(level)) return
  if (level === 'error') {
    const normalized = args.map((a) => (a instanceof Error ? { name: a.name, message: a.message, stack: a.stack } : a))
    original.error(...format(level, normalized))
    return
  }
  original[level](...format(level, args))
}

export function setLogLevel(level: Level) {
  currentLevel = level
  try {
    const ls = getLocalStorage()
    if (ls) ls.setItem('LOG_LEVEL', level)
  } catch {}
}

export function setupLogging() {
  try {
    const ls = getLocalStorage()
    const saved = ls?.getItem('LOG_LEVEL') as Level | null
    if (saved && levelOrder[saved] !== undefined) {
      currentLevel = saved
    }
  } catch {}

  console.debug = (...args: unknown[]) => print('debug', args)
  console.info = (...args: unknown[]) => print('info', args)
  console.log = (...args: unknown[]) => print('log', args)
  console.warn = (...args: unknown[]) => print('warn', args)
  console.error = (...args: unknown[]) => print('error', args)

  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      const payload = {
        message: event.message,
        filename: (event as ErrorEvent).filename,
        lineno: (event as ErrorEvent).lineno,
        colno: (event as ErrorEvent).colno,
        error:
          (event as ErrorEvent).error && (event as ErrorEvent).error instanceof Error
            ? { name: (event as ErrorEvent).error.name, message: (event as ErrorEvent).error.message, stack: (event as ErrorEvent).error.stack }
            : safeStringify((event as ErrorEvent).error),
      }
      print('error', ['[GlobalError]', payload])
    })

    window.addEventListener('unhandledrejection', (event) => {
      const reason = (event as PromiseRejectionEvent).reason
      const payload = reason instanceof Error ? { name: reason.name, message: reason.message, stack: reason.stack } : safeStringify(reason)
      print('error', ['[UnhandledRejection]', payload])
    })
  }
}

export const logger = {
  setLogLevel,
}
