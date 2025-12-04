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
    ClearTasksHandler,
    UpdateTotalTasksHandler,
    TaskCompleteHandler,
    SetAccessTokenHandler,
    ClearCacheHandler,
} from '../types';

import { getClientStorageValue, setLocalStorage } from '../utils/utility';
import { translateContentByModal, needTranslating, isGoogleTranslationApiAccessible } from './translate';
import { polishContent, needPolishing } from './polish';
import { getFormattedContent, getFormattedStyleKey } from './format';
import { addTranslateUsageCount, addStylelintUsageCount, addProcessNodesCount } from './usageRecord';
import { clearTranslationCache } from './cache';
import { clearPolishCache } from './polisher';
import { checkAndrefreshAccessToken, setAccessToken } from './oauthManager';
import { googleApiKey, baiduAppId, baiduApiKey, cozeApiKey } from '../../config';
import { findGlossaryTranslation } from './staticGlossary'

async function bootstrapSecrets() {
    try {
        const googleKey = await getClientStorageValue(StorageKey.GoogleAPIKey)
        if (!googleKey && typeof googleApiKey === 'string' && googleApiKey) {
            await setLocalStorage(StorageKey.GoogleAPIKey, googleApiKey)
        }
        const baiduId = await getClientStorageValue(StorageKey.BaiduAppID)
        if (!baiduId && typeof baiduAppId === 'string' && baiduAppId) {
            await setLocalStorage(StorageKey.BaiduAppID, baiduAppId)
        }
        const baiduK = await getClientStorageValue(StorageKey.BaiduKey)
        if (!baiduK && typeof baiduApiKey === 'string' && baiduApiKey) {
            await setLocalStorage(StorageKey.BaiduKey, baiduApiKey)
        }
        const cozeK = await getClientStorageValue(StorageKey.CozeAPIKey)
        if (!cozeK && typeof cozeApiKey === 'string' && cozeApiKey) {
            await setLocalStorage(StorageKey.CozeAPIKey, cozeApiKey)
        }
    } catch { }
}

// 初始化插件
async function init() {
    await bootstrapSecrets();
    figma.showUI(__html__, { width: 380, height: 308 });
    figma.skipInvisibleInstanceChildren = true
    checkAndrefreshAccessToken();
}

// 翻译按钮被点击
async function handleTranslate() {
    const autoPolishMode = (await getClientStorageValue(StorageKey.AutoPolishing)) === SwitchMode.On;
    const autoStylelintMode = (await getClientStorageValue(StorageKey.AutoStylelintMode)) === SwitchMode.On;

    // 输出选中文本节点的 stylekey
    const node = figma.currentPage.selection[0];

    if (node && node.type === 'TEXT') {
        const styleId = node.textStyleId;
        if (styleId && typeof styleId === 'string') {
            const style = await figma.getStyleByIdAsync(styleId);
            if (style) {
                console.log('Style Key:', style.key);
            } else {
                console.log('No style found for this text node.');
            }
        } else {
            console.log('This text node does not use a shared style.');
        }
    } else {
        console.log('Selected node is not a TextNode');
    }

    processNodesTasks([...figma.currentPage.selection], true, autoPolishMode, autoStylelintMode);
}

// 设计规范更新按钮被点击
async function handleStylelint() {
    processNodesTasks([...figma.currentPage.selection], false, false, true);
}

function handleSetAccessToken(oauthCode: string) {
    setAccessToken(oauthCode);
}

async function handleClearCache() {
    await clearTranslationCache();
    await clearPolishCache();
    emit<ShowToastHandler>('SHOW_TOAST', ToastType.Positive, 'Local caches cleared');
}

// 核心处理逻辑
async function processNodesTasks(nodes: SceneNode[], needTranslate: boolean, needPolish: boolean, needFormat: boolean) {
    if (nodes.length === 0) {
        emitWarning('Please select at least one node');
        return;
    }

    if (!needTranslate && !needPolish && !needFormat) {
        emitWarning('No tasks to run');
        return;
    }

    updateUsageCounts(needTranslate, needFormat);

    emit<ClearTasksHandler>('CLEAR_TASKS');
    emit<ShowProcessingLayerHandler>('SHOW_PROCESSING_LAYER');

    const startTime = new Date();
    const [targetLanguage, displayMode, platform, translationModal] = await getSettings();
    const tasksMonitor: Promise<void>[] = [];
    let translateDone = 0
    let polishDone = 0
    let formatDone = 0
    let polishTotal = 0

    console.log(`[Task begin] TargetLang: ${targetLanguage}, DisplayMode: ${displayMode}, Platform: ${platform}, TransModal: ${translationModal}`);

    // 复制节点并重命名（如果需要）
    if (displayMode === DisplayMode.Duplicate) {
        nodes = duplicateAndRenameNodes(nodes, targetLanguage);
    }

    // 收集所有文本节点
    const textNodes = traverseTextNodes(nodes);
    const processNodes: ProcessNode[] = createProcessNodes(textNodes, tasksMonitor);

    // 更新待完成的任务总数
    emit<UpdateTotalTasksHandler>('UPDATE_TOTAL_TASKS', processNodes.length);
    // 埋点记录本次操作影响的节点数
    addProcessNodesCount(processNodes.length);

    if (!needTranslate) {
        emit<any>('UPDATE_STAGE_TOTALS', 'translate', 0)
    }
    emit<any>('UPDATE_STAGE_TOTALS', 'format', needFormat ? processNodes.length : 0)
    polishTotal = needTranslate ? 0 : (needPolish ? processNodes.filter((n) => needPolishing(n.textNode.characters)).length : 0)
    emit<any>('UPDATE_STAGE_TOTALS', 'polish', polishTotal)

    // 处理需要翻译的节点
    if (needTranslate) {
        const availableTransModal = await getAvailableTransModal(translationModal);
        const chunkSize = getTranslateChunkSize(availableTransModal);
        const termbaseMode = (await getClientStorageValue(StorageKey.Termbase)) === SwitchMode.On;
        const sourceLanguage = targetLanguage === Language.EN ? Language.ZH : Language.EN
        const glossaryHits: ProcessNode[] = []
        for (const node of processNodes) {
            const t = findGlossaryTranslation(node.textNode.characters, sourceLanguage, targetLanguage)
            if (t && needTranslating(node.textNode.characters, targetLanguage)) {
                console.info('[Glossary] Hit', { source: node.textNode.characters, target: t, sourceLanguage, targetLanguage })
                node.updatedContent = t
                node.skipPolish = true
                glossaryHits.push(node)
            }
        }
        for (const _ of glossaryHits) {
            translateDone += 1
            emit<any>('STAGE_STEP_COMPLETE', 'translate', translateDone)
        }
        const untranslatedNodes = processNodes.filter((node) =>
            needTranslating(node.textNode.characters, targetLanguage) && !glossaryHits.includes(node)
        );
        emit<any>('UPDATE_STAGE_TOTALS', 'translate', untranslatedNodes.length + glossaryHits.length)
        emit<any>('UPDATE_STAGE_TOTALS', 'format', needFormat ? processNodes.length : 0)

        if (glossaryHits.length > 0 && needFormat) {
            await Promise.all(glossaryHits.map(async (node) => {
                await polishAndFormatNode(
                    node,
                    needPolish,
                    needFormat,
                    targetLanguage,
                    platform,
                    undefined,
                    () => {
                        formatDone += 1
                        emit<any>('STAGE_STEP_COMPLETE', 'format', formatDone)
                    }
                )
            }))
        }

        // 将节点分组并行翻译
        const translationPromises = Array.from({ length: Math.ceil(untranslatedNodes.length / chunkSize) }, async (_, i) => {
            const nodesChunk = untranslatedNodes.slice(i * chunkSize, (i + 1) * chunkSize);

            return translate(nodesChunk, targetLanguage, availableTransModal, termbaseMode).then(() => {
                translateDone += nodesChunk.length
                emit<any>('STAGE_STEP_COMPLETE', 'translate', translateDone)
                const chunkPolish = needPolish ? nodesChunk.filter((node) => needPolishing(node.updatedContent || node.textNode.characters)).length : 0
                if (chunkPolish > 0) {
                    polishTotal += chunkPolish
                    emit<any>('UPDATE_STAGE_TOTALS', 'polish', polishTotal)
                }
                return Promise.all(nodesChunk.map(async (node) => {
                    await polishAndFormatNode(node, needPolish, needFormat, targetLanguage, platform, () => {
                        polishDone += 1
                        emit<any>('STAGE_STEP_COMPLETE', 'polish', polishDone)
                    }, () => {
                        formatDone += 1
                        emit<any>('STAGE_STEP_COMPLETE', 'format', formatDone)
                    });
                }));
            });
        });

        await Promise.all(translationPromises);
    }

    // 处理剩余的节点
    const remainingNodes = needTranslate ? processNodes.filter((node) => !needTranslating(node.textNode.characters, targetLanguage)) : processNodes;
    if (needFormat) emit<any>('UPDATE_STAGE_TOTALS', 'format', processNodes.length)
    await Promise.all(remainingNodes.map(node => polishAndFormatNode(node, false, needFormat, targetLanguage, platform, undefined, () => {
        formatDone += 1
        emit<any>('STAGE_STEP_COMPLETE', 'format', formatDone)
    })));

    // 记录任务完成时间
    logCompletion(startTime);
}

async function polishAndFormatNode(
    node: ProcessNode,
    needPolish: boolean,
    needFormat: boolean,
    targetLanguage: Language,
    platform: Platform,
    onPolishDone?: () => void,
    onFormatDone?: () => void,
    onPolishSchedule?: () => void,
) {
    if (needPolish && !node.skipPolish && needPolishing(node.updatedContent || node.textNode.characters)) {
        onPolishSchedule && onPolishSchedule()
        await polish(node, targetLanguage);
        onPolishDone && onPolishDone()
    }
    if (needFormat) {
        formatter(node, targetLanguage, platform);
        onFormatDone && onFormatDone()
    }
    updateNodeStyleAndContent(node);
}

function emitWarning(message: string) {
    emit<ShowToastHandler>('SHOW_TOAST', ToastType.Warning, message);
}

function updateUsageCounts(needTranslate: boolean, needFormat: boolean) {
    if (needTranslate) {
        addTranslateUsageCount();
    }
    if (needFormat) {
        addStylelintUsageCount();
    }
}

async function getSettings() {
    return Promise.all([
        getClientStorageValue(StorageKey.TargetLanguage) as Promise<Language>,
        getClientStorageValue(StorageKey.DisplayMode) as Promise<DisplayMode>,
        getClientStorageValue(StorageKey.Platform) as Promise<Platform>,
        getClientStorageValue(StorageKey.TranslationModal),
    ]);
}

function logCompletion(startTime: Date) {
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    console.log(`[Task Finished] Use ${duration}ms in total`);
    emit<HideProcessingLayerHandler>('HIDE_PROCESSING_LAYER');
    emit<ShowToastHandler>('SHOW_TOAST', ToastType.Info, `All tasks completed in ${(duration / 1000).toFixed(1)} seconds`);
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

    emit<TaskCompleteHandler>('TASK_COMPLETE');
    processNode.completeCallback(); // 单个 ProcessNode 任务全部完成后，调用 callback
}

async function translate(
    processNodes: ProcessNode[],
    targetLanguage: Language,
    translationModal: TranslationModal,
    termbaseMode: boolean
) {
    const contentArray = processNodes.map((node) => node.textNode.characters);
    console.log('[Translate Task] Target: ', contentArray);

    const translatedContentArray = await translateContentByModal(
        contentArray,
        targetLanguage,
        translationModal,
        termbaseMode
    );

    console.log('[Translate Task] Result: ', translatedContentArray);

    processNodes.forEach((processNode: ProcessNode, index: number) => {
        processNode.updatedContent = translatedContentArray[index] || '';
    });
}

async function polish(processNode: ProcessNode, targetLanguage: Language) {
    const content = processNode.updatedContent || processNode.textNode.characters;
    const polishedContent = await polishContent(content, targetLanguage);

    console.log(`[Polish Task]\n\nTarget: ${content} \n\nResult: ${polishedContent}`);

    // 更新节点内容
    processNode.updatedContent = polishedContent;
}

function formatter(processNode: ProcessNode, targetLanguage: Language, platform: Platform) {
    const content = processNode.updatedContent || processNode.textNode.characters;
    const fontname = getFirstFontName(processNode.textNode);
    const fontsize = getFirstFontSize(processNode.textNode);
    const formattedStyleKey = getFormattedStyleKey(fontname, fontsize, targetLanguage, platform);
    const formattedContent = getFormattedContent(
        content,
        targetLanguage,
        processNode.nodeName,
        processNode.parentNodeName
    );

    if (formattedContent === '' || formattedStyleKey === '') {
        return;
    }

    console.log(`[Format Task]\n\nTarget: ${content} \n\nResult: ${formattedContent}`);

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
        console.error('[Error] Failed to get range font name of: ', node.characters);
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
    const cachedFontsKeySet = new Set<string>();
    const loadingFonts = new Map<string, Promise<void>>();

    return async (fontName: FontName) => {
        const key = `${fontName.family}|${fontName.style}`;
        if (cachedFontsKeySet.has(key)) {
            return;
        }
        const existing = loadingFonts.get(key);
        if (existing) {
            return existing;
        }
        const loadingPromise = figma
            .loadFontAsync(fontName)
            .then(() => {
                cachedFontsKeySet.add(key);
            })
            .finally(() => {
                loadingFonts.delete(key);
            });
        loadingFonts.set(key, loadingPromise);
        return loadingPromise;
    };
})();

const loadStyleAsync = (() => {
    const cachedStyles = new Map<string, TextStyle>();
    const loadingStyles = new Map<string, Promise<TextStyle>>();

    return async (styleKey: string) => {
        const hit = cachedStyles.get(styleKey);
        if (hit) {
            return hit;
        }
        const existing = loadingStyles.get(styleKey);
        if (existing) {
            return existing;
        }
        const loadingPromise = figma
            .importStyleByKeyAsync(styleKey)
            .then((style) => {
                if (style && style.type === 'TEXT') {
                    const textStyle = style as TextStyle;
                    cachedStyles.set(styleKey, textStyle);
                    return textStyle;
                }
                return undefined as unknown as TextStyle;
            })
            .finally(() => {
                loadingStyles.delete(styleKey);
            });
        loadingStyles.set(styleKey, loadingPromise);
        return loadingPromise;
    };
})();

function getFirstFontName(node: TextNode) {
    return node.getRangeAllFontNames(0, 1)[0];
}

function getFirstFontSize(node: TextNode) {
    return node.getRangeFontSize(0, 1) as number;
}

async function getAvailableTransModal(translationModal: TranslationModal) {
    if (translationModal.includes('Google') && await isGoogleTranslationApiAccessible()) {
        return translationModal;
    }

    if (translationModal.includes('Google')) {
        emit<ShowToastHandler>(
            'SHOW_TOAST',
            ToastType.Warning,
            'Google Translation is unavailable, switching to Baidu Translation'
        );
    }

    return TranslationModal.Baidu;
}

// 初始化并设置事件监听
init();

on<ResizeWindowHandler>('RESIZE_WINDOW', ({ width, height }) => figma.ui.resize(width, height));
on<TranslateHandler>('TRANSLATE', handleTranslate);
on<StylelintHandler>('STYLELINT', handleStylelint);
on<SetAccessTokenHandler>('SET_ACCESS_TOKEN', handleSetAccessToken);
on<ClearCacheHandler>('CLEAR_CACHE', handleClearCache);
function getTranslateChunkSize(modal: TranslationModal) {
    if (modal === TranslationModal.GoogleAdvanced || modal === TranslationModal.GoogleBasic) {
        return 50;
    }
    if (modal === TranslationModal.Baidu) {
        return 20;
    }
    return 10;
}
