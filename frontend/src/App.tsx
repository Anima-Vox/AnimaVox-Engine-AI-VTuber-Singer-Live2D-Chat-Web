import { useCallback } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { DiagnosticsPage } from './components/diagnostics/DiagnosticsPage';
import { AppShell } from './components/layout/AppShell';
import { AtmosphereBackground } from './components/layout/AtmosphereBackground';
import { SetupWizard } from './components/onboarding/SetupWizard';
import { WelcomeScreen } from './components/onboarding/WelcomeScreen';
import { SETTINGS_KEYS } from './constants/settingsKeys';
import { setSetting } from './db/repositories/settingsRepository';
import { useAppBootstrap } from './hooks/useAppBootstrap';
import { useUiStore } from './stores/uiStore';

/** 首屏加载遮罩 */
function BootVeil() {
  return (
    <div className="relative grid h-full place-items-center">
      <AtmosphereBackground />
      <p
        className="animate-fade-in font-display text-lg text-ink-soft"
        role="status"
        aria-live="polite"
      >
        正在唤醒角色…
      </p>
    </div>
  );
}

/** 首屏分流：欢迎页 → 3 步向导 → 聊天主界面 */
function RootView() {
  const { ready, error, retry } = useAppBootstrap();
  const view = useUiStore((state) => state.view);
  const setView = useUiStore((state) => state.setView);

  const handleStart = useCallback(async () => {
    setView('wizard');
    await setSetting(SETTINGS_KEYS.onboardingStarted, 'true');
  }, [setView]);

  if (error) {
    return (
      <div className="relative grid h-full place-items-center px-6">
        <AtmosphereBackground />
        <div className="glass-panel relative rounded-panel p-6 text-center">
          <p role="alert" className="text-sm text-ink-deep">
            无法读取本地数据：{error}
          </p>
          <button
            type="button"
            onClick={retry}
            className="mt-4 rounded-full bg-pink px-5 py-2 text-sm text-white"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  if (!ready) {
    return <BootVeil />;
  }

  if (view === 'welcome') {
    return <WelcomeScreen onStart={() => void handleStart()} />;
  }

  if (view === 'wizard') {
    return <SetupWizard />;
  }

  return <AppShell />;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<RootView />} />
      <Route path="/diagnostics" element={<DiagnosticsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
