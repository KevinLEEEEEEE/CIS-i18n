import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { emit, on } from '@create-figma-plugin/utilities';

import { Block } from 'baseui/block';
import { Button, KIND, SIZE } from 'baseui/button';
import { Tabs, Tab } from 'baseui/tabs-motion';
import { FormControl } from 'baseui/form-control';
import { Select, Value } from 'baseui/select';
import { RadioGroup, Radio, ALIGN } from 'baseui/radio';
import { Input } from 'baseui/input';
import { toaster } from 'baseui/toast';

import {
    ReceiveLocalStorageHandler,
    RequestLocalStorageHandler,
    ResizeWindowHandler,
    SetLocalStorageHandler,
    StorageKey,
    SwitchMode,
    TranslationModal,
} from '../../types';

let channel = 0;

const Setting = () => {
    // 状态管理
    const [activeTab, setActiveTab] = useState<React.Key>(0);
    const [selectedTransModal, setSelectedTransModal] = useState<Value>([{ id: TranslationModal.GoogleBasic }]);
    const [termbase, setTermbase] = useState(SwitchMode.On);
    const [autoStylelint, setAutoStylelint] = useState(SwitchMode.On);
    const [autoPolishing, setAutoPolishing] = useState(SwitchMode.On);
    const [googleAPIKey, setGoogleAPIKey] = useState('');
    const [baiduAppID, setBaiduAppID] = useState('');
    const [baiduKey, setBaiduKey] = useState('');
    const [cozeAPIKey, setCozeAPIKey] = useState('');
    const navigate = useNavigate();

    // 初始化时调整窗口大小
    useEffect(() => {
        emit<ResizeWindowHandler>('RESIZE_WINDOW', { width: 360, height: 513 });
        emit<RequestLocalStorageHandler>('REQUEST_LOCAL_STORAGE', {
            key: [
                StorageKey.TranslationModal,
                StorageKey.Termbase,
                StorageKey.AutoStylelintMode,
                StorageKey.AutoPolishing,
                StorageKey.GoogleAPIKey,
                StorageKey.BaiduAppID,
                StorageKey.BaiduKey,
                StorageKey.CozeAPIKey,
            ],
        });
    }, []);

    useEffect(() => {
        const currChannel = ++channel;

        const handleReceiveLocalStorage = (objs: { key: StorageKey; value: string | SwitchMode }[]) => {
            if (currChannel !== channel) {
                return;
            }

            objs.forEach(({ key, value }) => {
                const updateMap = {
                    [StorageKey.TranslationModal]: () => setSelectedTransModal([{ id: value }]),
                    [StorageKey.Termbase]: () => setTermbase(value as SwitchMode),
                    [StorageKey.AutoStylelintMode]: () => setAutoStylelint(value as SwitchMode),
                    [StorageKey.AutoPolishing]: () => setAutoPolishing(value as SwitchMode),
                    [StorageKey.GoogleAPIKey]: () => setGoogleAPIKey(value),
                    [StorageKey.BaiduAppID]: () => setBaiduAppID(value),
                    [StorageKey.BaiduKey]: () => setBaiduKey(value),
                    [StorageKey.CozeAPIKey]: () => setCozeAPIKey(value),
                };

                if (value && updateMap[key]) {
                    updateMap[key]();
                    console.log(`[Update toolbox value] ${key}: ${value}`);
                }
            });
        };

        on<ReceiveLocalStorageHandler>('RECEIVE_LOCAL_STORAGE', handleReceiveLocalStorage);
    }, []);

    // 处理自动样式检查的变化
    const handleAutoStylelintChange = useCallback((value: string) => {
        setAutoStylelint(value as SwitchMode);
    }, []);

    // 处理术语库的变化
    const handleTermbaseChange = useCallback((value: string) => {
        setTermbase(value as SwitchMode);
    }, []);

    // 处理翻译模式的变化
    const handleTransModalChange = useCallback((value: Value) => {
        setSelectedTransModal(value);
    }, []);

    // 处理自动润色变化
    const handleAutoPolishingChange = useCallback((value: string) => {
        setAutoPolishing(value as SwitchMode);
    }, []);

    // 取消按钮点击处理
    const handleCancelClick = useCallback(() => {
        navigate('/');
    }, []);

    // 保存按钮点击处理
    const handleSaveClick = useCallback(() => {
        emit<SetLocalStorageHandler>('SET_LOCAL_STORAGE', [
            { key: StorageKey.TranslationModal, value: selectedTransModal[0].id.toString() },
            { key: StorageKey.Termbase, value: termbase },
            { key: StorageKey.AutoStylelintMode, value: autoStylelint },
            { key: StorageKey.AutoPolishing, value: autoPolishing },
            { key: StorageKey.GoogleAPIKey, value: googleAPIKey },
            { key: StorageKey.BaiduAppID, value: baiduAppID },
            { key: StorageKey.BaiduKey, value: baiduKey },
            { key: StorageKey.CozeAPIKey, value: cozeAPIKey },
        ]);

        navigate('/');

        toaster.info('Settings saved');
    }, [selectedTransModal, termbase, autoStylelint, autoPolishing, googleAPIKey, baiduAppID, baiduKey, cozeAPIKey]);

    const getMaskedValue = (value: string) => {
        if (value.length <= 10) {
            return '*'.repeat(value.length);
        }
        const visiblePart = value.slice(0, -10);
        const maskedPart = '*'.repeat(10);
        return visiblePart + maskedPart;
    };

    return (
        <Block>
            <Tabs activeKey={activeTab} onChange={({ activeKey }) => setActiveTab(activeKey)} activateOnFocus>
                <Tab title="General">
                    <Block style={{ height: 320 }}>
                        <FormControl label="Translation modal">
                            <Select
                                clearable={false}
                                options={[
                                    { label: 'GoogleBasic', id: TranslationModal.GoogleBasic },
                                    { label: 'GoogleFree', id: TranslationModal.GoogleFree },
                                    { label: 'Baidu', id: TranslationModal.Baidu },
                                ]}
                                value={selectedTransModal}
                                placeholder="Please select"
                                onChange={({ value }) => handleTransModalChange(value)}
                            />
                        </FormControl>

                        <FormControl label="Term base">
                            <RadioGroup
                                value={termbase}
                                onChange={(e) => handleTermbaseChange(e.currentTarget.value)}
                                align={ALIGN.horizontal}
                            >
                                <Radio value="on">On</Radio>
                                <Radio value="off">Off</Radio>
                            </RadioGroup>
                        </FormControl>

                        <FormControl label="Auto polish">
                            <RadioGroup
                                value={autoPolishing}
                                onChange={(e) => handleAutoPolishingChange(e.currentTarget.value)}
                                align={ALIGN.horizontal}
                            >
                                <Radio value="on">On</Radio>
                                <Radio value="off">Off</Radio>
                            </RadioGroup>
                        </FormControl>

                        <FormControl label="Auto format">
                            <RadioGroup
                                value={autoStylelint}
                                onChange={(e) => handleAutoStylelintChange(e.currentTarget.value)}
                                align={ALIGN.horizontal}
                            >
                                <Radio value="on">On</Radio>
                                <Radio value="off">Off</Radio>
                            </RadioGroup>
                        </FormControl>
                    </Block>
                </Tab>

                <Tab title="Accounts">
                    <Block style={{ height: 320 }}>
                        <FormControl label="Google">
                            <Input
                                value={getMaskedValue(googleAPIKey)}
                                onChange={(e) => setGoogleAPIKey(e.target.value)}
                                placeholder="Enter key"
                                clearOnEscape
                            />
                        </FormControl>

                        <FormControl label="Baidu">
                            <Block style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <Input
                                    value={getMaskedValue(baiduAppID)}
                                    onChange={(e) => setBaiduAppID(e.target.value)}
                                    placeholder="Enter AppID"
                                    clearOnEscape
                                />
                                <Input
                                    value={getMaskedValue(baiduKey)}
                                    onChange={(e) => setBaiduKey(e.target.value)}
                                    placeholder="Enter Key"
                                    clearOnEscape
                                />
                            </Block>
                        </FormControl>

                        <FormControl label="Coze">
                            <Input
                                value={getMaskedValue(cozeAPIKey)}
                                onChange={(e) => setCozeAPIKey(e.target.value)}
                                placeholder="Enter key"
                                clearOnEscape
                            />
                        </FormControl>
                    </Block>
                </Tab>
            </Tabs>

            <Block
                style={{
                    display: 'flex',
                    gap: 8,
                    paddingLeft: 16,
                    paddingRight: 16,
                }}
            >
                <Link to="/" style={{ flex: '1' }}>
                    <Button kind={KIND.secondary} onClick={handleCancelClick} style={{ width: '100%' }}>
                        Cancel
                    </Button>
                </Link>
                <Button style={{ flex: '2' }} onClick={handleSaveClick}>
                    Save
                </Button>
            </Block>

            <Block
                style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', paddingTop: 8, paddingBottom: 8 }}
            >
                <Link to="https://bytedance.larkoffice.com/docx/FSqgdvs3co71E1xspsjc7XXan3f" target="_blank" rel="noopener noreferrer">
                    <Button kind={KIND.tertiary} size={SIZE.compact}>
                        Help
                    </Button>
                </Link>
            </Block>
        </Block>
    );
};

export default Setting;
