import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ProtoTokensProvider } from './theme/ProtoTokens.tsx';
import { ThemeProvider } from './theme/ThemeProvider.tsx';
import { AppShell } from './app/AppShell.tsx';

const el = document.getElementById('root');
if (!el) throw new Error('#root is missing from index.html');

createRoot(el).render(
  <StrictMode>
    {/* Outside the theme provider on purpose: the palette switches have to reach
        antd's ConfigProvider, and that lives inside ThemeProvider. */}
    <ProtoTokensProvider>
      <ThemeProvider>
        <AppShell />
      </ThemeProvider>
    </ProtoTokensProvider>
  </StrictMode>,
);
