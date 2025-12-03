jest.mock('../../config', () => ({
  googleApiKey: 'mock-google',
  baiduAppId: 'mock-baidu-appid',
  baiduKey: 'mock-baidu-key',
  cozeApiKey: 'mock-coze-key',
}), { virtual: true });
jest.mock('@create-figma-plugin/utilities', () => ({ emit: jest.fn(), on: jest.fn() }));

import { needPolishing, polishContent } from '../src/feature/polisher';
import { Language } from '../src/types';

describe('needPolishing', () => {
  test('should return false for empty text', () => {
    expect(needPolishing('')).toBe(false);
  });

  test('should return false for text with less than 5 words/characters', () => {
    expect(needPolishing('Hello')).toBe(false);
    expect(needPolishing('你好')).toBe(false);
  });

  test('should return true for text with more than 5 words/characters', () => {
    expect(needPolishing('Hello world this is a longer unit test sentence today')).toBe(true);
    expect(needPolishing('你好，世界，这是一个非常非常长的测试文本内容')).toBe(true);
  });

  test('should return false for mixed text with less than 5 words/characters', () => {
    expect(needPolishing('Hello 你好 world')).toBe(false);
  });

  test('should return true for mixed text with more than 5 words/characters', () => {
    expect(needPolishing('Hello 你好世界 world today unit test example')).toBe(true);
  });
});

// Mock fetch API
(global.fetch as jest.Mock) = jest.fn();

(global as any).figma = {
  clientStorage: {
    getAsync: jest.fn().mockResolvedValue('mock-coze-key'),
    setAsync: jest.fn(),
  },
};

const mockCreateChatResponse = {
  data: {
    conversation_id: '12345',
    id: '67890',
  },
};

const mockIsChatCompleteResponse = {
  data: {
    status: 'completed',
  },
};

const mockFetchChatResultResponse = {
  data: [{ content: 'Polished content' }],
};

describe('polishContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  test('should throw error if content is not provided', async () => {
    await expect(polishContent('', Language.EN)).rejects.toThrow('Content and target language must be provided');
  });

  test('should call Coze API and return polished content', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCreateChatResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockIsChatCompleteResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockFetchChatResultResponse),
      });

    const content = 'Hello world';
    const targetLanguage = Language.EN;

    const result = await polishContent(content, targetLanguage);
    expect(result).toBe('Polished content');
  });

  test('should return original content when createChat fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });
    const content = 'Failure case content';
    const targetLanguage = Language.ZH;
    const result = await polishContent(content, targetLanguage);
    expect(result).toBe(content);
  });

  test('should use cache for repeated inputs', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockCreateChatResponse) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockIsChatCompleteResponse) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockFetchChatResultResponse) });

    const content = 'Cached content sample';
    const targetLanguage = Language.EN;
    const r1 = await polishContent(content, targetLanguage);
    const r2 = await polishContent(content, targetLanguage);
    expect(r1).toBe('Polished content');
    expect(r2).toBe('Polished content');
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(3);
  });
});
