import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { ParagraphMedium } from 'baseui/typography';
import { Modal, ModalHeader, ModalBody, ModalFooter, ModalButton } from 'baseui/modal';

import {
    GoogleAccessTokenSuccessHandler,
    ReceiveLocalStorageHandler,
    RequestLocalStorageHandler,
    ResizeWindowHandler,
    SetAccessTokenHandler,
    SetLocalStorageHandler,
    StorageKey,
    SwitchMode,
    TranslationModal,
} from '../../types';
import { googleOauthClientID } from '../../../config';

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
    const [isGoogleAdvancedDisabled, setIsGoogleAdvancedDisabled] = useState(true);
    const navigate = useNavigate();
    const inputRef = useRef<HTMLInputElement>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const redirectUri = 'urn:ietf:wg:oauth:2.0:oob';
    const scope = 'https://www.googleapis.com/auth/cloud-translation https://www.googleapis.com/auth/cloud-platform';
    const authEndpoint = 'https://accounts.google.com/o/oauth2/v2/auth';

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
                StorageKey.GoogleAccessToken
            ],
        });
    }, []);

    useEffect(() => {
        const handleReceiveLocalStorage = (objs: { key: StorageKey; value: string | SwitchMode }[]) => {
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
                    [StorageKey.GoogleAccessToken]: () => setIsGoogleAdvancedDisabled(value === ''),
                };

                if (value && updateMap[key]) {
                    updateMap[key]();
                    console.log(`[Interface] Update key: ${key}, value: ${value}`);
                }
            });
        };

        const unsubscribeReceiveLocalStorage = on<ReceiveLocalStorageHandler>('RECEIVE_LOCAL_STORAGE', handleReceiveLocalStorage);

        return () => {
            unsubscribeReceiveLocalStorage();
        }
    }, []);

    useEffect(() => {
        const unsubscribeGoogleAccessTokenSuccess = on<GoogleAccessTokenSuccessHandler>('GOOGLE_ACCESS_TOKEN_SUCCESS', handleGoogleAccessTokenSuccess);

        return () => {
            unsubscribeGoogleAccessTokenSuccess();
        }
    }, [selectedTransModal]);


    const handleGoogleAccessTokenSuccess = () => {
        if (selectedTransModal[0].id !== TranslationModal.GoogleAdvanced) {
            setIsModalOpen(true);
        }

        console.log('Updated selectedTransModal:', selectedTransModal);
    };

    const handleConfirmChange = () => {
        setSelectedTransModal([{ id: TranslationModal.GoogleAdvanced }]);
        setActiveTab(0); // 跳转到第一个 Tab
        setIsModalOpen(false);
    };

    const handleCancelChange = () => {
        setIsModalOpen(false);
    };

    const handleAuthClick = () => {
        const authUrl = `${authEndpoint}?response_type=code&client_id=${googleOauthClientID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;

        // 打开新窗口进行授权
        window.open(authUrl, '_blank', 'width=500,height=600');
    };

    // 添加处理输入框中授权码的函数
    const handleAuthCodeSubmit = async () => {
        const inputElement = document.getElementById('authCodeInput') as HTMLInputElement;
        const code = inputElement.value;

        if (code) {
            emit<SetAccessTokenHandler>('SET_ACCESS_TOKEN', code);
        } else {
            console.error('[Error] Authorization code is empty');
            toaster.negative('Authorization code is empty. Please enter a valid code.');
        }
    };

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
                                    { label: 'GoogleAdvanced', id: TranslationModal.GoogleAdvanced, disabled: isGoogleAdvancedDisabled },
                                    { label: 'GoogleBasic', id: TranslationModal.GoogleBasic },
                                    { label: 'GoogleFree', id: TranslationModal.GoogleFree },
                                    { label: 'Baidu', id: TranslationModal.Baidu },
                                ]}
                                value={selectedTransModal}
                                placeholder="Please select"
                                onChange={({ value }) => handleTransModalChange(value)}
                                onFocus={() => {
                                    emit<RequestLocalStorageHandler>('REQUEST_LOCAL_STORAGE', {
                                        key: [StorageKey.GoogleAccessToken],
                                    });
                                }}
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

                <Tab title="Google Oauth">
                    <Block style={{ height: 328 }}>
                        <ParagraphMedium marginTop="0px" marginBottom="12px">
                            Step 1: Please click the "Authorize with Google" button to authorize.
                        </ParagraphMedium>

                        <Button
                            onClick={handleAuthClick}
                            kind={KIND.secondary}
                            overrides={{ BaseButton: { style: { width: '100%' } } }}
                        >
                            Authorize with Google
                        </Button>

                        <ParagraphMedium marginBottom="12px">
                            Step 2: Paste authorization code here and click Submit Code button.
                        </ParagraphMedium>

                        <Block display="flex" flexDirection="column" width="100%">
                            <Input
                                inputRef={inputRef}
                                id="authCodeInput"
                                placeholder="Enter authorization code"
                                overrides={{
                                    Input: {
                                        style: {
                                            width: '100%',
                                            // height: '120px', // 设置固定高度为 120px
                                        },
                                    },
                                }}
                            />
                            <Button
                                onClick={handleAuthCodeSubmit} // 调用的函数
                                kind={KIND.secondary}
                                overrides={{ BaseButton: { style: { marginTop: '8px', width: '100%' } } }}
                            >
                                Submit Code
                            </Button>
                        </Block>
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

            <Modal onClose={handleCancelChange} isOpen={isModalOpen}>
                <ModalHeader>Change Translation Model</ModalHeader>
                <ModalBody>
                    Google access token configured successfully. Do you want to switch the translation model to Google Advanced?
                </ModalBody>
                <ModalFooter>
                    <ModalButton kind={KIND.tertiary} onClick={handleCancelChange}>
                        Cancel
                    </ModalButton>
                    <ModalButton onClick={handleConfirmChange}>
                        Confirm
                    </ModalButton>
                </ModalFooter>
            </Modal>
        </Block>


    );
};

export default Setting;
