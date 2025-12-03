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
import { LabelMedium, LabelSmall } from 'baseui/typography';
import './overlay.css';

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
    UpdateStageTotalsHandler,
    StageStepCompleteHandler,
} from '../../types';

const Toolbox = () => {
    const [selectedLang, setSelectedLang] = useState<Value>([{ id: Language.EN }]);
    const [selectedDisplayMode, setSelectedDisplayMode] = useState<Value>([{ id: DisplayMode.Duplicate }]);
    const [selectedPlatform, setSelectedPlatform] = useState<Value>([{ id: Platform.Desktop }]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [currentStep, setCurrentStep] = useState<number>(0);
    const [totalSteps, setTotalSteps] = useState<number>(0);
    const [translateDone, setTranslateDone] = useState<number>(0);
    const [translateTotal, setTranslateTotal] = useState<number>(0);
    const [polishDone, setPolishDone] = useState<number>(0);
    const [polishTotal, setPolishTotal] = useState<number>(0);
    const [formatDone, setFormatDone] = useState<number>(0);
    const [formatTotal, setFormatTotal] = useState<number>(0);
    const [autoPolish, setAutoPolish] = useState<boolean>(true);
    const [autoStylelint, setAutoStylelint] = useState<boolean>(true);

    // 初始化时更新窗口大小并读取设置
    useEffect(() => {
        emit<ResizeWindowHandler>('RESIZE_WINDOW', { width: 360, height: 396 });
        emit<RequestLocalStorageHandler>('REQUEST_LOCAL_STORAGE', {
            key: [StorageKey.TargetLanguage, StorageKey.DisplayMode, StorageKey.Platform, StorageKey.AutoPolishing, StorageKey.AutoStylelintMode],
        });
    }, []);

    useEffect(() => {
        const handleRequest = async ({ url, messageID }) => {
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
            objs.forEach(({ key, value }) => {
                const updateMap = {
                    [StorageKey.TargetLanguage]: () => setSelectedLang([{ id: value }]),
                    [StorageKey.DisplayMode]: () => setSelectedDisplayMode([{ id: value }]),
                    [StorageKey.Platform]: () => setSelectedPlatform([{ id: value }]),
                    [StorageKey.AutoPolishing]: () => setAutoPolish(String(value) === 'on'),
                    [StorageKey.AutoStylelintMode]: () => setAutoStylelint(String(value) === 'on'),
                };

                if (value && updateMap[key]) {
                    updateMap[key]();
                    console.log(`[Interface] Update key: ${key}, value: ${value}`);
                }
            });
        };

        const showProcessingLayer = () => {
            setIsLoading(true);
        }

        const hideProcessingLayer = () => {
            setIsLoading(false);
        }

        const handleUpdateTotalTasks = (total: number) => {
            setTotalSteps(total);
        };

        const handleTaskComplete = () => {
            setCurrentStep((prevStep) => prevStep + 1);
        };

        const handleUpdateStageTotals = (stage: 'translate' | 'polish' | 'format', total: number) => {
            if (stage === 'translate') setTranslateTotal(total)
            if (stage === 'polish') setPolishTotal(total)
            if (stage === 'format') setFormatTotal(total)
        }

        const handleStageStepComplete = (stage: 'translate' | 'polish' | 'format', done: number) => {
            if (stage === 'translate') setTranslateDone(done)
            if (stage === 'polish') setPolishDone(done)
            if (stage === 'format') setFormatDone(done)
        }

        const handleClearTasks = () => {
            setTotalSteps(0);
            setCurrentStep(0);
        };

        const unsubscribeReceiveLocalStorage = on<ReceiveLocalStorageHandler>('RECEIVE_LOCAL_STORAGE', handleReceiveLocalStorage);
        const unsubscribeAjaxRequest = on<AjaxRequestHandler>('AJAX_REQUEST', handleRequest);
        const unsubscribeShowProcessingLayer = on<ShowProcessingLayerHandler>('SHOW_PROCESSING_LAYER', showProcessingLayer);
        const unsubscribeHideProcessingLayer = on<HideProcessingLayerHandler>('HIDE_PROCESSING_LAYER', hideProcessingLayer);
        const unsubscribeUpdateTotalTasks = on<UpdateTotalTasksHandler>('UPDATE_TOTAL_TASKS', handleUpdateTotalTasks);
        const unsubscribeTaskComplete = on<TaskCompleteHandler>('TASK_COMPLETE', handleTaskComplete);
        const unsubscribeUpdateStageTotals = on<UpdateStageTotalsHandler>('UPDATE_STAGE_TOTALS', handleUpdateStageTotals);
        const unsubscribeStageStepComplete = on<StageStepCompleteHandler>('STAGE_STEP_COMPLETE', handleStageStepComplete);
        const unsubscribeClearTasks = on<ClearTasksHandler>('CLEAR_TASKS', handleClearTasks);

        return () => {
            unsubscribeReceiveLocalStorage();
            unsubscribeAjaxRequest();
            unsubscribeShowProcessingLayer();
            unsubscribeHideProcessingLayer();
            unsubscribeUpdateTotalTasks();
            unsubscribeTaskComplete();
            unsubscribeUpdateStageTotals();
            unsubscribeStageStepComplete();
            unsubscribeClearTasks();
        };
    }, []);

    // 处理目标语言变化
    const handleTargetLangChange = useCallback((value: Value) => {
        setSelectedLang(value);
        emit<SetLocalStorageHandler>('SET_LOCAL_STORAGE', [
            { key: StorageKey.TargetLanguage, value: value[0].id.toString() },
        ]);
        toaster.info('Target language set');
    }, []);

    // 处理显示模式变化
    const handleDisplayModeChange = useCallback((value: Value) => {
        setSelectedDisplayMode(value);
        emit<SetLocalStorageHandler>('SET_LOCAL_STORAGE', [{ key: StorageKey.DisplayMode, value: value[0].id.toString() }]);
        toaster.info('Display mode set');
    }, []);

    // 处理平台变化
    const handlePlatformChange = useCallback((value: Value) => {
        setSelectedPlatform(value);
        emit<SetLocalStorageHandler>('SET_LOCAL_STORAGE', [{ key: StorageKey.Platform, value: value[0].id.toString() }]);
        toaster.info('Platform set');
    }, []);

    // 处理 Stylelint 按钮点击
    const handleStylelintClick = () => {
        emit<StylelintHandler>('STYLELINT');
    };

    // 处理 Translate 按钮点击
    const handleTranslateClick = () => {
        emit<TranslateHandler>('TRANSLATE');
    };

    return (
        <Block paddingLeft="16px" paddingRight="16px" paddingTop="8px" paddingBottom="8px">
            {isLoading && (
                <div className="processing-layer">
                    <Spinner />
                    <div className="status">
                        <LabelMedium className="status-main">
                            {currentStep > 0 ? `Processing ${currentStep} of ${totalSteps}` : 'Preparing…'}
                        </LabelMedium>
                        <LabelSmall className="status-sub">
                            {`Translating ${translateDone} of ${translateTotal}`}
                        </LabelSmall>
                        {autoPolish && (
                            <LabelSmall className="status-sub">
                                {`Polishing ${polishDone} of ${polishTotal}`}
                            </LabelSmall>
                        )}
                        {autoStylelint && (
                            <LabelSmall className="status-sub">
                                {`Formatting ${formatDone} of ${formatTotal}`}
                            </LabelSmall>
                        )}
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
                    placeholder="Select…"
                    onChange={({ value }) => handleTargetLangChange(value)}
                />
            </FormControl>

            <FormControl label="Display mode">
                <Select
                    clearable={false}
                    options={[
                        { label: 'Display in a new frame', id: DisplayMode.Duplicate },
                        { label: 'Replace the source text', id: DisplayMode.Replace },
                    ]}
                    value={selectedDisplayMode}
                    placeholder="Select…"
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
                    placeholder="Select…"
                    onChange={({ value }) => handlePlatformChange(value)}
                />
            </FormControl>

            <Block display="flex" paddingTop="16px" style={{ gap: '8px' }}>
                <Button style={{ flex: '1' }} onClick={handleStylelintClick} kind={KIND.secondary}>
                    Format
                </Button>
                <Button style={{ flex: '2' }} onClick={handleTranslateClick}>
                    Translate
                </Button>
            </Block>

            <Block display="flex" justifyContent="center" alignItems="center" paddingTop="8px">
                <Link to="/setting">
                    <Button kind={KIND.tertiary} size={SIZE.compact}>
                        Settings
                    </Button>
                </Link>
                <Link to="https://bytedance.larkoffice.com/docx/FSqgdvs3co71E1xspsjc7XXan3f#share-KDSAd12zMojjdlxDP1KcC0EGned" target="_blank" rel="noopener noreferrer">
                    <Button kind={KIND.tertiary} size={SIZE.compact}>
                        Help
                    </Button>
                </Link>
            </Block>
        </Block>
    );
};

export default Toolbox;
