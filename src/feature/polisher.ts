import { Language, StorageKey } from '../types';
import { getClientStorageValue, setLocalStorage } from '../utils/utility';
import { polisherLimiter, runWithLimiter } from '../utils/rateLimiter'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const __md5 = require('md5');
const md5 = typeof __md5 === 'function' ? __md5 : __md5.default;

/**
 * 润色判定的最小文本规模（英文词 + 中文字符）
 * 说明：低于阈值不触发润色，避免短词误改
 */
const MINIMAL_POLISH_CONTENT_LENGTH = 20;
/**
 * 每秒最大调用次数（本地节流）
 * 说明：配合限速器，平滑请求压力
 */
const MAX_CALLS_PER_SECOND = 5;
/**
 * 本地润色缓存的最大条目数
 */
const CACHE_MAX_ENTRIES = 100;
/**
 * 润色结果缓存 TTL（毫秒），两天
 */
const CACHE_TTL_MS = 2 * 24 * 60 * 60 * 1000;
/**
 * 外部 API 请求超时时间（毫秒）
 */
const REQUEST_TIMEOUT_MS = 5000;

/**
 * 判断文本中英文单词与中文字符的总数是否大于 5
 * @param text - 输入的文本
 * @returns 是否需要润色的布尔值
 */
export function needPolishing(text: string): boolean {
    if (!text) {
        return false;
    }

    // 匹配英文单词的正则表达式
    const englishWordRegex = /\b[a-zA-Z]+\b/g;
    // 匹配中文字符的正则表达式
    const chineseCharRegex = /[\u4e00-\u9fa5]/g;

    // 获取英文单词的匹配结果
    const englishWords = text.match(englishWordRegex) || [];
    // 获取中文字符的匹配结果
    const chineseChars = text.match(chineseCharRegex) || [];

    // 计算英文单词与中文字符的总数
    const totalWordsAndChars = englishWords.length + chineseChars.length;

    return totalWordsAndChars > MINIMAL_POLISH_CONTENT_LENGTH;
}

/**
 * 调用 Coze API 进行内容润色
 * @param content - 需要润色的内容
 * @returns API 响应结果
 */
let __polishCacheRef: Map<string, { v: string; e: number }> | null = null;

function createPolishContentFunction() {
    let lastCallTimestamp = Date.now();
    const cache = new Map<string, { v: string; e: number }>();
    __polishCacheRef = cache;

    return async function polishContent(content: string, targetLanguage: Language) {
        if (!content || !targetLanguage) {
            throw new Error('Content and target language must be provided');
        }

        const key = `${targetLanguage}:${md5(content)}`;
        const cached = cache.get(key);
        if (cached && cached.e > Date.now()) {
            console.info('[Polish] CacheHit: using cached result', { key, expiresAt: new Date(cached.e).toISOString() });
            return cached.v;
        }

        const store = (await getClientStorageValue(StorageKey.PolishCache)) as Record<string, { v: string; e: number }>;
        const persisted = store[key];
        if (persisted && persisted.e > Date.now()) {
            cache.set(key, persisted);
            console.info('[Polish] CacheHit: using persisted result', { key, expiresAt: new Date(persisted.e).toISOString() });
            return persisted.v;
        }

        const currentTimestamp = Date.now();
        const timeElapsed = currentTimestamp - lastCallTimestamp;

        if (timeElapsed >= 1000) {
            // 如果超过一秒，重置计数器和时间戳
            lastCallTimestamp = currentTimestamp;
        }

        if (timeElapsed < 1000 && MAX_CALLS_PER_SECOND > 0) {
            const waitTime = 1000 - timeElapsed;
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            lastCallTimestamp = Date.now();
        }

        const prompt = targetLanguage === Language.ZH ? '润色以下文本: ' : 'Polish following content: ';
        try {
            const release = await polisherLimiter.acquire();
            const res = await runWithLimiter(release, () => fetchFromCozeApi(prompt, content));
            const out = typeof res === 'string' && res ? res : content;
            const entry = { v: out, e: Date.now() + CACHE_TTL_MS };
            cache.set(key, entry);
            if (cache.size > CACHE_MAX_ENTRIES) {
                const first = cache.keys().next().value as string | undefined;
                if (first) cache.delete(first);
            }
            const store2 = (await getClientStorageValue(StorageKey.PolishCache)) as Record<string, { v: string; e: number }>;
            store2[key] = entry;
            const keys = Object.keys(store2);
            if (keys.length > CACHE_MAX_ENTRIES) delete store2[keys[0]];
            await setLocalStorage(StorageKey.PolishCache, store2);
            return out;
        } catch (error) {
            console.error('[Polish] Error occurred during API call, returning original content:', error);
            return content; // 返回原始内容
        }
    };
}

// 使用闭包创建的函数
export const polishContent = createPolishContentFunction();

export async function clearPolishCache() {
    __polishCacheRef?.clear();
    await setLocalStorage(StorageKey.PolishCache, {});
    console.info('[Polish] CacheCleared');
}

/**
 * 调用 Coze API 进行内容润色
 * @param content - 需要润色的内容
 * @returns API 响应结果
 */
async function fetchFromCozeApi(prompt: string, content: string): Promise<any> {
    const result = await createChat(prompt + content);
    const conversationID = result.conversation_id;
    const chatID = result.id;

    if (!result) {
        return content; // 返回原始内容
    }

    if (process.env.NODE_ENV === 'test') {
        const completed = await isChatComplete(conversationID, chatID);
        return completed ? await fetchChatResult(conversationID, chatID) : content;
    }

    // 轮询 Coze 会话状态：非流式，按固定间隔检查是否完成
    return new Promise((resolve) => {
        const interval = setInterval(async () => {
            const isCompleted = await isChatComplete(conversationID, chatID);

            console.log('[Polish] Waiting for content return from Coze');

            if (isCompleted) {
                clearInterval(interval);
                clearTimeout(timeout); // 取消 setTimeout 定时器
                resolve(await fetchChatResult(conversationID, chatID));
            }
        }, 1000);

        const timeout = setTimeout(() => {
            clearInterval(interval);
            console.error('[Polish] Coze api timeout, returning original content', content);
            resolve(content);
        }, 20000);
    }).catch(() => {
        console.error('[Polish] Error occurred, returning original content');
        return content;
    });
}

/**
 * 创建聊天会话
 * @param content - 聊天内容
 * @returns 创建的聊天会话信息
 */
async function createChat(content: string) {
    try {
        const apiKey = await getClientStorageValue(StorageKey.CozeAPIKey);
        const apiUrl = 'https://api.coze.com/v3/chat'; // Coze API 的基础 URL

        const response = await fetchWithTimeout(apiUrl, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                bot_id: '7418029586187075592',
                user_id: '001',
                stream: false,
                auto_save_history: true,
                additional_messages: [
                    {
                        role: 'user',
                        content: content,
                        content_type: 'text',
                    },
                ],
            }),
        }, REQUEST_TIMEOUT_MS);

        if (!response || !response.ok) {
            throw new Error('Failed to fetch from Coze API'); // 错误处理
        }

        const result = await response.json();
        return result.data;
    } catch (error) {
        console.error('[Polish] Error in create Coze Chat:', error);
        return null; // 或者返回一个默认值
    }
}

/**
 * 检查聊天是否完成
 * @param conversationID - 会话 ID
 * @param chatID - 聊天 ID
 * @returns 聊天是否完成
 */
async function isChatComplete(conversationID: string, chatID: string) {
    try {
        const apiKey = await getClientStorageValue(StorageKey.CozeAPIKey);
        const apiUrl = `https://api.coze.com/v3/chat/retrieve?conversation_id=${conversationID}&chat_id=${chatID}`; // 拼接参数到 URL

        const response = await fetchWithTimeout(apiUrl, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
        }, REQUEST_TIMEOUT_MS);

        if (!response.ok) {
            throw new Error('Failed to fetch from Coze API'); // 错误处理
        }

        const res = await response.json();
        return res.data.status === 'completed';
    } catch (error) {
        console.error('[Polish] Error in isChatComplete:', error);
        return false; // 返回 false 表示未完成
    }
}

/**
 * 获取聊天结果
 * @param conversationID - 会话 ID
 * @param chatID - 聊天 ID
 * @returns 聊天结果
 */
async function fetchChatResult(conversationID: string, chatID: string) {
    try {
        const apiKey = await getClientStorageValue(StorageKey.CozeAPIKey);
        const apiUrl = `https://api.coze.com/v3/chat/message/list?conversation_id=${conversationID}&chat_id=${chatID}`;
        const response = await fetchWithTimeout(apiUrl, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
        }, REQUEST_TIMEOUT_MS);

        if (!response.ok) {
            throw new Error('Failed to fetch from Coze API'); // 错误处理
        }

        const res = await response.json();
        if (Array.isArray(res?.data) && res.data.length > 0) {
            const first = res.data[0];
            return typeof first?.content === 'string' ? first.content : null;
        }
        return null;
    } catch (error) {
        console.error('[Polish] Error in fetchChatResult:', error);
        return null; // 或者返回一个默认值
    }
}

function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number) {
    const AC: any = (typeof AbortController !== 'undefined' ? AbortController : null);
    if (AC && typeof AC === 'function') {
        const controller = new AC();
        const id = setTimeout(() => controller.abort(), timeoutMs);
        const opts = { ...options, signal: controller.signal } as RequestInit;
        return fetch(url, opts).finally(() => clearTimeout(id));
    }
    return Promise.race([
        fetch(url, options),
        new Promise((_, reject) => {
            const id = setTimeout(() => reject(new Error('Timeout')), timeoutMs);
            (id as unknown as { unref?: () => void }).unref?.();
        }),
    ]) as Promise<Response>;
}
