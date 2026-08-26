import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from './theme/ThemeProvider.tsx';
import { AppShell } from './app/AppShell.tsx';

const el = document.getElementById('root');
if (!el) throw new Error('#root is missing from index.html');

createRoot(el).render(
  <StrictMode>
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  </StrictMode>,
);
