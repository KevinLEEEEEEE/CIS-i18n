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
import './setting.css';

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
            toaster.negative('Authorization code is required, please enter a valid code');
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

    const [editingGoogleKey, setEditingGoogleKey] = useState(false);
    const [editingBaiduAppID, setEditingBaiduAppID] = useState(false);
    const [editingBaiduKey, setEditingBaiduKey] = useState(false);
    const [editingCozeKey, setEditingCozeKey] = useState(false);

    const googleMaskTimer = useRef<any>(null);
    const baiduAppIdMaskTimer = useRef<any>(null);
    const baiduKeyMaskTimer = useRef<any>(null);
    const cozeMaskTimer = useRef<any>(null);
    const googlePrevRef = useRef<string>('');
    const baiduAppIdPrevRef = useRef<string>('');
    const baiduKeyPrevRef = useRef<string>('');
    const cozePrevRef = useRef<string>('');

    const maskLast8 = (value: string) => {
        if (!value) return '';
        const len = value.length;
        if (len <= 8) return '********';
        return value.slice(0, len - 8) + '********';
    };


    return (
        <Block>
            <Tabs activeKey={activeTab} onChange={({ activeKey }) => setActiveTab(activeKey)} activateOnFocus>
                <Tab title="General">
                    <Block className="tab-content" style={{ height: 320 }}>
                        <FormControl label="Translation provider">
                            <Select
                                clearable={false}
                                options={[
                                    { label: 'Google (Advanced)', id: TranslationModal.GoogleAdvanced, disabled: isGoogleAdvancedDisabled },
                                    { label: 'Google (Basic)', id: TranslationModal.GoogleBasic },
                                    { label: 'Google (Free)', id: TranslationModal.GoogleFree },
                                    { label: 'Baidu', id: TranslationModal.Baidu },
                                ]}
                                value={selectedTransModal}
                                placeholder="Select…"
                                onChange={({ value }) => handleTransModalChange(value)}
                                onFocus={() => {
                                    emit<RequestLocalStorageHandler>('REQUEST_LOCAL_STORAGE', {
                                        key: [StorageKey.GoogleAccessToken],
                                    });
                                }}
                            />
                        </FormControl>

                        <FormControl label="Glossary">
                            <RadioGroup
                                value={termbase}
                                onChange={(e) => handleTermbaseChange(e.currentTarget.value)}
                                align={ALIGN.horizontal}
                            >
                                <Radio value="on">On</Radio>
                                <Radio value="off">Off</Radio>
                            </RadioGroup>
                        </FormControl>

                        <FormControl label="Auto‑polish">
                            <RadioGroup
                                value={autoPolishing}
                                onChange={(e) => handleAutoPolishingChange(e.currentTarget.value)}
                                align={ALIGN.horizontal}
                            >
                                <Radio value="on">On</Radio>
                                <Radio value="off">Off</Radio>
                            </RadioGroup>
                        </FormControl>

                        <FormControl label="Auto‑format">
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

                <Tab title="API Keys">
                    <Block className="tab-content" style={{ height: 320 }}>
                        <FormControl label="Google">
                            <Input
                                value={editingGoogleKey ? googleAPIKey : maskLast8(googleAPIKey)}
                                placeholder={'Enter Google API key'}
                                onFocus={() => {
                                    googlePrevRef.current = googleAPIKey;
                                    setEditingGoogleKey(true);
                                    setGoogleAPIKey('');
                                }}
                                onBlur={() => {
                                    setEditingGoogleKey(false);
                                    if (!googleAPIKey) {
                                        setGoogleAPIKey(googlePrevRef.current);
                                    }
                                }}
                                onChange={(e: any) => {
                                    setGoogleAPIKey(e.target.value);
                                    if (googleMaskTimer.current) clearTimeout(googleMaskTimer.current);
                                    googleMaskTimer.current = setTimeout(() => setEditingGoogleKey(false), 2000);
                                }}
                                clearOnEscape
                            />
                        </FormControl>

                        <FormControl label="Baidu">
                            <Block style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <Input
                                    value={editingBaiduAppID ? baiduAppID : maskLast8(baiduAppID)}
                                    placeholder={'Enter Baidu App ID'}
                                    onFocus={() => {
                                        baiduAppIdPrevRef.current = baiduAppID;
                                        setEditingBaiduAppID(true);
                                        setBaiduAppID('');
                                    }}
                                    onBlur={() => {
                                        setEditingBaiduAppID(false);
                                        if (!baiduAppID) {
                                            setBaiduAppID(baiduAppIdPrevRef.current);
                                        }
                                    }}
                                    onChange={(e: any) => {
                                        setBaiduAppID(e.target.value);
                                        if (baiduAppIdMaskTimer.current) clearTimeout(baiduAppIdMaskTimer.current);
                                        baiduAppIdMaskTimer.current = setTimeout(() => setEditingBaiduAppID(false), 2000);
                                    }}
                                    clearOnEscape
                                />
                                <Input
                                    value={editingBaiduKey ? baiduKey : maskLast8(baiduKey)}
                                    placeholder={'Enter Baidu API key'}
                                    onFocus={() => {
                                        baiduKeyPrevRef.current = baiduKey;
                                        setEditingBaiduKey(true);
                                        setBaiduKey('');
                                    }}
                                    onBlur={() => {
                                        setEditingBaiduKey(false);
                                        if (!baiduKey) {
                                            setBaiduKey(baiduKeyPrevRef.current);
                                        }
                                    }}
                                    onChange={(e: any) => {
                                        setBaiduKey(e.target.value);
                                        if (baiduKeyMaskTimer.current) clearTimeout(baiduKeyMaskTimer.current);
                                        baiduKeyMaskTimer.current = setTimeout(() => setEditingBaiduKey(false), 2000);
                                    }}
                                    clearOnEscape
                                />
                            </Block>
                        </FormControl>

                        <FormControl label="Coze">
                            <Input
                                value={editingCozeKey ? cozeAPIKey : maskLast8(cozeAPIKey)}
                                placeholder={'Enter Coze API key'}
                                onFocus={() => {
                                    cozePrevRef.current = cozeAPIKey;
                                    setEditingCozeKey(true);
                                    setCozeAPIKey('');
                                }}
                                onBlur={() => {
                                    setEditingCozeKey(false);
                                    if (!cozeAPIKey) {
                                        setCozeAPIKey(cozePrevRef.current);
                                    }
                                }}
                                onChange={(e: any) => {
                                    setCozeAPIKey(e.target.value);
                                    if (cozeMaskTimer.current) clearTimeout(cozeMaskTimer.current);
                                    cozeMaskTimer.current = setTimeout(() => setEditingCozeKey(false), 2000);
                                }}
                                clearOnEscape
                            />
                        </FormControl>
                    </Block>
                </Tab>

                <Tab title="Google OAuth">
                    <Block className="tab-content" style={{ height: 328 }}>
                        <ParagraphMedium marginTop="0px" marginBottom="12px">
                            Step 1: Click 'Authorize with Google' to finalize sign-in
                        </ParagraphMedium>

                        <Button
                            onClick={handleAuthClick}
                            kind={KIND.secondary}
                            overrides={{ BaseButton: { style: { width: '100%' } } }}
                        >
                            Authorize with Google
                        </Button>

                        <ParagraphMedium marginBottom="12px">
                            Step 2: Paste the authorization code and click "Submit Code"
                        </ParagraphMedium>

                        <Block display="flex" flexDirection="column" width="100%">
                            <Input
                                inputRef={inputRef}
                                id="authCodeInput"
                                placeholder="Paste authorization code"
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
                <Link to="https://bytedance.larkoffice.com/docx/FSqgdvs3co71E1xspsjc7XXan3f#share-KDSAd12zMojjdlxDP1KcC0EGned" target="_blank" rel="noopener noreferrer">
                    <Button kind={KIND.tertiary} size={SIZE.compact}>
                        Help
                    </Button>
                </Link>
            </Block>

            <Modal onClose={handleCancelChange} isOpen={isModalOpen}>
                <ModalHeader>Switch Translation Model</ModalHeader>
                <ModalBody>
                    Google access token configured successfully, switch the translation model to Google Advanced?
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
