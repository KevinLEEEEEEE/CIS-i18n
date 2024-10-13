import React, { useEffect } from 'react';
import { MemoryRouter, Routes, Route, useNavigate } from "react-router-dom";
import { Client as Styletron } from "styletron-engine-monolithic";
import { Provider as StyletronProvider } from "styletron-react";
import { LightTheme, BaseProvider } from "baseui";
import { ToasterContainer } from "baseui/toast";
import './global.css';

import Toolbox from './components/toolbox';
import Setting from './components/setting';
import Help from './components/help';
import { ChangeSettingHandler, ReturnSettingHandler, SettingKey } from '../types';
import { emit, on } from '@create-figma-plugin/utilities';

import './global.css';

const engine = new Styletron();

const App = () => {
  const navigate = useNavigate();

  // 处理返回的设置
  useEffect(() => {
    const handleReturnSetting = ({ key, value }) => {
      if (key === SettingKey.isFirstOpen) {
        if (value === true) {
          // 如果是首次打开，设置标记并导航到 /help
          emit<ChangeSettingHandler>('CHANGE_SETTING', { key: SettingKey.isFirstOpen, value: false });

          navigate('/help');
        } else {
          // 如果不是首次打开，导航到 /
          navigate('/');
        }
      }
    };

    // 监听 RETURN_SETTING 事件
    on<ReturnSettingHandler>('RETURN_SETTING', handleReturnSetting);
  }, []);

  return (
    <ToasterContainer autoHideDuration={2000} >
      <Routes>
        <Route path="/" element={<Toolbox />} />
        <Route path="/setting" element={<Setting />} />
        <Route path="/help" element={<Help />} />
      </Routes>
    </ToasterContainer>
  );
};

const AppWrapper = () => (
  <StyletronProvider value={engine}>
    <BaseProvider theme={LightTheme}>
      <MemoryRouter>
        <App />
      </MemoryRouter>
    </BaseProvider>
  </StyletronProvider>
);

export default AppWrapper;
