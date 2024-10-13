import { EventHandler } from '@create-figma-plugin/utilities'

export interface TranslateHandler extends EventHandler {
    name: 'TRANSLATE'
    handler: () => void
}

export interface StylelintHandler extends EventHandler {
    name: 'STYLELINT'
    handler: () => void
}

export interface ResizeWindowHandler extends EventHandler {
    name: 'RESIZE_WINDOW'
    handler: (windowSize: { width: number; height: number }) => void
}

export interface ChangeSettingHandler extends EventHandler {
    name: 'CHANGE_SETTING'
    handler: (setting: { key: SettingKey; value: any }) => void
}

export interface ReadSettingHandler extends EventHandler {
    name: 'READ_SETTING'
    handler: (setting: { key: SettingKey }) => void
}

export interface ReturnSettingHandler extends EventHandler {
    name: 'RETURN_SETTING'
    handler: (setting: { key: SettingKey; value: any }) => void
}

export interface AjaxRequestHandler extends EventHandler {
    name: 'AJAX_REQUEST'
    handler: (req: {
        url: string;
        method: 'GET' | 'POST' | 'PUT' | 'DELETE';
        dataType?: string,
        data?: any;
        messageID?: string
    }) => void
}

export interface AjaxResponseHandler extends EventHandler {
    name: 'AJAX_RESPONSE',
    handler: (res: {
        isSuccessful: boolean,
        data?: any,
        errMessage?: JQueryXHR
        messageID?: string
    }) => void
}

export interface ProcessUnit {
    node: TextNode,
    nodeID: string,
    targetLanguage: Language,
    needTranslation: boolean,
    needStylelint: boolean,
    translationModal?: TranslationModal,
    translatedText?: string
}

export interface StyleKey {
    fontFamily: string,
    fontSize: number,
    styleID?: string,
    styleName?: string
}

export enum SettingKey {
    TargetLanguage = 'targetLanguage',
    DisplayMode = 'displayMode',
    Platform = 'platform',
    TranslationModal = 'translationModal',
    Termbase = 'termbase',
    AutoStylelintMode = 'autoStylelintMode',
    AutoPolishing = 'autoPolishing',
    GoogleAPIKey = 'googleAPIKey',
    BaiduAPIKey = 'baiduAPIKey',
    BaiduPassword = 'baiduPassword',
    CozeAPIKey = 'cozeAPIKey',
    isFirstOpen = 'isFirstOpen'
}

export enum Language {
    EN = 'en',
    ZH = 'zh'
}

export enum DisplayMode {
    Replace = 'replace',
    Duplicate = 'duplicate'
}

export enum SwitchMode {
    On = 'on',
    Off = 'off'
}

export enum TranslationModal {
    GoogleBasic = 'GoogleBasic',
    GoogleFree = 'GoogleFree',
    Baidu = 'Baidu'
}

export enum Platform {
    Desktop = 'desktop',
    Mobile = 'mobile'
}