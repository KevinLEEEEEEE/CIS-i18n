import { Language, Platform } from '../types';

const skipFormatDictionary = new Set(['*']);

/**
 * 根据目标语言和节点名称格式化内容
 * @param content - 要格式化的内容
 * @param targetLanguage - 目标语言
 * @param nodeName - 节点名称
 * @param parentNodeName - 父节点名称
 * @returns 格式化后的内容
 */
export function getFormattedContent(
    content: string,
    targetLanguage: Language,
    nodeName: string,
    parentNodeName: string
): string {
    if (!content) {
        return '';
    }

    if (typeof content !== 'string') {
        console.error('Invalid content type, expected a string.');
        return content;
    }

    // 检查内容是否包含需要跳过的字典内容
    if (skipFormatDictionary.has(content)) {
        return '';
    }

    if (targetLanguage === Language.EN) {
        content = formatEnglishContent(content, nodeName, parentNodeName);
    }

    if (targetLanguage === Language.ZH) {
        content = formatChineseContent(content);
    }

    content = decodeHtmlEntities(content);
    content = formatCurrency(content, targetLanguage);
    return content;
}

/**
 * 获取格式化的样式键
 * @param fontName - 字体名称
 * @param fontSize - 字体大小
 * @param language - 语言
 * @param platform - 平台
 * @returns 样式键
 */
export function getFormattedStyleKey(
    fontName: FontName,
    fontSize: number,
    language: Language,
    platform: Platform
): string {
    if (!fontName || !fontName.style || fontSize <= 0 || !language || !platform) {
        return '';
    }

    for (const key in typographyDictionary) {
        const style = typographyDictionary[key];

        if (isMatchingStyle(style, fontName, fontSize, language, platform)) {
            return style.styleKey;
        }
    }

    return '';
}

/**
 * 获取格式化的字体名称
 * @param fontName - 字体名称
 * @param fontSize - 字体大小
 * @param language - 语言
 * @param platform - 平台
 * @returns 字体名称对象或 null
 */
export function getFormattedFontName(
    fontName: FontName,
    fontSize: number,
    language: Language,
    platform: Platform
): FontName | null {
    if (!fontName || !fontName.style || fontSize <= 0 || !language || !platform) {
        return null;
    }

    for (const key in typographyDictionary) {
        const style = typographyDictionary[key];
        if (isMatchingStyle(style, fontName, fontSize, language, platform)) {
            return style.fontName;
        }
    }
    return null;
}

/**
 * 检查样式是否匹配
 * @param style - 样式对象
 * @param fontName - 字体名称对象
 * @param fontSize - 字体大小
 * @param language - 语言
 * @param platform - 平台
 * @returns 是否匹配
 */
function isMatchingStyle(
    style: any,
    fontName: FontName,
    fontSize: number,
    language: Language,
    platform: Platform
): boolean {
    const { fontName: styleFontName, fontSize: styleFontSize, language: styleLanguage, platform: stylePlatform } = style;

    return (
        styleFontName.style === fontName.style &&
        styleFontSize === fontSize &&
        styleLanguage === language &&
        stylePlatform === platform
    );
}

/**
 * 格式化英文内容
 * @param content - 要格式化的内容
 * @param nodeName - 节点名称
 * @param parentNodeName - 父节点名称
 * @returns 格式化后的内容
 */
function formatEnglishContent(content: string, nodeName: string, parentNodeName: string): string {
    content = formatDate(content);
    content = abbreviateDay(content);
    content = abbreviateDate(content);
    content = formatContent(content, nodeName, parentNodeName);
    return content;
}

function formatChineseContent(content: string): string {
    content = formatChineseDate(content);
    return content;
}

function formatChineseDate(content: string): string {
    // 匹配日期格式并删除空格
    const formattedDateSpace = content.replace(/(\d{1,4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/, '$1年$2月$3日')
        .replace(/(\d{1,2})\s*月\s*(\d{1,2})\s*日/, '$1月$2日');


    const formattedDateSymbol = formattedDateSpace.replace(/(\d{1,4}年)?(\d{1,2}月\d{1,2}日)，\s*(周[一二三四五六日])/g, (_match, year, date, weekday) => {
        return `${year || ''}${date} ${weekday}`;
    });

    console.log(formattedDateSymbol)

    return formattedDateSymbol;
}

/**
 * 缩写日期
 * @param content - 要缩写的内容
 * @returns 缩写后的内容
 */
function abbreviateDate(content: string): string {
    const monthMap: { [key: string]: string } = {
        January: 'Jan',
        February: 'Feb',
        March: 'Mar',
        April: 'Apr',
        May: 'May',
        June: 'Jun',
        July: 'Jul',
        August: 'Aug',
        September: 'Sep',
        October: 'Oct',
        November: 'Nov',
        December: 'Dec',
    };
    return content.replace(
        /(January|February|March|April|May|June|July|August|September|October|November|December) (\d{1,2})/g,
        (_, month, day) => {
            return `${monthMap[month]} ${day}`;
        }
    );
}

/**
 * 缩写星期几
 * @param content - 要缩写的内容
 * @returns 缩写后的内容
 */
function abbreviateDay(content: string): string {
    const dayMap: { [key: string]: string } = {
        Sunday: 'Sun',
        Monday: 'Mon',
        Tuesday: 'Tue',
        Wednesday: 'Wed',
        Thursday: 'Thu',
        Friday: 'Fri',
        Saturday: 'Sat',
    };
    return content.replace(
        /\b(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday), (January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{1,2}\b/g,
        (match) => {
            const [day, rest] = match.split(', ');
            return `${dayMap[day]}, ${rest}`;
        }
    );
}

/**
 * 格式化日期
 * @param content - 要格式化的内容
 * @returns 格式化后的内容
 */
function formatDate(content: string): string {
    const monthMap: { [key: string]: string } = {
        '01': 'Jan',
        '02': 'Feb',
        '03': 'Mar',
        '04': 'Apr',
        '05': 'May',
        '06': 'Jun',
        '07': 'Jul',
        '08': 'Aug',
        '09': 'Sep',
        '10': 'Oct',
        '11': 'Nov',
        '12': 'Dec',
    };
    const regex = /(\d{4})\/(\d{2})\/(\d{2})(?:-(\d{4})\/(\d{2})\/(\d{2}))?/g;
    return content.replace(regex, (_match, year1, month1, day1, year2, month2, day2) => {
        const formatSingleDate = (year: string, month: string, day: string) => {
            const abbreviatedMonth = monthMap[month];
            const dayWithoutLeadingZero = parseInt(day, 10); // 去掉前导零
            return `${abbreviatedMonth} ${dayWithoutLeadingZero}, ${year}`;
        };

        const formattedDate1 = formatSingleDate(year1, month1, day1);
        if (year2 && month2 && day2) {
            const formattedDate2 = formatSingleDate(year2, month2, day2);
            return `${formattedDate1} - ${formattedDate2}`;
        }
        return formattedDate1;
    });
}

/**
 * 根据节点名称格式化内容
 * @param inputString - 要格式化的字符串
 * @param nodeName - 节点名称
 * @param parentNodeName - 父节点名称
 * @returns 格式化后的字符串
 */
function formatContent(inputString: string, nodeName: string, parentNodeName: string): string {
    const titleCaseNodenames = new Set([
        '我是标题',
        '二级标题',
        'Tab-title',
        '_Avatar-title',
        'Dialog-title',
        'Button-text',
        'Menu__brand-name',
        'MenuItem-label',
        'TabPane-text-selected',
        'TabPane-text',
        'Menu-title',
        '标题文本',
        'ModalView_title',
    ]);

    const titleCaseParentNodenames = new Set(['[D] Tag_Avatar_Person', '[M] Tag_Avatar_Person']);

    const skipWords = new Set([
        'and',
        'or',
        'but',
        'the',
        'a',
        'an',
        'in',
        'on',
        'at',
        'for',
        'to',
        'with',
        'by',
        'of',
        'as',
        'is',
        'are',
        'was',
        'were',
    ]);

    if (titleCaseNodenames.has(nodeName) || titleCaseParentNodenames.has(parentNodeName)) {
        return titleCase(inputString, skipWords);
    }

    return formatSpecialCases(inputString);
}

function decodeHtmlEntities(input) {
    const entities = {
        '&#39;': "'",
        '&quot;': '"',
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&nbsp;': ' ',
        // 可以根据需要添加更多实体
    };

    return input.replace(/&#39;|&quot;|&amp;|&lt;|&gt;|&nbsp;/g, match => entities[match]);
}

function titleCase(inputString: string, skipWords: Set<string>): string {
    return inputString
        .split(' ')
        .map((word, index) => {
            return index === 0 || !skipWords.has(word.toLowerCase()) ? capitalize(word) : word;
        })
        .join(' ');
}

function formatSpecialCases(inputString: string): string {
    const words = inputString.split(' ');

    if (words.length === 1) {
        return capitalize(words[0]);
    } else if (words.length === 2) {
        return `${capitalize(words[0])} ${words[1].toLowerCase()}`;
    }

    return inputString;
}

/**
 * 将单词首字母大写
 * @param word - 要大写的单词
 * @returns 首字母大写的单词
 */
function capitalize(word: string): string {
    return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * 格式化货币符号
 * @param content - 要格式化的内容
 * @param targetLanguage - 目标语言
 * @returns 格式化后的内容
 */
function formatCurrency(content: string, targetLanguage: Language): string {
    if (targetLanguage === Language.EN) {
        return content.replace(/¥/g, '$').replace(/CNY/g, 'USD');
    } else if (targetLanguage === Language.ZH) {
        return content.replace(/\$/g, '¥').replace(/USD/g, 'CNY');
    }
    return content;
}

// 字体样式字典
const typographyDictionary = {
    特大标题_Desktop_ZH: {
        fontName: { family: 'PingFang SC', style: 'Semibold' },
        fontSize: 30,
        lineHeight: 46,
        language: Language.ZH,
        platform: Platform.Desktop,
        styleKey: 'baace18851d4410b290e76e4030a6c43894015b7',
    },
    一级标题_Desktop_ZH: {
        fontName: { family: 'PingFang SC', style: 'Semibold' },
        fontSize: 24,
        lineHeight: 36,
        language: Language.ZH,
        platform: Platform.Desktop,
        styleKey: '84b11a3514fcc6331fd7b22faaf6b0e1e479a60c',
    },
    二级标题_Desktop_ZH: {
        fontName: { family: 'PingFang SC', style: 'Medium' },
        fontSize: 20,
        lineHeight: 30,
        language: Language.ZH,
        platform: Platform.Desktop,
        styleKey: '815d93ed9bfd4457154e8938482e258c29ef97dd',
    },
    三级标题_Desktop_ZH: {
        fontName: { family: 'PingFang SC', style: 'Medium' },
        fontSize: 18,
        lineHeight: 28,
        language: Language.ZH,
        platform: Platform.Desktop,
        styleKey: '357161d8af91a6c343195f3a85e437bd1ae7428a',
    },
    四级标题_Desktop_ZH: {
        fontName: { family: 'PingFang SC', style: 'Medium' },
        fontSize: 16,
        lineHeight: 24,
        language: Language.ZH,
        platform: Platform.Desktop,
        styleKey: 'dc094b69f79fb32793a63a94ebfa0bee11c680ee',
    },
    五级标题_Desktop_ZH: {
        fontName: { family: 'PingFang SC', style: 'Regular' },
        fontSize: 16,
        lineHeight: 24,
        language: Language.ZH,
        platform: Platform.Desktop,
        styleKey: 'b969aea446b6cdb04d9a22f74016d84804bd04ea',
    },
    辅助标题_Desktop_ZH: {
        fontName: { family: 'PingFang SC', style: 'Medium' },
        fontSize: 14,
        lineHeight: 22,
        language: Language.ZH,
        platform: Platform.Desktop,
        styleKey: '633417d53d1f6aaf5a25836c3dfbb7865cc26901',
    },
    正文_Desktop_ZH: {
        fontName: { family: 'PingFang SC', style: 'Regular' },
        fontSize: 14,
        lineHeight: 22,
        language: Language.ZH,
        platform: Platform.Desktop,
        styleKey: 'a619584c8b84081754e0d0548cc02918bb2608ae',
    },
    正文辅助_Desktop_ZH: {
        fontName: { family: 'PingFang SC', style: 'Regular' },
        fontSize: 12,
        lineHeight: 20,
        language: Language.ZH,
        platform: Platform.Desktop,
        styleKey: '800d06fe6c96efcf63c147c3908ac723663ef12a',
    },
    辅助_Desktop_ZH: {
        fontName: { family: 'PingFang SC', style: 'Medium' },
        fontSize: 12,
        lineHeight: 20,
        language: Language.ZH,
        platform: Platform.Desktop,
        styleKey: '08d5d98e3b3457af595d34e5701aa5f15b7d6bdf',
    },
    小辅助_Desktop_ZH: {
        fontName: { family: 'PingFang SC', style: 'Medium' },
        fontSize: 10,
        lineHeight: 16,
        language: Language.EN,
        platform: Platform.Desktop,
        styleKey: 'a468d88d9821a71292ff1248f343718729f385ee',
    },
    最小辅助_Desktop_ZH: {
        fontName: { family: 'PingFang SC', style: 'Regular' },
        fontSize: 10,
        lineHeight: 16,
        language: Language.EN,
        platform: Platform.Desktop,
        styleKey: '3e7b95748455839143dce3a39f2c08ce24cca648',
    },

    'Title-0_Desktop_EN': {
        fontName: { family: 'SF Pro Text', style: 'Semibold' },
        fontSize: 30,
        lineHeight: 46,
        language: Language.EN,
        platform: Platform.Desktop,
        styleKey: 'c94c00e250f2f32a1e99b8a4fb5f847d980c93f3',
    },
    'Title-1_Desktop_EN': {
        fontName: { family: 'SF Pro Text', style: 'Semibold' },
        fontSize: 24,
        lineHeight: 36,
        language: Language.EN,
        platform: Platform.Desktop,
        styleKey: '493f65cc7355e1dfdb902d3ae2bb21931d898e9c',
    },
    'Title-2_Desktop_EN': {
        fontName: { family: 'SF Pro Text', style: 'Medium' },
        fontSize: 20,
        lineHeight: 30,
        language: Language.EN,
        platform: Platform.Desktop,
        styleKey: 'c272b336db56ff1ee5e67415b197fcdce26bf8e5',
    },
    'Title-3_Desktop_EN': {
        fontName: { family: 'SF Pro Text', style: 'Medium' },
        fontSize: 18,
        lineHeight: 28,
        language: Language.EN,
        platform: Platform.Desktop,
        styleKey: 'f5ec4aa020fa8adcd2dd3d3422d75a0f40b9a602',
    },
    'Title-4_Desktop_EN': {
        fontName: { family: 'SF Pro Text', style: 'Medium' },
        fontSize: 16,
        lineHeight: 24,
        language: Language.EN,
        platform: Platform.Desktop,
        styleKey: 'fef0d8335452173953a6fe8309175fddb989c0d1',
    },
    'Title-5_Desktop_EN': {
        fontName: { family: 'SF Pro Text', style: 'Regular' },
        fontSize: 16,
        lineHeight: 24,
        language: Language.EN,
        platform: Platform.Desktop,
        styleKey: '2fb9fc4d80b17fbe299d8fad71ade84f0c8853ca',
    },
    Headline_Desktop_EN: {
        fontName: { family: 'SF Pro Text', style: 'Medium' },
        fontSize: 14,
        lineHeight: 22,
        language: Language.EN,
        platform: Platform.Desktop,
        styleKey: 'effac6f1285c0efcbcdfd9fac1295bc4fbcf82bb',
    },
    'Body-0_Desktop_EN': {
        fontName: { family: 'SF Pro Text', style: 'Regular' },
        fontSize: 14,
        lineHeight: 22,
        language: Language.EN,
        platform: Platform.Desktop,
        styleKey: 'bd0fe524af75554cb26f336c6916c3100be75f2d',
    },
    'Body-2_Desktop_EN': {
        fontName: { family: 'SF Pro Text', style: 'Regular' },
        fontSize: 12,
        lineHeight: 20,
        language: Language.EN,
        platform: Platform.Desktop,
        styleKey: '2d7121c34523ead5779a21d8ccdfb215b5c10ac3',
    },
    'Caption-0_Desktop_EN': {
        fontName: { family: 'SF Pro Text', style: 'Medium' },
        fontSize: 12,
        lineHeight: 20,
        language: Language.EN,
        platform: Platform.Desktop,
        styleKey: '3008f7356e60db42a85d8bcaf3be8674d36dc88e',
    },
    'Caption-1_Desktop_EN': {
        fontName: { family: 'SF Pro Text', style: 'Medium' },
        fontSize: 10,
        lineHeight: 16,
        language: Language.EN,
        platform: Platform.Desktop,
        styleKey: '74933d4d09d0c53610005529b169ce645707cb85',
    },
    'Caption-3_Desktop_EN': {
        fontName: { family: 'SF Pro Text', style: 'Regular' },
        fontSize: 10,
        lineHeight: 16,
        language: Language.EN,
        platform: Platform.Desktop,
        styleKey: '3aa3ee2538536526e5083d46e57a82552dadde45',
    },

    '特大标题-0_Mobile_ZH': {
        fontName: { family: 'PingFang SC', style: 'Semibold' },
        fontSize: 26,
        lineHeight: 40,
        language: Language.ZH,
        platform: Platform.Mobile,
        styleKey: 'f153b4fdf50677c79e07bd3530a42c54441049b2',
    },
    一级标题_Mobile_ZH: {
        fontName: { family: 'PingFang SC', style: 'Semibold' },
        fontSize: 24,
        lineHeight: 36,
        language: Language.ZH,
        platform: Platform.Mobile,
        styleKey: '9ce249b5c7bfadde65c7352a06027589f2456ac5',
    },
    二级标题_Mobile_ZH: {
        fontName: { family: 'PingFang SC', style: 'Medium' },
        fontSize: 20,
        lineHeight: 30,
        language: Language.ZH,
        platform: Platform.Mobile,
        styleKey: '8a6546c5ff33b92f0fa7e4d77d3c15e2965f0531',
    },
    三级标题_Mobile_ZH: {
        fontName: { family: 'PingFang SC', style: 'Medium' },
        fontSize: 17,
        lineHeight: 26,
        language: Language.ZH,
        platform: Platform.Mobile,
        styleKey: '26f3c1cf6108f8877f9bc366afe9679ca3171402',
    },
    四级标题_Mobile_ZH: {
        fontName: { family: 'PingFang SC', style: 'Regular' },
        fontSize: 17,
        lineHeight: 26,
        language: Language.ZH,
        platform: Platform.Mobile,
        styleKey: '34c5748b0a417539a6f823bacd0b3811d001d505',
    },
    辅助标题_Mobile_ZH: {
        fontName: { family: 'PingFang SC', style: 'Medium' },
        fontSize: 16,
        lineHeight: 24,
        language: Language.ZH,
        platform: Platform.Mobile,
        styleKey: 'addf9e38fdc0939b4f1b6eed62273878e58119d6',
    },
    正文_Mobile_ZH: {
        fontName: { family: 'PingFang SC', style: 'Regular' },
        fontSize: 16,
        lineHeight: 24,
        language: Language.ZH,
        platform: Platform.Mobile,
        styleKey: 'a18a512f0c97944421691f6764efd4345d417fc6',
    },
    正文大辅助_Mobile_ZH: {
        fontName: { family: 'PingFang SC', style: 'Medium' },
        fontSize: 14,
        lineHeight: 22,
        language: Language.ZH,
        platform: Platform.Mobile,
        styleKey: 'ea03cc6a6e05ef1fee95779d53a5be1df8258b37',
    },
    正文辅助_Mobile_ZH: {
        fontName: { family: 'PingFang SC', style: 'Regular' },
        fontSize: 14,
        lineHeight: 22,
        language: Language.ZH,
        platform: Platform.Mobile,
        styleKey: '67d7fe3b961232098eea36d351d395aaa691a9eb',
    },
    辅助_Mobile_ZH: {
        fontName: { family: 'PingFang SC', style: 'Medium' },
        fontSize: 12,
        lineHeight: 20,
        language: Language.ZH,
        platform: Platform.Mobile,
        styleKey: '336fc9d0dae54fdfccdd2e3120b61b80da815e3a',
    },
    小辅助_Mobile_ZH: {
        fontName: { family: 'PingFang SC', style: 'Regular' },
        fontSize: 12,
        lineHeight: 20,
        language: Language.ZH,
        platform: Platform.Mobile,
        styleKey: '839429252dacd1cda2ef4c9ed8cb5d1b26c16480',
    },
    次小辅助_Mobile_ZH: {
        fontName: { family: 'PingFang SC', style: 'Medium' },
        fontSize: 10,
        lineHeight: 16,
        language: Language.ZH,
        platform: Platform.Mobile,
        styleKey: '739d6a80237c673794a7a90e83c3218ea1915f0a',
    },
    最小辅助_Mobile_ZH: {
        fontName: { family: 'PingFang SC', style: 'Regular' },
        fontSize: 10,
        lineHeight: 16,
        language: Language.ZH,
        platform: Platform.Mobile,
        styleKey: 'a1b3294ec95bdb06f55ca9abbfe62f699a6b1f44',
    },

    'Title-0_Mobile_EN': {
        fontName: { family: 'SF Pro Text', style: 'Semibold' },
        fontSize: 26,
        lineHeight: 40,
        language: Language.EN,
        platform: Platform.Mobile,
        styleKey: 'eda380179c68f96c0731cf362eb923ad13b2ca73',
    },
    'Title-1_Mobile_EN': {
        fontName: { family: 'SF Pro Text', style: 'Semibold' },
        fontSize: 24,
        lineHeight: 36,
        language: Language.EN,
        platform: Platform.Mobile,
        styleKey: '9ae457259718e71a80d0a4668b83523cd29163e1',
    },
    'Title-2_Mobile_EN': {
        fontName: { family: 'SF Pro Text', style: 'Medium' },
        fontSize: 20,
        lineHeight: 30,
        language: Language.EN,
        platform: Platform.Mobile,
        styleKey: '1611eaa6df3cb6c9327d9725d0d2cc51ad52fd7a',
    },
    'Title-3_Mobile_EN': {
        fontName: { family: 'SF Pro Text', style: 'Medium' },
        fontSize: 17,
        lineHeight: 26,
        language: Language.EN,
        platform: Platform.Mobile,
        styleKey: '5763f3c5b9edba982586554e533ab1da03c54d4f',
    },
    'Title-4_Mobile_EN': {
        fontName: { family: 'SF Pro Text', style: 'Regular' },
        fontSize: 17,
        lineHeight: 26,
        language: Language.EN,
        platform: Platform.Mobile,
        styleKey: '2372fe6023fdd3d90810b615a0b3b8bf0f4522b6',
    },
    Headline_Mobile_EN: {
        fontName: { family: 'SF Pro Text', style: 'Medium' },
        fontSize: 16,
        lineHeight: 24,
        language: Language.EN,
        platform: Platform.Mobile,
        styleKey: '421c19631f990150c2a67f6ef250d894d7883f57',
    },
    'Body-0_Mobile_EN': {
        fontName: { family: 'SF Pro Text', style: 'Regular' },
        fontSize: 16,
        lineHeight: 24,
        language: Language.EN,
        platform: Platform.Mobile,
        styleKey: '7b3e6e2a112344f4c9df622c3b074b579076d4ec',
    },
    'Body-1_Mobile_EN': {
        fontName: { family: 'SF Pro Text', style: 'Medium' },
        fontSize: 14,
        lineHeight: 22,
        language: Language.EN,
        platform: Platform.Mobile,
        styleKey: '036d8bc9d371ea10c901ddbb0e31fc663a2a119b',
    },
    'Body-2_Mobile_EN': {
        fontName: { family: 'SF Pro Text', style: 'Regular' },
        fontSize: 14,
        lineHeight: 22,
        language: Language.EN,
        platform: Platform.Mobile,
        styleKey: '330fe08996401272f4eedaa3ae6d40b2124d98ee',
    },
    'Caption-0_Mobile_EN': {
        fontName: { family: 'SF Pro Text', style: 'Medium' },
        fontSize: 12,
        lineHeight: 20,
        language: Language.EN,
        platform: Platform.Mobile,
        styleKey: '89101c98c1679dc429e55b76cca794fe5d7efa30',
    },
    'Caption-1_Mobile_EN': {
        fontName: { family: 'SF Pro Text', style: 'Regular' },
        fontSize: 12,
        lineHeight: 20,
        language: Language.EN,
        platform: Platform.Mobile,
        styleKey: 'a0cbea28dc1f1a9978910d3312a289087883a6a1',
    },
    'Caption-2_Mobile_EN': {
        fontName: { family: 'SF Pro Text', style: 'Medium' },
        fontSize: 10,
        lineHeight: 16,
        language: Language.EN,
        platform: Platform.Mobile,
        styleKey: 'bd8f949cf3d693a949bae0f5cbb7d57b91461c13',
    },
    'Caption-3_Mobile_EN': {
        fontName: { family: 'SF Pro Text', style: 'Regular' },
        fontSize: 10,
        lineHeight: 16,
        language: Language.EN,
        platform: Platform.Mobile,
        styleKey: '8c1ee07fd1c8cfac51946eeac84ed18e61e7cb19',
    },
};
