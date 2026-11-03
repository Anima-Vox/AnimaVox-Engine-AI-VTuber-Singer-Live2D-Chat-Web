import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

// 自托管字体（不依赖外网）：佳尹的台词用霞鹜文楷
import 'lxgw-wenkai-webfont/lxgwwenkai-regular.css';
import './styles/index.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('找不到 #root 挂载节点');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
