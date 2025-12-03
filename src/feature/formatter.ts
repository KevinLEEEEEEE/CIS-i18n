import { Language, Platform } from '../types';

/**
 * 模块说明：
 * typographyDictionary 定义了不同语言与平台的文本样式映射。
 * 维护指引：
 * - 来源：由设计规范导出并人工维护；key 命名应清晰、可读（推荐中文或英文统一风格）。
 * - 更新：设计规范更新后需同步此字典；styleKey 来自 Figma，共享样式键保持稳定。
 * - 使用：getFormattedStyleKey/getFormattedFontName 依据 FontName/FontSize/Language/Platform 精确匹配。
 */

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
        console.error('[Formatter] Invalid content type, expected a string.');
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
        'Tag-text'
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
        styleKey: 'bb7500b30fed51ed976517f2fd65f263d1145d66',
    },
    一级标题_Desktop_ZH: {
        fontName: { family: 'PingFang SC', style: 'Semibold' },
        fontSize: 24,
        lineHeight: 36,
        language: Language.ZH,
        platform: Platform.Desktop,
        styleKey: '220be5c405c5b808bc8231e7ea05f33231eb1242',
    },
    二级标题_Desktop_ZH: {
        fontName: { family: 'PingFang SC', style: 'Medium' },
        fontSize: 20,
        lineHeight: 30,
        language: Language.ZH,
        platform: Platform.Desktop,
        styleKey: '08bb5f5da607b2bdb4969be6cc6bf0d5a197ba8f',
    },
    三级标题_Desktop_ZH: {
        fontName: { family: 'PingFang SC', style: 'Medium' },
        fontSize: 18,
        lineHeight: 28,
        language: Language.ZH,
        platform: Platform.Desktop,
        styleKey: '93f289fa230ecc35b45cd8fe5f41b155cf3bb768',
    },
    四级标题_Desktop_ZH: {
        fontName: { family: 'PingFang SC', style: 'Medium' },
        fontSize: 16,
        lineHeight: 24,
        language: Language.ZH,
        platform: Platform.Desktop,
        styleKey: 'a57f240e66b420744d4f7ec85d890e5641829312',
    },
    五级标题_Desktop_ZH: {
        fontName: { family: 'PingFang SC', style: 'Regular' },
        fontSize: 16,
        lineHeight: 24,
        language: Language.ZH,
        platform: Platform.Desktop,
        styleKey: 'efa77a01fe18c71a508b610a9c5674aa95c4fd2c',
    },
    辅助标题_Desktop_ZH: {
        fontName: { family: 'PingFang SC', style: 'Medium' },
        fontSize: 14,
        lineHeight: 22,
        language: Language.ZH,
        platform: Platform.Desktop,
        styleKey: '60b3b4ad8906cb69682eae4f4095693128a5e900',
    },
    正文_Desktop_ZH: {
        fontName: { family: 'PingFang SC', style: 'Regular' },
        fontSize: 14,
        lineHeight: 22,
        language: Language.ZH,
        platform: Platform.Desktop,
        styleKey: '10f4b615066ae8e6456961e593dca76768302bce',
    },
    正文辅助_Desktop_ZH: {
        fontName: { family: 'PingFang SC', style: 'Regular' },
        fontSize: 12,
        lineHeight: 20,
        language: Language.ZH,
        platform: Platform.Desktop,
        styleKey: 'c376b786aede4dbf8ca98b63498ebebbc5ce7e06',
    },
    辅助_Desktop_ZH: {
        fontName: { family: 'PingFang SC', style: 'Medium' },
        fontSize: 12,
        lineHeight: 20,
        language: Language.ZH,
        platform: Platform.Desktop,
        styleKey: 'f4039cc49a63b49e2bdeb17c73f573116d0330b9',
    },
    小辅助_Desktop_ZH: {
        fontName: { family: 'PingFang SC', style: 'Medium' },
        fontSize: 10,
        lineHeight: 16,
        language: Language.EN,
        platform: Platform.Desktop,
        styleKey: '435a78769cf4fca9fa83819947af4c6cde58c167',
    },
    最小辅助_Desktop_ZH: {
        fontName: { family: 'PingFang SC', style: 'Regular' },
        fontSize: 10,
        lineHeight: 16,
        language: Language.EN,
        platform: Platform.Desktop,
        styleKey: '8b58b2f36e7fb7908be628ae59167c7d748f442e',
    },

    'Title-0_Desktop_EN': {
        fontName: { family: 'SF Pro Text', style: 'Semibold' },
        fontSize: 30,
        lineHeight: 46,
        language: Language.EN,
        platform: Platform.Desktop,
        styleKey: '001b1341efd53cd832dd322a929abcecfe164011',
    },
    'Title-1_Desktop_EN': {
        fontName: { family: 'SF Pro Text', style: 'Semibold' },
        fontSize: 24,
        lineHeight: 36,
        language: Language.EN,
        platform: Platform.Desktop,
        styleKey: 'db59a74c4063c9b1c19f0cbf98168762ff679074',
    },
    'Title-2_Desktop_EN': {
        fontName: { family: 'SF Pro Text', style: 'Medium' },
        fontSize: 20,
        lineHeight: 30,
        language: Language.EN,
        platform: Platform.Desktop,
        styleKey: 'f9ef6f8980675286ade38ceda42e2ab478677ebc',
    },
    'Title-3_Desktop_EN': {
        fontName: { family: 'SF Pro Text', style: 'Medium' },
        fontSize: 18,
        lineHeight: 28,
        language: Language.EN,
        platform: Platform.Desktop,
        styleKey: '32268b86bddba13108e6e639b0ed19c596fc0911',
    },
    'Title-4_Desktop_EN': {
        fontName: { family: 'SF Pro Text', style: 'Medium' },
        fontSize: 16,
        lineHeight: 24,
        language: Language.EN,
        platform: Platform.Desktop,
        styleKey: '31dbe7076ad0a5c8f0e1bc0119bed7bfb328746f',
    },
    'Title-5_Desktop_EN': {
        fontName: { family: 'SF Pro Text', style: 'Regular' },
        fontSize: 16,
        lineHeight: 24,
        language: Language.EN,
        platform: Platform.Desktop,
        styleKey: '2bea416b34e7527bdcd03e7a389ca7e081f32c1b',
    },
    'Headline_Desktop_EN': {
        fontName: { family: 'SF Pro Text', style: 'Medium' },
        fontSize: 14,
        lineHeight: 22,
        language: Language.EN,
        platform: Platform.Desktop,
        styleKey: '79ea3d768e7c168125eadf7677a6594f67f1715a',
    },
    'Body-0_Desktop_EN': {
        fontName: { family: 'SF Pro Text', style: 'Regular' },
        fontSize: 14,
        lineHeight: 22,
        language: Language.EN,
        platform: Platform.Desktop,
        styleKey: '31ecf056f58ea611c0ae256dd94d2e4c0dc55f9d',
    },
    'Body-2_Desktop_EN': {
        fontName: { family: 'SF Pro Text', style: 'Regular' },
        fontSize: 12,
        lineHeight: 20,
        language: Language.EN,
        platform: Platform.Desktop,
        styleKey: 'ef2b901d720e847a9be44a4814c01282ecada982',
    },
    'Caption-0_Desktop_EN': {
        fontName: { family: 'SF Pro Text', style: 'Medium' },
        fontSize: 12,
        lineHeight: 20,
        language: Language.EN,
        platform: Platform.Desktop,
        styleKey: 'dbed45afb5da6f5568a5458b95d5e2f1848c3d3f',
    },
    'Caption-1_Desktop_EN': {
        fontName: { family: 'SF Pro Text', style: 'Medium' },
        fontSize: 10,
        lineHeight: 16,
        language: Language.EN,
        platform: Platform.Desktop,
        styleKey: '7fdbe6f0a3685f5aac25a3087accb2f605c02a95',
    },
    'Caption-3_Desktop_EN': {
        fontName: { family: 'SF Pro Text', style: 'Regular' },
        fontSize: 10,
        lineHeight: 16,
        language: Language.EN,
        platform: Platform.Desktop,
        styleKey: 'b55e01884f5be5c4a74fdac766643fdbfbd2eaeb',
    },

    特大标题_Mobile_ZH: {
        fontName: { family: 'PingFang SC', style: 'Semibold' },
        fontSize: 26,
        lineHeight: 40,
        language: Language.ZH,
        platform: Platform.Mobile,
        styleKey: '11669e746cc3a9f41e9f856549bc58326d092cee',
    },
    一级标题_Mobile_ZH: {
        fontName: { family: 'PingFang SC', style: 'Semibold' },
        fontSize: 24,
        lineHeight: 36,
        language: Language.ZH,
        platform: Platform.Mobile,
        styleKey: '4c147a2f02dee3b542e0495f943c28b677674633',
    },
    二级标题_Mobile_ZH: {
        fontName: { family: 'PingFang SC', style: 'Medium' },
        fontSize: 20,
        lineHeight: 30,
        language: Language.ZH,
        platform: Platform.Mobile,
        styleKey: 'fe745d3290b9b009817381940d6ab9137e646398',
    },
    三级标题_Mobile_ZH: {
        fontName: { family: 'PingFang SC', style: 'Medium' },
        fontSize: 17,
        lineHeight: 26,
        language: Language.ZH,
        platform: Platform.Mobile,
        styleKey: 'e36c1dcff68ea37d9b584e2212534f0ac1a509e1',
    },
    四级标题_Mobile_ZH: {
        fontName: { family: 'PingFang SC', style: 'Regular' },
        fontSize: 17,
        lineHeight: 26,
        language: Language.ZH,
        platform: Platform.Mobile,
        styleKey: '82cb627ed551a871fb6e99ae5f69351134eea8d0',
    },
    辅助标题_Mobile_ZH: {
        fontName: { family: 'PingFang SC', style: 'Medium' },
        fontSize: 16,
        lineHeight: 24,
        language: Language.ZH,
        platform: Platform.Mobile,
        styleKey: '9e77a5fc64d6f1822a1e7664e3c25fdc34974097',
    },
    正文_Mobile_ZH: {
        fontName: { family: 'PingFang SC', style: 'Regular' },
        fontSize: 16,
        lineHeight: 24,
        language: Language.ZH,
        platform: Platform.Mobile,
        styleKey: '2403fbfb07379ae8a8f0295acf34e24f646a0fa7',
    },
    正文大辅助_Mobile_ZH: {
        fontName: { family: 'PingFang SC', style: 'Medium' },
        fontSize: 14,
        lineHeight: 22,
        language: Language.ZH,
        platform: Platform.Mobile,
        styleKey: '0b6946cbd0a36740a4118dbb7afda49453fade92',
    },
    正文辅助_Mobile_ZH: {
        fontName: { family: 'PingFang SC', style: 'Regular' },
        fontSize: 14,
        lineHeight: 22,
        language: Language.ZH,
        platform: Platform.Mobile,
        styleKey: '2b29e93880bcf9b080cba3054d56148166eaa55b',
    },
    辅助_Mobile_ZH: {
        fontName: { family: 'PingFang SC', style: 'Medium' },
        fontSize: 12,
        lineHeight: 20,
        language: Language.ZH,
        platform: Platform.Mobile,
        styleKey: '6bc0f647777e4b21779223dbc8052f723a0fd228',
    },
    小辅助_Mobile_ZH: {
        fontName: { family: 'PingFang SC', style: 'Regular' },
        fontSize: 12,
        lineHeight: 20,
        language: Language.ZH,
        platform: Platform.Mobile,
        styleKey: 'bba4b582bc37ff8ccb8d251defb9fc3047469265',
    },
    次小辅助_Mobile_ZH: {
        fontName: { family: 'PingFang SC', style: 'Medium' },
        fontSize: 10,
        lineHeight: 16,
        language: Language.ZH,
        platform: Platform.Mobile,
        styleKey: 'cfb6b9fb454941d5af0a56b9821186d7a0df4d63',
    },
    最小辅助_Mobile_ZH: {
        fontName: { family: 'PingFang SC', style: 'Regular' },
        fontSize: 10,
        lineHeight: 16,
        language: Language.ZH,
        platform: Platform.Mobile,
        styleKey: '4e4c30c33da9251704e946e412cac5410218000b',
    },

    'Title-0_Mobile_EN': {
        fontName: { family: 'SF Pro Text', style: 'Semibold' },
        fontSize: 26,
        lineHeight: 40,
        language: Language.EN,
        platform: Platform.Mobile,
        styleKey: '54af45c2fe434928c7b77cb5b50466ddcca1ae2a',
    },
    'Title-1_Mobile_EN': {
        fontName: { family: 'SF Pro Text', style: 'Semibold' },
        fontSize: 24,
        lineHeight: 36,
        language: Language.EN,
        platform: Platform.Mobile,
        styleKey: '738bd450de0ba09df881b6848efd290e6f723d2c',
    },
    'Title-2_Mobile_EN': {
        fontName: { family: 'SF Pro Text', style: 'Medium' },
        fontSize: 20,
        lineHeight: 30,
        language: Language.EN,
        platform: Platform.Mobile,
        styleKey: 'b09669fa4780e7dfa56025f344ad704fec756fb7',
    },
    'Title-3_Mobile_EN': {
        fontName: { family: 'SF Pro Text', style: 'Medium' },
        fontSize: 17,
        lineHeight: 26,
        language: Language.EN,
        platform: Platform.Mobile,
        styleKey: 'cab6659953b6006232ffe374f1cf5ab260f2a904',
    },
    'Title-4_Mobile_EN': {
        fontName: { family: 'SF Pro Text', style: 'Regular' },
        fontSize: 17,
        lineHeight: 26,
        language: Language.EN,
        platform: Platform.Mobile,
        styleKey: '5756b32ce2a1d62ae08034cdcef7696a6adfddbc',
    },
    'Headline_Mobile_EN': {
        fontName: { family: 'SF Pro Text', style: 'Medium' },
        fontSize: 16,
        lineHeight: 24,
        language: Language.EN,
        platform: Platform.Mobile,
        styleKey: '07b471f10b3faced04b3a5a41c3e09ca8a491971',
    },
    'Body-0_Mobile_EN': {
        fontName: { family: 'SF Pro Text', style: 'Regular' },
        fontSize: 16,
        lineHeight: 24,
        language: Language.EN,
        platform: Platform.Mobile,
        styleKey: 'f3356134a4300806bc4fbf38145308f34fc2db70',
    },
    'Body-1_Mobile_EN': {
        fontName: { family: 'SF Pro Text', style: 'Medium' },
        fontSize: 14,
        lineHeight: 22,
        language: Language.EN,
        platform: Platform.Mobile,
        styleKey: 'e789456cd7962dce0161e3510915b9a7dc57dd27',
    },
    'Body-2_Mobile_EN': {
        fontName: { family: 'SF Pro Text', style: 'Regular' },
        fontSize: 14,
        lineHeight: 22,
        language: Language.EN,
        platform: Platform.Mobile,
        styleKey: 'e2b8d2fee8a61347ed94d8e11dff4a176e4b553d',
    },
    'Caption-0_Mobile_EN': {
        fontName: { family: 'SF Pro Text', style: 'Medium' },
        fontSize: 12,
        lineHeight: 20,
        language: Language.EN,
        platform: Platform.Mobile,
        styleKey: 'a6765109001d3c6f2d82e2292a1e043aecc29589',
    },
    'Caption-1_Mobile_EN': {
        fontName: { family: 'SF Pro Text', style: 'Regular' },
        fontSize: 12,
        lineHeight: 20,
        language: Language.EN,
        platform: Platform.Mobile,
        styleKey: 'f2d412a976bbf7e40bcc4615c47578d8bbc64dab',
    },
    'Caption-2_Mobile_EN': {
        fontName: { family: 'SF Pro Text', style: 'Medium' },
        fontSize: 10,
        lineHeight: 16,
        language: Language.EN,
        platform: Platform.Mobile,
        styleKey: 'e1b82f6ba4048bc09932b646587bea04d47c7cc6',
    },
    'Caption-3_Mobile_EN': {
        fontName: { family: 'SF Pro Text', style: 'Regular' },
        fontSize: 10,
        lineHeight: 16,
        language: Language.EN,
        platform: Platform.Mobile,
        styleKey: '0b211cb702dec992c1df5dbaaf7297e0ae180f30',
    },
};
