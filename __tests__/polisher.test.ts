import { polishContent } from '../src/feature/polisher'
import { Language } from '../src/types'

describe('polisher rate limit and cache', () => {
    beforeEach(() => {
        let step = 0
        // @ts-ignore
        global.fetch = jest.fn(async (url: string) => {
            step++
            if (url.includes('/v3/chat')) {
                return { ok: true, json: async () => ({ data: { conversation_id: 'c', id: 'i' } }) } as any
            }
            if (url.includes('/v3/chat/retrieve')) {
                return { ok: true, json: async () => ({ data: { status: 'completed' } }) } as any
            }
            if (url.includes('/v3/chat/message/list')) {
                return { ok: true, json: async () => ({ data: [{ content: 'Polished' }] }) } as any
            }
            return { ok: true, json: async () => ({}) } as any
        })
        process.env.NODE_ENV = 'test'
    })

    it('caches polish results by content and language', async () => {
        const text = 'Hello world'
        await polishContent(text, Language.EN)
        const callsAfterFirst = (global.fetch as any).mock.calls.length
        await polishContent(text, Language.EN)
        expect((global.fetch as any).mock.calls.length).toBe(callsAfterFirst)
    })
})
