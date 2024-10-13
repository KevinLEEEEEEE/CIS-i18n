import { on, emit } from '@create-figma-plugin/utilities';
import {
    ResizeWindowHandler,
    TranslateHandler,
    StylelintHandler,
    ChangeSettingHandler,
    DisplayMode,
    ProcessUnit,
    AjaxResponseHandler,
    ReadSettingHandler,
    ReturnSettingHandler,
    SettingKey,
    Language,
    TranslationModal,
    Platform,
} from '../types';
import {
    getSettingByKey,
    setNodeOffset
} from '../utils/utility';
import { translateContentByModal, needTranslating } from './translator';
import { polishContent, needPolishing } from './polisher';
import { getFormattedContent, getFormattedStyleKey } from './formatter';

// 初始化插件
async function init() {
    figma.showUI(__html__, { width: 380, height: 308 });
    figma.skipInvisibleInstanceChildren = true;

    //文本润色测试内容

    // const content1 = await polishContent("how are you today?", Language.EN);
    // console.log(content1);

    // const content2 = await polishContent("If you encounter the problem of functions being mounted repeatedly, this is usually caused by you mistakenly creating a new function in the render method of a class component or in a function component.", Language.EN);
    // console.log(content2);

    // const content3 = await polishContent("如果你遇到了函数被反复挂载的问题。这通常是由于你在类组件的render方法或函数组件中错误地创建了新的函数导致的", Language.ZH);
    // console.log(content3);

    // 翻译测试内容

    // const messages = ["hello. and how are you today", "world?"];
    // const targetLanguage = Language.ZH;

    // const messages = ["如果你遇到了函数被反复挂载的问题", "这通常是由于你在类组件的 render 方法或函数组件中错误地创建了新的函数导致的"];
    // const targetLanguage = Language.EN;

    // const res1 = await translateContentByModal(messages, targetLanguage, TranslationModal.GoogleBasic);
    // console.log("GoogleBasic", res1);

    // const res21 = await translateContentByModal(messages, targetLanguage, TranslationModal.GoogleFree);
    // console.log("GoogleFree", res21);

    // const res31 = await translateContentByModal(messages, targetLanguage, TranslationModal.Baidu);
    // console.log("Baidu", res31);
}

// 处理翻译请求
async function handleTranslate() {
    if (!isSelectionEmpty()) {
        const autoStylelintMode = await getSettingByKey(SettingKey.AutoStylelintMode);
        runProcess([...figma.currentPage.selection], true, autoStylelintMode === AutoStylelintMode.On);
    } else {
        console.log('【没有选中节点】');
    }
}

// 处理样式检查请求
async function handleStylelint() {
    if (!isSelectionEmpty()) {
        runProcess([...figma.currentPage.selection], false, true);
    } else {
        console.log('【没有选中节点】');
    }
}

// 处理设置变更
async function handleChangeSetting({ key, value }: { key: string, value: any }) {
    console.log(`[Change Setting] ${key}: ${value}`);
    await figma.clientStorage.setAsync(key, value);
}

// 处理请求完成
function handleRequestComplete({ isSuccessful, data, errMessage, unit }: { isSuccessful: boolean; data?: any; errMessage?: JQueryXHR; unit: ProcessUnit }) {
    if (isSuccessful && data) {
        translationComplete(data, unit);
    } else if (errMessage) {
        console.log(errMessage);
    }
}

// 读取设置
async function handleReadSetting({ key }: { key: SettingKey }) {
    const value = await getSettingByKey(key);
    emit<ReturnSettingHandler>('RETURN_SETTING', { key, value });
}


// 核心处理逻辑
async function runProcess(nodes: SceneNode[], needTranslation: boolean, needStylelint: boolean) {

    const targetLanguages = Language.ZH;
    const platform = Platform.Mobile;

    const textNode = nodes[0] as TextNode;
    const fontName = textNode.getRangeFontName(0, 1) as FontName;
    const fontSize = textNode.getRangeFontSize(0, 1) as number;
    const lineHeight = textNode.getRangeLineHeight(0, 1) as LineHeight;

    // const styleId = textNode.textStyleId as string; // 后续要处理 figma.mixed 问题
    // const lineHeight = textNode.lineHeight;

    // console.log(fontName);
    // console.log(fontSize);
    // console.log(lineHeight);
    // console.log(figma.getStyleById(styleId).key);

    const styleKey = getFormattedStyleKey(fontName, fontSize, lineHeight["value"], targetLanguages, platform);

    console.log(styleKey);

    return;

    const targetLanguage = await getSettingByKey(SettingKey.TargetLanguage) as Language;
    const displayMode = await getSettingByKey(SettingKey.DisplayMode) as DisplayMode;
    const processUnits: ProcessUnit[] = [];

    console.log(`【开始处理】目标语言: ${targetLanguage}, 显示模式: ${displayMode}`);

    // 处理复制模式
    if (displayMode === DisplayMode.Duplicate) {
        nodes = nodes.map(node => {
            const clonedNode = node.clone();
            clonedNode.name = `${clonedNode.name}/${targetLanguage}`;
            setNodeOffset(clonedNode, { x: clonedNode.width + 60, y: 0 });
            return clonedNode;
        });
    }

    // 收集需要处理的文本节点
    const collectTextNodes = (node: SceneNode) => {
        if (node.type === 'TEXT') {
            processUnits.push({
                node: node,
                nodeID: node.id,
                targetLanguage,
                needTranslation: needTranslation && needTranslating(node.characters, targetLanguage),
                needStylelint: needStylelint,
            });
        } else if ('children' in node) {
            node.children.forEach(collectTextNodes);
        }
    };

    nodes.forEach(collectTextNodes);

    console.log('【单元准备就绪】', processUnits);

    await doTranslation(processUnits);
    await doStylelint(processUnits);
}

// 翻译处理
async function doTranslation(units: ProcessUnit[]) {
    const translationModal = await getSettingByKey(SettingKey.TranslationModal);
    const transUnits = units.filter(unit => unit.needTranslation);


    // await translateContentByModal(transUnits, translationModal);
}

// 翻译完成处理
async function translationComplete(data: any, unit: ProcessUnit) {
    // const translationModal = await getSettingByKey(SettingKey.TranslationModal);
    // const result = handleTranslatedContentByModal(data, translationModal);

    // console.log('【获取翻译内容】', result);
    // console.log(unit);

    // // TODO: 应用国际化规则
    // await updateNodeContent(result, unit.node);
}

// 更新节点内容
async function updateNodeContent(content: string, node: TextNode) {
    const updatedNode = await figma.getNodeById(node.id) as TextNode;
    const fonts = updatedNode.getRangeAllFontNames(0, updatedNode.characters.length);
    const fontname = fonts[0];

    await figma.loadFontAsync(fontname);

    if (fonts.length > 1) {
        updatedNode.setRangeFontName(0, updatedNode.characters.length, fontname);
    }

    updatedNode.characters = content;
}

// 样式检查处理
async function doStylelint(processUnits: ProcessUnit[]) {
    // TODO: 实现样式检查逻辑
}

// 辅助函数：检查是否有选中节点
function isSelectionEmpty() {
    return figma.currentPage.selection.length === 0;
}

// 初始化并设置事件监听
init();

on<ResizeWindowHandler>('RESIZE_WINDOW', ({ width, height }) => figma.ui.resize(width, height));
on<TranslateHandler>('TRANSLATE', handleTranslate);
on<StylelintHandler>('STYLELINT', handleStylelint);
on<ChangeSettingHandler>('CHANGE_SETTING', handleChangeSetting);
on<AjaxResponseHandler>('AJAX_RESPONSE', handleRequestComplete);
on<ReadSettingHandler>('READ_SETTING', handleReadSetting);