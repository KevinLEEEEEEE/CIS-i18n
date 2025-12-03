jest.mock('../../config', () => ({
    googleTranslateProjectID: 'p1',
    googleTranslateLocations: 'global',
    googleTranslateGlossaryID: 'g1',
}), { virtual: true });
jest.mock('@create-figma-plugin/utilities', () => {
    let onceHandler: any = null
    return {
        emit: jest.fn((event: string, payload: any) => {
            if (event === 'AJAX_REQUEST' && onceHandler) {
                const messageID = payload.messageID
                setTimeout(() => {
                    onceHandler({
                        isSuccessful: true,
                        messageID,
                        data: { trans_result: [{ dst: 'R1' }, { dst: 'R2' }] }
                    })
                }, 0)
            }
        }),
        once: jest.fn((event: string, handler: any) => { if (event === 'AJAX_RESPONSE') onceHandler = handler })
    }
});

import { needTranslating, isGoogleTranslationApiAccessible, translateContentByModal } from '../src/feature/translator'
import { Language, TranslationModal, StorageKey } from '../src/types'

(global as any).figma = {
    clientStorage: {
        getAsync: jest.fn(async (key: StorageKey) => {
            if (key === StorageKey.GoogleAPIKey) return 'mock-google-key'
            if (key === StorageKey.GoogleAccessToken) return 'mock-access-token'
            if (key === StorageKey.BaiduAppID) return 'appid'
            if (key === StorageKey.BaiduKey) return 'secret'
            return ''
        }),
        setAsync: jest.fn(),
    },
}

describe('needTranslating', () => {
    test('skip dictionary items', () => {
        expect(needTranslating('USD', Language.ZH)).toBe(false)
    })
    test('single letter to ZH should not translate', () => {
        expect(needTranslating('A', Language.ZH)).toBe(false)
    })
    test('ZH→EN detect Chinese', () => {
        expect(needTranslating('你好 world', Language.EN)).toBe(true)
    })
    test('EN→ZH detect English', () => {
        expect(needTranslating('hello 世界', Language.ZH)).toBe(true)
    })
})

describe('isGoogleTranslationApiAccessible', () => {
    beforeEach(() => { jest.clearAllMocks() })
    test('returns true and caches within TTL', async () => {
        ; (global.fetch as jest.Mock) = jest.fn().mockResolvedValue({ ok: true })
        const r1 = await isGoogleTranslationApiAccessible()
        const r2 = await isGoogleTranslationApiAccessible()
        expect(r1).toBe(true)
        expect(r2).toBe(true)
        expect((global.fetch as jest.Mock).mock.calls.length).toBe(1)
    })
    test('timeout returns false', async () => {
        ; (global.fetch as jest.Mock) = jest.fn().mockImplementation(() => new Promise(() => { }))
        const r = await isGoogleTranslationApiAccessible()
        expect(r).toBe(false)
    })
})

describe('translateContentByModal', () => {
    beforeEach(() => { jest.clearAllMocks(); (global.fetch as any) = jest.fn() })

    test('GoogleBasic returns translations and caches', async () => {
        ; (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ data: { translations: [{ translatedText: 'A' }, { translatedText: 'B' }] } }),
        })
        const input = ['x1', 'x2', 'x1']
        const out1 = await translateContentByModal(input, Language.EN, TranslationModal.GoogleBasic, false)
        const out2 = await translateContentByModal(input, Language.EN, TranslationModal.GoogleBasic, false)
        expect(out1).toEqual(['A', 'B', 'A'])
        expect(out2).toEqual(['A', 'B', 'A'])
        expect((global.fetch as jest.Mock).mock.calls.length).toBe(1)
    })

    test('GoogleAdvanced with glossary uses glossaryTranslations', async () => {
        ; (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ glossaryTranslations: [{ translatedText: 'GA' }, { translatedText: 'GB' }] }),
        })
        const input = ['g1', 'g2']
        const out = await translateContentByModal(input, Language.EN, TranslationModal.GoogleAdvanced, true)
        expect(out).toEqual(['GA', 'GB'])
    })

    test('GoogleFree single translation', async () => {
        ; (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => [[['FREE']]] })
        const out = await translateContentByModal(['only1'], Language.EN, TranslationModal.GoogleFree, false)
        expect(out).toEqual(['FREE'])
    })

    test('Baidu translation via emit/once', async () => {
        const out = await translateContentByModal(['b1', 'b2'], Language.EN, TranslationModal.Baidu, false)
        expect(out).toEqual(['R1', 'R2'])
    })
})

