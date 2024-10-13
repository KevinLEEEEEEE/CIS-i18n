import React, { useEffect } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { emit, on } from '@create-figma-plugin/utilities';

import { Block } from "baseui/block";
import { Button, KIND, SIZE } from "baseui/button";
import { Tabs, Tab } from "baseui/tabs-motion";
import { FormControl } from "baseui/form-control";
import { Select, Value } from "baseui/select";
import { RadioGroup, Radio, ALIGN } from "baseui/radio";
import { Input } from "baseui/input";

import { ChangeSettingHandler, ReadSettingHandler, ResizeWindowHandler, ReturnSettingHandler, SettingKey, TranslationModal } from '../../types';
import { toaster } from 'baseui/toast';

let channel = 0;

const Setting = () => {
    // 状态管理
    const [activeTab, setActiveTab] = React.useState<React.Key>(0);
    const [selectedTransModal, setSelectedTransModal] = React.useState<Value>([{ id: TranslationModal.GoogleBasic }]);
    const [termbase, setTermbase] = React.useState("on");
    const [autoStylelint, setAutoStylelint] = React.useState("on");
    const [autoPolishing, setAutoPolishing] = React.useState("on");
    const [googleAPIKey, setGoogleAPIKey] = React.useState("");
    const [baiduAPIKey, setBaiduAPIKey] = React.useState("");
    const [baiduPassword, setBaiduPassword] = React.useState("");
    const [cozeAPIKey, setCozeAPIKey] = React.useState("");
    const navigate = useNavigate();

    // 初始化时调整窗口大小
    useEffect(() => {
        emit<ResizeWindowHandler>('RESIZE_WINDOW', { width: 380, height: 513 });
        emit<ReadSettingHandler>('READ_SETTING', { key: SettingKey.TranslationModal });
        emit<ReadSettingHandler>('READ_SETTING', { key: SettingKey.Termbase });
        emit<ReadSettingHandler>('READ_SETTING', { key: SettingKey.AutoStylelintMode });
        emit<ReadSettingHandler>('READ_SETTING', { key: SettingKey.AutoPolishing });
        emit<ReadSettingHandler>('READ_SETTING', { key: SettingKey.GoogleAPIKey });
        emit<ReadSettingHandler>('READ_SETTING', { key: SettingKey.BaiduAPIKey });
        emit<ReadSettingHandler>('READ_SETTING', { key: SettingKey.BaiduPassword });
        emit<ReadSettingHandler>('READ_SETTING', { key: SettingKey.CozeAPIKey });
    }, []);

    useEffect(() => {
        const currChannel = ++channel;

        const handleReturnSetting = ({ key, value }) => {
            if (currChannel == channel) {
                const updateMap = {
                    [SettingKey.TranslationModal]: () => setSelectedTransModal([{ id: value }]),
                    [SettingKey.Termbase]: () => setTermbase(value),
                    [SettingKey.AutoStylelintMode]: () => setAutoStylelint(value),
                    [SettingKey.AutoPolishing]: () => setAutoPolishing(value),
                    [SettingKey.GoogleAPIKey]: () => setGoogleAPIKey(value),
                    [SettingKey.BaiduAPIKey]: () => setBaiduAPIKey(value),
                    [SettingKey.BaiduPassword]: () => setBaiduPassword(value),
                    [SettingKey.CozeAPIKey]: () => setCozeAPIKey(value),
                };

                if (updateMap[key]) {
                    updateMap[key](); // 调用对应的更新函数
                    console.log(`[Update Setting] ${key}: ${value}`);
                }
            }
        };

        on<ReturnSettingHandler>('RETURN_SETTING', handleReturnSetting);
    }, []);

    // 处理自动样式检查的变化
    const handleAutoStylelintChange = (value: string) => {
        setAutoStylelint(value);
    };

    // 处理术语库的变化
    const handleTermbaseChange = (value: string) => {
        setTermbase(value);
    };

    // 处理翻译模式的变化
    const handleTransModalChange = (value: Value) => {
        setSelectedTransModal(value);
    };

    // 处理自动润色变化
    const handleAutoPolishingChange = (value: string) => {
        setAutoPolishing(value);
    };

    // 取消按钮点击处理
    const handleCancelClick = () => {
        navigate('/');
    };

    // 保存按钮点击处理
    const handleSaveClick = () => {
        emit<ChangeSettingHandler>('CHANGE_SETTING', { key: SettingKey.TranslationModal, value: selectedTransModal[0].id.toString() });
        emit<ChangeSettingHandler>('CHANGE_SETTING', { key: SettingKey.Termbase, value: termbase });
        emit<ChangeSettingHandler>('CHANGE_SETTING', { key: SettingKey.AutoStylelintMode, value: autoStylelint });
        emit<ChangeSettingHandler>('CHANGE_SETTING', { key: SettingKey.AutoPolishing, value: autoPolishing });
        emit<ChangeSettingHandler>('CHANGE_SETTING', { key: SettingKey.GoogleAPIKey, value: googleAPIKey });
        emit<ChangeSettingHandler>('CHANGE_SETTING', { key: SettingKey.BaiduAPIKey, value: baiduAPIKey });
        emit<ChangeSettingHandler>('CHANGE_SETTING', { key: SettingKey.BaiduPassword, value: baiduPassword });
        emit<ChangeSettingHandler>('CHANGE_SETTING', { key: SettingKey.CozeAPIKey, value: cozeAPIKey });

        navigate('/');

        toaster.info('Settings saved');
    };

    return (
        <Block>
            <Tabs
                activeKey={activeTab}
                onChange={({ activeKey }) => setActiveTab(activeKey)}
                activateOnFocus
            >
                <Tab title="General">
                    <Block style={{ height: 320 }}>
                        <FormControl label="Translation modal">
                            <Select
                                clearable={false}
                                options={[
                                    { label: "GoogleBasic", id: TranslationModal.GoogleBasic },
                                    { label: "GoogleFree", id: TranslationModal.GoogleFree },
                                    { label: "Baidu", id: TranslationModal.Baidu },
                                ]}
                                value={selectedTransModal}
                                placeholder="Please select"
                                onChange={({ value }) => handleTransModalChange(value)}
                            />
                        </FormControl>

                        <FormControl label="Term base">
                            <RadioGroup
                                value={termbase}
                                onChange={e => handleTermbaseChange(e.currentTarget.value)}
                                align={ALIGN.horizontal}
                            >
                                <Radio value="on">On</Radio>
                                <Radio value="off">Off</Radio>
                            </RadioGroup>
                        </FormControl>

                        <FormControl label="Auto stylelint">
                            <RadioGroup
                                value={autoStylelint}
                                onChange={e => handleAutoStylelintChange(e.currentTarget.value)}
                                align={ALIGN.horizontal}
                            >
                                <Radio value="on">On</Radio>
                                <Radio value="off">Off</Radio>
                            </RadioGroup>
                        </FormControl>

                        <FormControl label="Auto polishing">
                            <RadioGroup
                                value={autoPolishing}
                                onChange={e => handleAutoPolishingChange(e.currentTarget.value)}
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
                        <FormControl label="Google Key">
                            <Input
                                value={googleAPIKey}
                                onChange={e => setGoogleAPIKey(e.target.value)}
                                placeholder="Enter key"
                                clearOnEscape
                            />
                        </FormControl>

                        <FormControl label="Baidu Key">
                            <Block style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <Input
                                    value={baiduAPIKey}
                                    onChange={e => setBaiduAPIKey(e.target.value)}
                                    placeholder="Enter key"
                                    clearOnEscape
                                />
                                <Input
                                    value={baiduPassword}
                                    onChange={e => setBaiduPassword(e.target.value)}
                                    placeholder="Enter password"
                                    clearOnEscape
                                />
                            </Block>
                        </FormControl>

                        <FormControl label="Coze Key">
                            <Input
                                value={cozeAPIKey}
                                onChange={e => setCozeAPIKey(e.target.value)}
                                placeholder="Enter key"
                                clearOnEscape
                            />
                        </FormControl>
                    </Block>
                </Tab>
            </Tabs>

            <Block style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, paddingLeft: 16, paddingRight: 16 }}>
                <Link to="/" style={{ flex: '1' }}>
                    <Button kind={KIND.secondary} onClick={handleCancelClick} style={{ width: '100%' }}>Cancel</Button>
                </Link>
                <Button style={{ flex: '2' }} onClick={handleSaveClick}>Save</Button>
            </Block>

            <Block style={{ display: "flex", justifyContent: "center", alignItems: "center", paddingTop: 8, paddingBottom: 8 }}>
                <Link to="https://www.baidu.com" target="_blank" rel="noopener noreferrer">
                    <Button kind={KIND.tertiary} size={SIZE.compact}>Help</Button>
                </Link>
            </Block>
        </Block>
    );
};

export default Setting;
