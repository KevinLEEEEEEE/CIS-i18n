import React, { useEffect, useState } from 'react';
import { emit, on } from '@create-figma-plugin/utilities';

import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { Client as Styletron } from 'styletron-engine-monolithic';
import { Provider as StyletronProvider } from 'styletron-react';
import { LightTheme, DarkTheme, BaseProvider } from 'baseui';
import { toaster, ToasterContainer } from 'baseui/toast';
import './global.css';

import Toolbox from './components/toolbox';
import Setting from './components/setting';
import Help from './components/help';
import { registerTrackingHandlers } from './tracking';

import {
  ReceiveLocalStorageHandler,
  RequestLocalStorageHandler,
  SetLocalStorageHandler,
  ShowToastHandler,
  StorageKey,
  ToastType,
} from '../types';

const engine = new Styletron();
let channel = 0;

const App = () => {
  const navigate = useNavigate();

  // 处理返回的设置
  useEffect(() => {
    console.info('[App] Step: mount effect start');
    const currChannel = ++channel;
    registerTrackingHandlers();

    const devMode = process.env.NODE_ENV === 'development';
    if (devMode) {
      navigate('/help');
    }

    const handleReturnSetting = (objs: { key: StorageKey; value: boolean }[]) => {
      if (currChannel !== channel || objs.length === 0) {
        return;
      }
      if (devMode) {
        return;
      }

      const { key, value } = objs[0];

      if (key === StorageKey.isFirstOpen) {
        if (value === true) {
          // 如果是首次打开，设置标记并导航到 /help
          emit<SetLocalStorageHandler>('SET_LOCAL_STORAGE', [{ key: StorageKey.isFirstOpen, value: false }]);
          console.info('[App] Step: navigate /help');
          navigate('/help');
        } else {
          // 如果不是首次打开，导航到 /
          console.info('[App] Step: navigate /');
          navigate('/');
        }
      }
    };

    const handleShowToast = (type: ToastType, message: string) => {
      if (currChannel !== channel) {
        return;
      }

      switch (type) {
        case ToastType.Info:
          toaster.info(message);
          break;
        case ToastType.Positive:
          toaster.positive(message);
          break;
        case ToastType.Warning:
          toaster.warning(message);
          break;
        case ToastType.Negative:
          toaster.negative(message);
          break;
        default:
          console.error(`Undefined ToastType: ${type}`);
      }
    };

    // 监听 RETURN_SETTING 事件
    console.info('[App] Step: listeners registered');
    on<ReceiveLocalStorageHandler>('RECEIVE_LOCAL_STORAGE', handleReturnSetting);
    on<ShowToastHandler>('SHOW_TOAST', handleShowToast);

    // 请求本地存储
    console.info('[App] Step: request local storage isFirstOpen');
    emit<RequestLocalStorageHandler>('REQUEST_LOCAL_STORAGE', {
      key: [StorageKey.isFirstOpen],
    });
    emit<any>('REQUEST_INIT_TRACKING');
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Toolbox />} />
      <Route path="/setting" element={<Setting />} />
      <Route path="/help" element={<Help />} />
    </Routes>
  );
};

const AppWrapper = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => {
      const figmaDark = document.body.classList.contains('figma-dark');
      setIsDark(figmaDark || mql.matches);
    };
    update();
    const handleChange = () => update();
    mql.addEventListener('change', handleChange);
    const mo = new MutationObserver(handleChange);
    mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => {
      mql.removeEventListener('change', handleChange);
      mo.disconnect();
    };
  }, []);

  return (
    <StyletronProvider value={engine}>
      <BaseProvider theme={isDark ? DarkTheme : LightTheme}>
        <MemoryRouter>
          <App />
          <ToasterContainer
            autoHideDuration={2000}
            overrides={{
              Root: {
                style: {
                  zIndex: 9999,
                },
              },
            }}
          />
        </MemoryRouter>
      </BaseProvider>
    </StyletronProvider>
  );
};

export default AppWrapper;
