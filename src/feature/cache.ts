import { Language, StorageKey } from '../types'
import { getClientStorageValue, setLocalStorage } from '../utils/utility'
import md5 from 'md5'

type Entry = { v: string; e: number }

const mem = new Map<string, Entry>()
const MAX = 500

function k(provider: string, lang: Language, termbase: boolean, text: string) {
    return `${provider}:${lang}:${termbase ? 1 : 0}:${md5(text)}`
}

export async function getTranslationFromCache(provider: string, lang: Language, termbase: boolean, text: string) {
    const key = k(provider, lang, termbase, text)
    const hit = mem.get(key)
    if (hit && hit.e > Date.now()) return hit.v
    const store = (await getClientStorageValue(StorageKey.TranslationCache)) as Record<string, Entry>
    const entry = store[key]
    if (entry && entry.e > Date.now()) {
        mem.set(key, entry)
        return entry.v
    }
    return undefined
}

export async function setTranslationToCache(provider: string, lang: Language, termbase: boolean, text: string, value: string, ttlMs: number) {
    const key = k(provider, lang, termbase, text)
    const entry = { v: value, e: Date.now() + ttlMs }
    mem.set(key, entry)
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
