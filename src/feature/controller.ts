import { emit, on } from '@create-figma-plugin/utilities';
import {
    ResizeWindowHandler,
    TranslateHandler,
    StylelintHandler,
    DisplayMode,
    ProcessNode,
    Language,
    Platform,
    StorageKey,
    TranslationModal,
    SwitchMode,
    ShowToastHandler,
    ToastType,
    ShowProcessingLayerHandler,
    HideProcessingLayerHandler,
} from '../types';
import { getClientStorageValue } from '../utils/utility';
import { translateContentByModal, needTranslating, isGoogleTranslationApiAccessible } from './translator';
import { polishContent, needPolishing } from './polisher';
import { getFormattedContent, getFormattedStyleKey } from './formatter';

const TRANSLATE_CHUNK_SIZE = 15;

// 初始化插件
async function init() {
    figma.showUI(__html__, { width: 380, height: 308 });
    figma.skipInvisibleInstanceChildren = true
}

// 翻译按钮被点击
async function handleTranslate() {
    const autoPolishMode = (await getClientStorageValue(StorageKey.AutoPolishing)) === SwitchMode.On;
    const autoStylelintMode = (await getClientStorageValue(StorageKey.AutoStylelintMode)) === SwitchMode.On;
    processNodesTasks([...figma.currentPage.selection], true, autoPolishMode, autoStylelintMode);
}

// 设计规范更新按钮被点击
async function handleStylelint() {
    processNodesTasks([...figma.currentPage.selection], false, false, true);
}

// 核心处理逻辑
async function processNodesTasks(nodes: SceneNode[], needTranslate: boolean, needPolish: boolean, needFormat: boolean) {
    if (nodes.length === 0) {
        emit<ShowToastHandler>(
            'SHOW_TOAST',
            ToastType.Warning,
            'Please select at least one node'
        );

        return;
    }

    if (!needTranslate && !needPolish && !needFormat) {
        console.log('【没有需要执行的任务】');
        emit<ShowToastHandler>(
            'SHOW_TOAST',
            ToastType.Warning,
            'No tasks to execute'
        );

        return;
    }

    emit<ShowProcessingLayerHandler>('SHOW_PROCESSING_LAYER');

    const startTime = new Date();
    const [targetLanguage, displayMode, platform, translationModal] = await Promise.all([
        getClientStorageValue(StorageKey.TargetLanguage) as Promise<Language>,
        getClientStorageValue(StorageKey.DisplayMode) as Promise<DisplayMode>,
        getClientStorageValue(StorageKey.Platform) as Promise<Platform>,
        getClientStorageValue(StorageKey.TranslationModal),
    ]);
    const tasksMonitor: Promise<void>[] = [];

    console.log(`【开始任务】目标语言: ${targetLanguage}, 显示模式: ${displayMode}, 平台: ${platform}, 翻译模型: ${translationModal}`);

    // 复制节点并重命名
    if (displayMode === DisplayMode.Duplicate) {
        nodes = duplicateAndRenameNodes(nodes, targetLanguage);
    }

    const textNodes = traverseTextNodes(nodes);
    const processNodes: ProcessNode[] = createProcessNodes(textNodes, tasksMonitor);

    // 所有 promise 完成
    Promise.all(tasksMonitor).then(() => {
        const endTime = new Date(); // 记录结束时间
        const duration = endTime.getTime() - startTime.getTime(); // 计算持续时间
        console.log(`【所有任务完成】运行时长: ${duration} 毫秒`); // 输出运行时长

        emit<HideProcessingLayerHandler>('HIDE_PROCESSING_LAYER');
        emit<ShowToastHandler>(
            'SHOW_TOAST',
            ToastType.Info,
            `All tasks completed in ${(duration / 1000).toFixed(1)} seconds`
        );
    });

    if (needTranslate) {
        // 过滤出需要翻译的节点
        const availableTransModal = await getAvaliableTransModal(translationModal);
        const termbaseMode = (await getClientStorageValue(StorageKey.Termbase)) === SwitchMode.On;
        const untranslatedNodes: ProcessNode[] = processNodes.filter((node) =>
            needTranslating(node.textNode.characters, targetLanguage)
        );

        // 将节点分组，每组包含 TRANSLATE_CHUNK_SIZE 个节点，并行执行
        Array.from({ length: Math.ceil(untranslatedNodes.length / TRANSLATE_CHUNK_SIZE) }, async (_, i) => {
            const nodesChunks = untranslatedNodes.slice(i * TRANSLATE_CHUNK_SIZE, (i + 1) * TRANSLATE_CHUNK_SIZE);

            translate(nodesChunks, targetLanguage, availableTransModal, termbaseMode).then(() => {
                nodesChunks.forEach(async (node) => {
                    if (needPolish && needPolishing(node.updatedContent)) {
                        await polish(node, targetLanguage);
                    }
                    if (needFormat) {
                        formatter(node, targetLanguage, platform);
                    }
                    updateNodeStyleAndContent(node);
                });
            });
        });
    }

    const restNodes: ProcessNode[] = needTranslate
        ? processNodes.filter((node) => !needTranslating(node.textNode.characters, targetLanguage))
        : processNodes;

    restNodes.forEach((node) => {
        if (needFormat) {
            formatter(node, targetLanguage, platform);
        }
        updateNodeStyleAndContent(node);
    });
}


function createProcessNodes(textNodes: TextNode[], tasksMonitor: Promise<void>[]) {
    return textNodes
        .map((node) => {
            if (node.characters.length > 0) {
                let completeCallback: () => void;
                const promise = new Promise<void>((resolve) => {
                    completeCallback = resolve;
                });

                tasksMonitor.push(promise);

                return {
                    textNode: node,
                    nodeName: node.name,
                    parentNodeName: node.parent?.name ?? '',
                    completeCallback,
                };
            }
            return null; // 返回 null 以便后续过滤
        })
        .filter((node) => node !== null); // 过滤掉 null 值
}

async function updateNodeStyleAndContent(processNode: ProcessNode) {
    if (processNode.updatedStyleKey) {
        await updateNodeStyle(processNode.textNode, processNode.updatedStyleKey);
    }

    if (processNode.updatedContent) {
        await updateNodeContent(processNode.textNode, processNode.updatedContent);
    }

    processNode.completeCallback(); // 单个 ProcessNode 任务全部完成后，调用 callback
}

async function translate(
    processNodes: ProcessNode[],
    targetLanguage: Language,
    translationModal: TranslationModal,
    termbaseMode: boolean
) {
    const contentArray = processNodes.map((node) => node.textNode.characters);
    console.log('【翻译文本】', contentArray);

    const translatedContentArray = await translateContentByModal(
        contentArray,
        targetLanguage,
        translationModal,
        termbaseMode
    );
    console.log('【翻译结果】', translatedContentArray);

    processNodes.forEach((processNode: ProcessNode, index: number) => {
        processNode.updatedContent = translatedContentArray[index] || '';
    });
}

async function polish(processNode: ProcessNode, targetLanguage: Language) {
    const content = processNode.updatedContent || processNode.textNode.characters;
    console.log('【润色文本】', content);

    const polishedContent = await polishContent(content, targetLanguage);
    console.log('【润色结果】', polishedContent);

    // 更新节点内容
    processNode.updatedContent = polishedContent;
}

function formatter(processNode: ProcessNode, targetLanguage: Language, platform: Platform) {
    const content = processNode.updatedContent || processNode.textNode.characters;
    console.log('【标准化文本】', content);

    const fontname = getFisrtFontName(processNode.textNode);
    const fontsize = getFisrtFontSize(processNode.textNode);

    const formattedContent = getFormattedContent(
        content,
        targetLanguage,
        processNode.nodeName,
        processNode.parentNodeName
    );
    const formattedStyleKey = getFormattedStyleKey(fontname, fontsize, targetLanguage, platform);

    if (formattedContent === '' || formattedStyleKey === '') {
        return;
    }

    console.log('【标准化后文本】', formattedContent, `${formattedStyleKey ? 'keyMatched' : 'keyNotMatched'}`);

    processNode.updatedContent = formattedContent;
    processNode.updatedStyleKey = formattedStyleKey;
}

function duplicateAndRenameNodes(nodes: SceneNode[], nameAddOn: string) {
    return nodes.map((node) => {
        const clonedNode = node.clone();
        clonedNode.name = `${clonedNode.name}/${nameAddOn}`;

        if (node.parent) {
            node.parent.appendChild(clonedNode);
        }

        clonedNode.x = clonedNode.x + clonedNode.width + 60;

        return clonedNode;
    });
}

function traverseTextNodes(nodes: SceneNode[]) {
    const textNodes = [];

    const collectTextNodes = (node: SceneNode) => {
        if (node.type === 'TEXT' && node.visible) {
            textNodes.push(node);
        } else if ('children' in node && node.visible) {
            node.children.forEach(collectTextNodes);
        }
    };

    nodes.forEach(collectTextNodes);

    return textNodes;
}

// 更新节点内容
async function updateNodeContent(node: TextNode, content: string) {
    try {
        const fonts = node.getRangeAllFontNames(0, node.characters.length);
        const fontname = fonts[0];

        await loadFontAsync(fontname);

        if (fonts.length > 1) {
            node.setRangeFontName(0, node.characters.length, fontname);
        }

        node.characters = content;
    } catch (error) {
        console.log('【错误】文本节点字体提取出错', node.characters);
    }
}

async function updateNodeStyle(node: TextNode, styleKey: string) {
    const style = await loadStyleAsync(styleKey);

    if (style) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        await node.setRangeTextStyleIdAsync(0, node.characters.length, style.id);
    }
}

const loadFontAsync = (() => {
    const cachedFonts: FontName[] = [];
    const loadingFonts: { [key: string]: Promise<void> } = {}; // 存储正在加载的字体

    return async (fontName: FontName) => {
        // 检查字体是否已缓存
        if (cachedFonts.some((cachedFont) => cachedFont.family === fontName.family && cachedFont.style === fontName.style)) {
            return; // 字体已缓存，无需加载
        }

        // 如果字体正在加载中，直接返回该 Promise
        if (loadingFonts[fontName.family + fontName.style]) {
            return loadingFonts[fontName.family + fontName.style];
        }

        // 开始加载字体
        const loadingPromise = figma
            .loadFontAsync(fontName)
            .then(() => {
                cachedFonts.push(fontName); // 加载完成后缓存字体
            })
            .finally(() => {
                delete loadingFonts[fontName.family + fontName.style]; // 加载完成后移除
            });

        loadingFonts[fontName.family + fontName.style] = loadingPromise; // 缓存正在加载的 Promise
        return loadingPromise; // 返回 Promise
    };
})();

const loadStyleAsync = (() => {
    const cachedStyles: { key: string; style: TextStyle }[] = []; // 明确类型
    const loadingStyles: { [key: string]: Promise<TextStyle> } = {}; // 存储正在加载的样式

    return async (styleKey: string) => {
        const cachedStyle = cachedStyles.find((cachedStyle) => cachedStyle.key === styleKey);

        if (cachedStyle) {
            return cachedStyle.style;
        }

        // 如果样式正在加载中，直接返回该 Promise
        if (loadingStyles[styleKey]) {
            return loadingStyles[styleKey];
        }

        // 开始加载样式
        const loadingPromise = figma
            .importStyleByKeyAsync(styleKey)
            .then((style) => {
                if (style && style.type === 'TEXT') {
                    const textStyle = style as TextStyle;
                    cachedStyles.push({ key: styleKey, style: textStyle });
                    return textStyle;
                }
            })
            .finally(() => {
                delete loadingStyles[styleKey]; // 加载完成后移除
            });

        loadingStyles[styleKey] = loadingPromise; // 缓存正在加载的 Promise
        return loadingPromise; // 返回 Promise
    };
})();

function getFisrtFontName(node: TextNode) {
    return node.getRangeAllFontNames(0, 1)[0];
}

function getFisrtFontSize(node: TextNode) {
    return node.getRangeFontSize(0, 1) as number;
}

async function getAvaliableTransModal(translationModal: TranslationModal) {
    if (translationModal === TranslationModal.GoogleBasic || translationModal === TranslationModal.GoogleFree) {
        if (await isGoogleTranslationApiAccessible()) {
            return translationModal;
        }

        emit<ShowToastHandler>(
            'SHOW_TOAST',
            ToastType.Warning,
            'Google Translation is unavailable. Switch to Baidu Translation.'
        );

        return TranslationModal.Baidu;
    }

    return TranslationModal.Baidu;
}

// 初始化并设置事件监听
init();

on<ResizeWindowHandler>('RESIZE_WINDOW', ({ width, height }) => figma.ui.resize(width, height));
on<TranslateHandler>('TRANSLATE', handleTranslate);
on<StylelintHandler>('STYLELINT', handleStylelint);