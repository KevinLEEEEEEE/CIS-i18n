jest.mock('@create-figma-plugin/utilities', () => ({ emit: jest.fn(), on: jest.fn() }))

import { formRequestBody, getClientStorageValue, setLocalStorage } from '../src/utils/utility'
import { StorageKey } from '../src/types'

(global as any).figma = {
    clientStorage: {
        getAsync: jest.fn(async (key: StorageKey) => {
            if (key === StorageKey.GoogleAPIKey) return 'k'
            return undefined
        }),
        setAsync: jest.fn(),
    }
}

describe('utility', () => {
    test('formRequestBody encodes correctly', () => {
        const s = formRequestBody({ a: 'b c', d: 1, e: true })
        expect(s).toBe('a=b%20c&d=1&e=true')
    })

    test('getClientStorageValue falls back to default when undefined', async () => {
        const v = await getClientStorageValue(StorageKey.GoogleAccessToken)
        expect(typeof v).toBe('string')
    })

    test('setLocalStorage writes when figma present', async () => {
        await setLocalStorage(StorageKey.GoogleAccessToken, 't')
        expect((global as any).figma.clientStorage.setAsync).toHaveBeenCalled()
    })
})

