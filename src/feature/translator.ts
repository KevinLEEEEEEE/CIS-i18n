import { emit, once } from '@create-figma-plugin/utilities';
import { AjaxRequestHandler, Language, StorageKey, TranslationModal } from '../types';
import md5 from 'md5';
import { getClientStorageValue } from '../utils/utility';
import { googleTranslateProjectID, googleTranslateLocations, googleTranslateGlossaryID } from '../../config';

const CALL_LIMIT_PER_SECOND = 10; // 每秒请求的翻译次数上限
const CALL_INTERVAL_PER_SECOND = 1000 / CALL_LIMIT_PER_SECOND; // 每次调用的间隔时间（毫秒）

/**
 * 统一的错误处理函数
 * @param error - 错误对象
 * @param context - 错误发生的上下文
 */
function handleError(error: any, context: string) {
  console.error(`${context}: `, error); // 记录错误信息
  throw new Error(`${context} - ${error.message}`); // 重新抛出错误并附加上下文
}

/**
 * 判断内容是否需要翻译
 * @param content - 待翻译的内容
 * @param targetLanguage - 目标语言
 * @returns 是否需要翻译的布尔值
 */
export function needTranslating(content: string, targetLanguage: Language): boolean {
  const skipTranslateDictionary: Set<string> = new Set([
    'CNY', 'USD', 'AED', 'EUR', 'GBP', 'JPY', 'CHF', 'HKD', 'SGD', 'RUB', 'INR', 'Hi Travel'
  ]);

  // 检查内容是否包含无需翻译的单词
  if (skipTranslateDictionary.has(content)) {
    return false;
  }

  // 如果目标语言是中文，且内容为单字母英文，则不翻译
  if (targetLanguage === Language.ZH && /^[a-zA-Z]$/.test(content)) {
    return false;
  }

  // 根据目标语言判断内容是否需要翻译
  return targetLanguage === Language.EN
    ? /[\u4e00-\u9fff]/.test(content) // 如果目标语言是英文，检查是否包含待翻译的中文字符
    : /[a-zA-Z]/.test(content); // 否则，检查是否包含待翻译的英文字符
}

/**
 * 判断 Google 翻译 API 是否可访问
 * @returns 是否可访问的布尔值
 */
export async function isGoogleTranslationApiAccessible(): Promise<boolean> {
  try {
    const response = await Promise.race([
      fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=en&tl=zh&q=test`, {
        method: 'GET',
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Request timed out')), 5000))
    ]);

    return response.ok;
  } catch (error) {
    console.error('[Translator] Error accessing Google Translation API:', error);
    return false;
  }
}

/**
 * 根据选择的翻译模式进行翻译
 * @param textArray - 待翻译的文本数组
 * @param targetLanguage - 目标语言
 * @param translationModal - 翻译模式
 * @returns 翻译后的文本数组
 */
export async function translateContentByModal(
  textArray: string[],
  targetLanguage: Language,
  translationModal: TranslationModal,
  termbaseMode: boolean
): Promise<string[]> {
  // 验证输入参数
  if (!textArray || textArray.length === 0 || !targetLanguage || !translationModal) {
    return [];
  }

  // 定义翻译策略
  const translationStrategies = {
    [TranslationModal.GoogleAdvanced]: () => translator(translateByGoogleAdvanced, textArray, targetLanguage, termbaseMode),
    [TranslationModal.GoogleBasic]: () => translator(translateByGoogleBasic, textArray, targetLanguage, termbaseMode),
    [TranslationModal.GoogleFree]: () => Promise.all(textArray.map((text) => translator(translateByGoogleFree, text, targetLanguage, termbaseMode))),
    [TranslationModal.Baidu]: () => translator(translateByBaidu, textArray, targetLanguage, termbaseMode),
  };

  // 获取对应的翻译函数
  const translateFunction = translationStrategies[translationModal];
  if (!translateFunction) {
    throw new Error('Unsupported translation modal');
  }

  // 执行翻译
  return await translateFunction();
}

/**
 * 处理翻译请求的节流
 * @param requestFunction - 请求函数
 * @param content - 待翻译的内容数组
 * @param targetLanguage - 目标语言
 * @returns 翻译结果
 */
function translator(
  requestFunction: (
    content: string | string[],
    targetLanguage: Language,
    sourceLanguage: Language,
    termbaseMode?: boolean
  ) => Promise<any>,
  content: string | string[],
  targetLanguage: Language,
  termbaseMode: boolean
) {
  let lastRequestTime = 0;
  const sourceLanguage = targetLanguage === Language.EN ? Language.ZH : Language.EN;

  const fetchWithRateLimit = async () => {
    const currentTime = Date.now();
    const timeSinceLastRequest = currentTime - lastRequestTime;

    if (timeSinceLastRequest < CALL_INTERVAL_PER_SECOND) {
      await new Promise((resolve) => setTimeout(resolve, CALL_INTERVAL_PER_SECOND - timeSinceLastRequest));
    }

    lastRequestTime = Date.now();

    try {
      return await requestFunction(content, targetLanguage, sourceLanguage, termbaseMode);
    } catch (error) {
      handleError(error, 'Request failed in translator');
    }
  };

  return fetchWithRateLimit();
}

/**
 * Google Advanced 翻译
 * @param query - 待翻译的文本数组
 * @param targetLanguage - 目标语言
 * @returns 翻译后的文本数组
 */
async function translateByGoogleAdvanced(query: string[], targetLanguage: Language, sourceLanguage: Language, termbaseMode: Boolean) {
  try {
    const accessToken = await getClientStorageValue(StorageKey.GoogleAccessToken);

    const requestBody = {
      contents: query,
      mimeType: 'text/plain',
      sourceLanguageCode: sourceLanguage,
      targetLanguageCode: targetLanguage,
    };

    if (termbaseMode) {
      const glossaryConfig = {
        glossary: `projects/${googleTranslateProjectID}/locations/${googleTranslateLocations}/glossaries/${googleTranslateGlossaryID}`,
      };

      (requestBody as any).glossaryConfig = glossaryConfig;
    }

    const response = await fetch(`https://translation.googleapis.com/v3/projects/${googleTranslateProjectID}/locations/${googleTranslateLocations}:translateText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error('Translation Request Failed Due to Network Error');
    }

    const data = await response.json();

    const translations = termbaseMode && data.glossaryTranslations
      ? data.glossaryTranslations
      : data.translations;

    return translations.map((item: any) => item['translatedText'] || '');
  } catch (error) {
    handleError(error, 'Failed to translate by Google Advanced');
    return [];
  }
}

/**
 * Google Basic 翻译
 * @param query - 待翻译的文本数组
 * @param targetLanguage - 目标语言
 * @returns 翻译后的文本数组
 */
async function translateByGoogleBasic(query: string[], targetLanguage: Language, sourceLanguage: Language) {
  try {
    const apiKey = await getClientStorageValue(StorageKey.GoogleAPIKey);
    const requestBody = {
      q: query,
      target: targetLanguage,
      source: sourceLanguage
    };

    const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error('Translation Request Failed Due to Network Error');
    }

    const data = await response.json();
    return data.data.translations.map((item: any) =>
      item['translatedText'] !== undefined ? item['translatedText'] : ''
    );
  } catch (error) {
    handleError(error, 'Failed to translate by Google Basic');
    return [];
  }
}

/**
 * Google Free 翻译
 * @param query - 待翻译的文本
 * @param targetLanguage - 目标语言
 * @returns 翻译后的文本
 */
async function translateByGoogleFree(query: string, targetLanguage: Language, sourceLanguage: Language) {
  try {
    const response = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=${sourceLanguage}&tl=${targetLanguage}&q=${query}`,
      {
        method: 'GET',
      }
    );

    if (!response.ok) {
      throw new Error('Network Error');
    }

    const data = await response.json();
    return data[0].map((item: any) => item[0]).join('');
  } catch (error) {
    handleError(error, 'Failed to translate by Google Free');
    return [];
  }
}

/**
 * 百度翻译
 * @param query - 待翻译的文本数组
 * @param targetLanguage - 目标语言
 * @returns 翻译后的文本数组
 */
async function translateByBaidu(
  query: string[],
  targetLanguage: Language,
  sourceLanguage: Language,
  termbaseMode: boolean
) {
  try {
    const appid = await getClientStorageValue(StorageKey.BaiduAppID);
    const key = await getClientStorageValue(StorageKey.BaiduKey);
    const textToTranslate = query.join('\n');
    const salt = new Date().getTime();
    const sign = md5(appid + textToTranslate + salt + key);
    const needIntervene = termbaseMode ? 1 : 0;

    const url = `https://api.fanyi.baidu.com/api/trans/vip/translate?q=${encodeURIComponent(
      textToTranslate
    )}&from=${sourceLanguage}&to=${targetLanguage}&appid=${appid}&salt=${salt}&sign=${sign}&needIntervene=${needIntervene}`;

    return new Promise((resolve, reject) => {
      const messageID = Math.random().toString(36).substring(2, 15);

      const handleResponse = (res: {
        isSuccessful: boolean;
        messageID: string;
        data: { trans_result: { dst: string }[] };
      }) => {
        if (res.messageID === messageID) {
          if (res.isSuccessful) {
            resolve(res.data.trans_result.map((item) => item.dst));
          } else {
            handleError('Ajax Error', 'Translation Request Failed');
            reject([]);
          }
        }
      };

      once('AJAX_RESPONSE', handleResponse);

      emit<AjaxRequestHandler>('AJAX_REQUEST', {
        url,
        messageID,
      });
    });
  } catch (error) {
    console.error('[Translator] Failed to translate by Baidu:', error);
    return [];
  }
}
