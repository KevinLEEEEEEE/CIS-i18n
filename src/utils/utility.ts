import {
    SetLocalStorageHandler,
    RequestLocalStorageHandler,
    ReceiveLocalStorageHandler,
    StorageKey,
    TranslationModal,
    Platform,
    DisplayMode,
    Language,
    SwitchMode,
} from '../types';
import { emit, on } from '@create-figma-plugin/utilities';

const cache: { [key in StorageKey]?: any } = {};

const defaultValues: { [key in StorageKey]: any } = {
    // 在这里定义每个 StorageKey 的默认值
    [StorageKey.TargetLanguage]: Language.EN,
    [StorageKey.DisplayMode]: DisplayMode.Duplicate,
    [StorageKey.Platform]: Platform.Desktop,
    [StorageKey.TranslationModal]: TranslationModal.GoogleBasic,
    [StorageKey.Termbase]: SwitchMode.On,
    [StorageKey.AutoStylelintMode]: SwitchMode.On,
    [StorageKey.AutoPolishing]: SwitchMode.On,
    [StorageKey.GoogleAPIKey]: '',
    [StorageKey.BaiduAppID]: '',
    [StorageKey.BaiduKey]: '',
    [StorageKey.CozeAPIKey]: '',
    [StorageKey.GoogleAccessToken]: '',
    [StorageKey.GoogleAccessTokenExpireDate]: '',
    [StorageKey.GoogleRefreshToken]: '',
    [StorageKey.isFirstOpen]: true,
};

export async function setLocalStorage(key: StorageKey, value: any) {
    cache[key] = value;
    if (typeof figma !== 'undefined' && figma.clientStorage && typeof figma.clientStorage.setAsync === 'function') {
        await figma.clientStorage.setAsync(key, value);
    }
}

export async function getClientStorageValue(key: StorageKey) {
    // 检查缓存
    if (cache[key] !== undefined) {
        return cache[key];
    }

    const value = (typeof figma !== 'undefined' && figma.clientStorage && typeof figma.clientStorage.getAsync === 'function')
        ? await figma.clientStorage.getAsync(key)
        : undefined;
    const result = value !== undefined ? value : (defaultValues[key] !== undefined ? defaultValues[key] : '');

    // 缓存结果
    cache[key] = result;
    return result;
}

export function formRequestBody(params: Record<string, string | number | boolean>) {
    return Object.entries(params)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
}

function handleSetLocalStorage(objs: { key: StorageKey; value: any }[]) {
    objs.forEach(({ key, value }) => setLocalStorage(key, value));
}

async function handleRequestLocalStorage({ key }: { key: StorageKey[] }) {
    const values = await Promise.all(key.map((k) => getClientStorageValue(k)));
    const res = key.map((k, index) => ({ key: k, value: values[index] }));
    emit<ReceiveLocalStorageHandler>('RECEIVE_LOCAL_STORAGE', res);
}

on<SetLocalStorageHandler>('SET_LOCAL_STORAGE', handleSetLocalStorage);
on<RequestLocalStorageHandler>('REQUEST_LOCAL_STORAGE', handleRequestLocalStorage);
