import { Language, StorageKey } from '../types'
import { getClientStorageValue, setLocalStorage } from '../utils/utility'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const __md5 = require('md5')
const md5 = typeof __md5 === 'function' ? __md5 : __md5.default

type Entry = { v: string; e: number }

const mem = new Map<string, Entry>()
const MAX = 500

/**
 * 构建翻译缓存的键
 * 结构：`provider:lang:termbaseFlag:md5(text)`
 * - provider: 翻译提供方标识（如 GoogleBasic/Baidu）
 * - lang: 目标语言枚举值
 * - termbaseFlag: 术语库启用标识（1 表示启用，0 表示未启用）
 * - md5(text): 文本内容的 MD5 摘要，避免存原文造成过大键
 */

function buildCacheKey(provider: string, lang: Language, termbase: boolean, text: string) {
    return `${provider}:${lang}:${termbase ? 1 : 0}:${md5(text)}`
}

export async function getTranslationFromCache(provider: string, lang: Language, termbase: boolean, text: string) {
    const key = buildCacheKey(provider, lang, termbase, text)
    const hit = mem.get(key)
    if (hit && hit.e > Date.now()) {
        console.info('[Translate] CacheHit: using cached result', { provider, lang, termbase, key: md5(text), expiresAt: new Date(hit.e).toISOString() })
        return hit.v
    }
    const store = (await getClientStorageValue(StorageKey.TranslationCache)) as Record<string, Entry>
    const entry = store[key]
    if (entry && entry.e > Date.now()) {
        mem.set(key, entry)
        console.info('[Translate] CacheHit: using persisted result', { provider, lang, termbase, key: md5(text), expiresAt: new Date(entry.e).toISOString() })
        return entry.v
    }
    return undefined
}

export async function setTranslationToCache(provider: string, lang: Language, termbase: boolean, text: string, value: string, ttlMs: number) {
    const key = buildCacheKey(provider, lang, termbase, text)
    const entry = { v: value, e: Date.now() + ttlMs }
    mem.set(key, entry)
    if (mem.size > MAX) {
        const first = mem.keys().next().value as string | undefined
        if (first) mem.delete(first)
    }
    const store = (await getClientStorageValue(StorageKey.TranslationCache)) as Record<string, Entry>
    store[key] = entry
    const keys = Object.keys(store)
    if (keys.length > MAX) delete store[keys[0]]
    await setLocalStorage(StorageKey.TranslationCache, store)
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

export async function clearTranslationCache() {
    mem.clear()
    await setLocalStorage(StorageKey.TranslationCache, {})
    console.info('[Translate] CacheCleared')
}
