import { Language } from '../types'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const __md5 = require('md5')
const md5 = typeof __md5 === 'function' ? __md5 : __md5.default

type Entry = { v: string; e: number }

const mem = new Map<string, Entry>()
const MAX = 500

function k(provider: string, lang: Language, termbase: boolean, text: string) {
    return `${provider}:${lang}:${termbase ? 1 : 0}:${md5(text)}`
}

export async function getTranslationFromCache(provider: string, lang: Language, termbase: boolean, text: string) {
    const key = k(provider, lang, termbase, text)
    const hit = mem.get(key)
    if (hit && hit.e > Date.now()) {
        console.info('[Translate] CacheHit: using cached result', { provider, lang, termbase, key: md5(text), expiresAt: new Date(hit.e).toISOString() })
        return hit.v
    }
    return undefined
}

export async function setTranslationToCache(provider: string, lang: Language, termbase: boolean, text: string, value: string, ttlMs: number) {
    const key = k(provider, lang, termbase, text)
    const entry = { v: value, e: Date.now() + ttlMs }
    mem.set(key, entry)
    if (mem.size > MAX) {
        const first = mem.keys().next().value as string | undefined
        if (first) mem.delete(first)
    }
}

export function dedupe(texts: string[]) {
    const map = new Map<string, number>()
    const uniq: string[] = []
    const indexes: number[] = []
    texts.forEach((t, i) => {
        const h = md5(t)
        if (!map.has(h)) {
            map.set(h, uniq.length)
            uniq.push(t)
        }
        indexes[i] = map.get(h) as number
    })
    return { uniq, indexes }
}
