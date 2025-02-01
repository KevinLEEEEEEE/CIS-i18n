import { EventHandler } from '@create-figma-plugin/utilities';

export interface TranslateHandler extends EventHandler {
    name: 'TRANSLATE';
    handler: () => void;
}

export interface StylelintHandler extends EventHandler {
    name: 'STYLELINT';
    handler: () => void;
}

export interface ShowToastHandler extends EventHandler {
    name: 'SHOW_TOAST';
    handler: (type: ToastType, message: string) => void;
}

export interface UpdateTotalTasksHandler extends EventHandler {
    name: 'UPDATE_TOTAL_TASKS';
    handler: (totalAmount: number) => void;
}

export interface TaskCompleteHandler extends EventHandler {
    name: 'TASK_COMPLETE';
    handler: () => void;
}

export interface ClearTasksHandler extends EventHandler {
    name: 'CLEAR_TASKS';
    handler: () => void;
}

export interface ShowProcessingLayerHandler extends EventHandler {
    name: 'SHOW_PROCESSING_LAYER';
    handler: () => void;
}

export interface HideProcessingLayerHandler extends EventHandler {
    name: 'HIDE_PROCESSING_LAYER';
    handler: () => void;
}

export interface ResizeWindowHandler extends EventHandler {
    name: 'RESIZE_WINDOW';
    handler: (windowSize: { width: number; height: number }) => void;
}

export interface SetLocalStorageHandler extends EventHandler {
    name: 'SET_LOCAL_STORAGE';
    handler: (objs: { key: StorageKey; value: any }[]) => void;
}

export interface RequestLocalStorageHandler extends EventHandler {
    name: 'REQUEST_LOCAL_STORAGE';
    handler: (objs: { key: StorageKey[] }) => void;
}

export interface ReceiveLocalStorageHandler extends EventHandler {
    name: 'RECEIVE_LOCAL_STORAGE';
    handler: (objs: { key: StorageKey; value: any }[]) => void;
}

export interface AjaxRequestHandler extends EventHandler {
    name: 'AJAX_REQUEST';
    handler: (req: { url: string; messageID: string }) => void;
}

export interface AjaxResponseHandler extends EventHandler {
    name: 'AJAX_RESPONSE';
    handler: (res: { isSuccessful: boolean; data?: any; messageID: string }) => void;
}

export interface SetAccessTokenHandler extends EventHandler {
    name: 'SET_ACCESS_TOKEN';
    handler: (oauthCode: string) => void;
}

export interface ProcessNode {
    textNode: TextNode;
    nodeName: string;
    parentNodeName: string;
    updatedContent?: string;
    updatedStyleKey?: string;
    completeCallback: () => void;
}

export interface StyleKey {
    fontFamily: string;
    fontSize: number;
    styleID?: string;
    styleName?: string;
}

export enum StorageKey {
    TargetLanguage = 'targetLanguage',
    DisplayMode = 'displayMode',
    Platform = 'platform',
    TranslationModal = 'translationModal',
    Termbase = 'termbase',
    AutoStylelintMode = 'autoStylelintMode',
    AutoPolishing = 'autoPolishing',
    GoogleAPIKey = 'googleAPIKey',
    BaiduAppID = 'baiduAppID',
    BaiduKey = 'baiduKey',
    CozeAPIKey = 'cozeAPIKey',
    GoogleAccessToken = 'googleAccessToken',
    GoogleAccessTokenExpireDate = 'googleAccessTokenExpireDate',
    GoogleRefreshToken = 'googleRefreshToken',
    isFirstOpen = 'isFirstOpen',
}

export enum Language {
    EN = 'en',
    ZH = 'zh',
}

export enum DisplayMode {
    Replace = 'replace',
    Duplicate = 'duplicate',
}

export enum SwitchMode {
    On = 'on',
    Off = 'off',
}

export enum TranslationModal {
    GoogleAdvanced = 'GoogleAdvanced',
    GoogleBasic = 'GoogleBasic',
    GoogleFree = 'GoogleFree',
    Baidu = 'Baidu',
}

export enum Platform {
    Desktop = 'desktop',
    Mobile = 'mobile',
}

export enum ToastType {
    Info = 'info',
    Positive = 'positive',
    Warning = 'warning',
    Negative = 'negative',
}
