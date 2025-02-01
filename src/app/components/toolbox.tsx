import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { emit, on } from '@create-figma-plugin/utilities';
import fetchJsonp from 'fetch-jsonp';

import { Block } from 'baseui/block';
import { Button, KIND, SIZE } from 'baseui/button';
import { FormControl } from 'baseui/form-control';
import { Select, Value } from 'baseui/select';
import { toaster } from 'baseui/toast';
import { Spinner } from 'baseui/spinner';
import { LabelMedium } from 'baseui/typography';

import {
    ResizeWindowHandler,
    AjaxRequestHandler,
    AjaxResponseHandler,
    StylelintHandler,
    TranslateHandler,
    Language,
    DisplayMode,
    Platform,
    RequestLocalStorageHandler,
    StorageKey,
    ReceiveLocalStorageHandler,
    SetLocalStorageHandler,
    ShowProcessingLayerHandler,
    HideProcessingLayerHandler,
    UpdateTotalTasksHandler,
    TaskCompleteHandler,
    ClearTasksHandler,
} from '../../types';

let channel = 0;

const Toolbox = () => {
    const [selectedLang, setSelectedLang] = useState<Value>([{ id: Language.EN }]);
    const [selectedDisplayMode, setSelectedDisplayMode] = useState<Value>([{ id: DisplayMode.Duplicate }]);
    const [selectedPlatform, setSelectedPlatform] = useState<Value>([{ id: Platform.Desktop }]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [currentStep, setCurrentStep] = useState<number>(0);
    const [totalSteps, setTotalSteps] = useState<number>(0);

    // 初始化时更新窗口大小并读取设置
    useEffect(() => {
        emit<ResizeWindowHandler>('RESIZE_WINDOW', { width: 360, height: 396 });
        emit<RequestLocalStorageHandler>('REQUEST_LOCAL_STORAGE', {
            key: [StorageKey.TargetLanguage, StorageKey.DisplayMode, StorageKey.Platform],
        });
    }, []);

    useEffect(() => {
        const currChannel = ++channel;

        const handleRequest = async ({ url, messageID }) => {
            if (currChannel !== channel) return;

            const response = await fetchJsonp(url, {
                timeout: 15000,
            })
                .then((response) => response.json())
                .catch((error) => {
                    console.error('JSONP request failed:', error);
                    emit<AjaxResponseHandler>('AJAX_RESPONSE', { isSuccessful: false, messageID });
                });

            // 处理成功的响应
            emit<AjaxResponseHandler>('AJAX_RESPONSE', { isSuccessful: true, data: response, messageID });
        };

        const handleReceiveLocalStorage = (objs: { key: StorageKey; value: string | number }[]) => {
            if (currChannel !== channel) return;

            objs.forEach(({ key, value }) => {
                const updateMap = {
                    [StorageKey.TargetLanguage]: () => setSelectedLang([{ id: value }]),
                    [StorageKey.DisplayMode]: () => setSelectedDisplayMode([{ id: value }]),
                    [StorageKey.Platform]: () => setSelectedPlatform([{ id: value }]),
                };

                if (value && updateMap[key]) {
                    updateMap[key]();
                    console.log(`[Interface] Update key: ${key}, value: ${value}`);
                }
            });
        };

        const showProcessingLayer = () => {
            if (currChannel !== channel) return;
            setIsLoading(true);
        }

        const hideProcessingLayer = () => {
            if (currChannel !== channel) return;
            setIsLoading(false);
        }

        const handleUpdateTotalTasks = (total: number) => {
            if (currChannel !== channel) return;
            setTotalSteps(total);
        };

        const handleTaskComplete = () => {
            if (currChannel !== channel) return;
            setCurrentStep((prevStep) => prevStep + 1);
        };

        const handleClearTasks = () => {
            if (currChannel !== channel) return;
            setTotalSteps(0);
            setCurrentStep(0);
        };

        on<ReceiveLocalStorageHandler>('RECEIVE_LOCAL_STORAGE', handleReceiveLocalStorage);
        on<AjaxRequestHandler>('AJAX_REQUEST', handleRequest);
        on<ShowProcessingLayerHandler>('SHOW_PROCESSING_LAYER', showProcessingLayer);
        on<HideProcessingLayerHandler>('HIDE_PROCESSING_LAYER', hideProcessingLayer);
        on<UpdateTotalTasksHandler>('UPDATE_TOTAL_TASKS', handleUpdateTotalTasks);
        on<TaskCompleteHandler>('TASK_COMPLETE', handleTaskComplete);
        on<ClearTasksHandler>('CLEAR_TASKS', handleClearTasks);
    }, []);

    // 处理目标语言变化
    const handleTargetLangChange = useCallback((value: Value) => {
        setSelectedLang(value);
        emit<SetLocalStorageHandler>('SET_LOCAL_STORAGE', [
            { key: StorageKey.TargetLanguage, value: value[0].id.toString() },
        ]);
        toaster.info('Target language updated');
    }, []);

    // 处理显示模式变化
    const handleDisplayModeChange = useCallback((value: Value) => {
        setSelectedDisplayMode(value);
        emit<SetLocalStorageHandler>('SET_LOCAL_STORAGE', [{ key: StorageKey.DisplayMode, value: value[0].id.toString() }]);
        toaster.info('Result updated');
    }, []);

    // 处理平台变化
    const handlePlatformChange = useCallback((value: Value) => {
        setSelectedPlatform(value);
        emit<SetLocalStorageHandler>('SET_LOCAL_STORAGE', [{ key: StorageKey.Platform, value: value[0].id.toString() }]);
        toaster.info('Platform updated');
    }, []);

    // 处理 Stylelint 按钮点击
    const handleStylelintClick = () => {
        // setIsLoading(true); // 显示蒙层
        emit<StylelintHandler>('STYLELINT');
    };

    // 处理 Translate 按钮点击
    const handleTranslateClick = () => {
        // setIsLoading(true); // 显示蒙层
        emit<TranslateHandler>('TRANSLATE');
    };

    return (
        <Block paddingLeft="16px" paddingRight="16px" paddingTop="8px" paddingBottom="8px">
            {isLoading && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'rgba(255, 255, 255, 0.80)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 1,
                        backdropFilter: 'blur(6px)', // 添加高斯模糊效果
                    }}
                >
                    <Spinner />
                    <div style={{ marginTop: '16px', marginBottom: '24px' }}>
                        <LabelMedium>
                            {currentStep > 0 ? `Processing... ${currentStep}/${totalSteps}` : 'Preparing...'}
                        </LabelMedium>
                    </div>
                </div>
            )}

            <FormControl label="Target language">
                <Select
                    clearable={false}
                    options={[
                        { label: 'English', id: Language.EN },
                        { label: 'Chinese', id: Language.ZH },
                    ]}
                    value={selectedLang}
                    placeholder="Please select"
                    onChange={({ value }) => handleTargetLangChange(value)}
                />
            </FormControl>

            <FormControl label="Result">
                <Select
                    clearable={false}
                    options={[
                        { label: 'Display on new frame', id: DisplayMode.Duplicate },
                        { label: 'Replace source text', id: DisplayMode.Replace },
                    ]}
                    value={selectedDisplayMode}
                    placeholder="Please select"
                    onChange={({ value }) => handleDisplayModeChange(value)}
                />
            </FormControl>

            <FormControl label="Platform">
                <Select
                    clearable={false}
                    options={[
                        { label: 'Desktop', id: Platform.Desktop },
                        { label: 'Mobile', id: Platform.Mobile },
                    ]}
                    value={selectedPlatform}
                    placeholder="Please select"
                    onChange={({ value }) => handlePlatformChange(value)}
                />
            </FormControl>

            <Block display="flex" paddingTop="16px" style={{ gap: '8px' }}>
                <Button style={{ flex: '1' }} onClick={handleStylelintClick} kind={KIND.secondary}>
                    Fotmat
                </Button>
                <Button style={{ flex: '2' }} onClick={handleTranslateClick}>
                    Translate
                </Button>
            </Block>

            <Block display="flex" justifyContent="center" alignItems="center" paddingTop="8px">
                <Link to="/setting">
                    <Button kind={KIND.tertiary} size={SIZE.compact}>
                        Setting
                    </Button>
                </Link>
                <Link to="https://bytedance.larkoffice.com/docx/FSqgdvs3co71E1xspsjc7XXan3f" target="_blank" rel="noopener noreferrer">
                    <Button kind={KIND.tertiary} size={SIZE.compact}>
                        Help
                    </Button>
                </Link>
            </Block>
        </Block>
    );
};

export default Toolbox;
