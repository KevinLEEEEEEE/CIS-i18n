import { translateContentByModal } from '../src/feature/translator'
import { TranslationModal, Language } from '../src/types'

describe('translator cache and dedupe', () => {
    beforeEach(() => {
        // @ts-ignore
        global.fetch = jest.fn(async () => ({ ok: true, json: async () => [[['X']]] }))
    })

    it('dedupes inputs and caches results for GoogleFree', async () => {
        const arr = ['A', 'A', 'B']
        const res1 = await translateContentByModal(arr, Language.ZH, TranslationModal.GoogleFree, false)
        expect(res1.length).toBe(3)
        expect((global.fetch as any).mock.calls.length).toBe(2)

        const res2 = await translateContentByModal(arr, Language.ZH, TranslationModal.GoogleFree, false)
        expect(res2.length).toBe(3)
        expect((global.fetch as any).mock.calls.length).toBe(2)
    })
})
