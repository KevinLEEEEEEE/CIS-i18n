import { Language, StorageKey } from '../types';
import { getClientStorageValue } from '../utils/utility';

const MINIMAL_POLISH_CONTENT_LENGTH = 10; // 最小润色内容长度
const MAX_CALLS_PER_SECOND = 5; // 每秒最大调用次数
const MAX_CONCURRENT_POLISH_TASKS = 5; // 同时进行的最大任务数

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
function createPolishContentFunction() {
    let callCount = 0;
    let lastCallTimestamp = Date.now();
    let currentTasks = 0;

    return async function polishContent(content: string, targetLanguage: Language) {
        if (!content || !targetLanguage) {
            throw new Error('Content and target language must be provided');
        }

        // 等待直到有可用的任务槽
        while (currentTasks >= MAX_CONCURRENT_POLISH_TASKS) {
            console.log('[Polish] Task amount reaching limit, wait for release');
            await new Promise((resolve) => setTimeout(resolve, 100)); // 每100毫秒检查一次
        }

        const currentTimestamp = Date.now();
        const timeElapsed = currentTimestamp - lastCallTimestamp;

        if (timeElapsed >= 1000) {
            // 如果超过一秒，重置计数器和时间戳
            callCount = 0;
            lastCallTimestamp = currentTimestamp;
        }

        if (callCount < MAX_CALLS_PER_SECOND) {
            callCount++;
        } else {
            // 如果达到限制，等待直到下一秒
            const waitTime = 1000 - timeElapsed;
            console.log(`[Polish] Request frequency reaching limit, wait ${waitTime} ms`);
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            // 重置计数器和时间戳
            callCount = 1;
            lastCallTimestamp = Date.now();
        }

        const prompt = targetLanguage === Language.ZH ? '润色以下文本: ' : 'Polish following content: ';

        currentTasks++; // 增加当前任务计数
        try {
            return await fetchFromCozeApi(prompt, content);
        } catch (error) {
            console.error('[Polish] Error occurred during API call, returning original content:', error);
            return content; // 返回原始内容
        } finally {
            currentTasks--; // 任务完成后减少计数
        }
    };
}

// 使用闭包创建的函数
export const polishContent = createPolishContentFunction();

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
            resolve(content); // 返回原始内容
        }, 20000);
    }).catch(() => {
        console.error('[Polish] Error occurred, returning original content');
        return content; // 返回原始内容
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

        const response = await fetch(apiUrl, {
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
        });

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

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
        });

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

        const apiUrl = `https://api.coze.com/v3/chat/message/list?conversation_id=${conversationID}&chat_id=${chatID}`; // 拼接参数到 URL
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch from Coze API'); // 错误处理
        }

        const res = await response.json();
        return res.data[0].content;
    } catch (error) {
        console.error('[Polish] Error in fetchChatResult:', error);
        return null; // 或者返回一个默认值
    }
}
