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
    expect(needPolishing('Hello world, this is a test')).toBe(true);
    expect(needPolishing('你好，世界，这是一个测试')).toBe(true);
  });

  test('should return false for mixed text with less than 5 words/characters', () => {
    expect(needPolishing('Hello 你好 world')).toBe(false);
  });

  test('should return true for mixed text with more than 5 words/characters', () => {
    expect(needPolishing('Hello 你好世界 world')).toBe(true);
  });
});

// Mock fetch API
(global.fetch as jest.Mock) = jest.fn();

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
});
