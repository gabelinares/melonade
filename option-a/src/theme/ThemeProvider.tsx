import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { App as AntApp, ConfigProvider } from 'antd';
import { ChevronDown } from 'lucide-react';
import { antdTheme, type Mode } from './antd.ts';
import { useAntdOverrides } from './ProtoTokens.tsx';
import '../tokens/tokens.css';
import '../tokens/base.css';
import './antd-overrides.css';

/* Three states, not two: "system" is a real choice and the default one, so the
   toggle cycles through it rather than pretending the user has always picked. */
export type ThemePref = 'light' | 'dark' | 'system';

interface ThemeCtx {
  pref: ThemePref;
  mode: Mode;
  setPref: (p: ThemePref) => void;
  cycle: () => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

const STORAGE_KEY = 'melonade-a-theme';

function readPref(): ThemePref {
  if (typeof localStorage === 'undefined') return 'system';
  const v = localStorage.getItem(STORAGE_KEY);
  return v === 'light' || v === 'dark' ? v : 'system';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>(readPref);
  const [systemDark, setSystemDark] = useState(
    () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches,
  );

  useEffect(() => {
    if (typeof matchMedia === 'undefined') return;
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const mode: Mode = pref === 'system' ? (systemDark ? 'dark' : 'light') : pref;

  /* The CSS layer keys off data-theme on the root; "system" writes nothing so
     the media query in tokens.css is what decides. */
  useEffect(() => {
    const root = document.documentElement;
    if (pref === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', pref);
  }, [pref]);

  const setPref = useCallback((p: ThemePref) => {
    setPrefState(p);
    if (p === 'system') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, p);
  }, []);

  const cycle = useCallback(() => {
    setPref(pref === 'light' ? 'dark' : pref === 'dark' ? 'system' : 'light');
  }, [pref, setPref]);

  const value = useMemo(() => ({ pref, mode, setPref, cycle }), [pref, mode, setPref, cycle]);

  /* The prototype panel's palette switches, resolved for antd. They arrive from
     ABOVE this provider, which is why ProtoTokensProvider wraps it in main.tsx:
     antd has to be re-rendered with real hexes when a colour changes, and the
     stylesheet alone cannot do that. */
  const overrides = useAntdOverrides(mode);

  return (
    <Ctx.Provider value={value}>
      {/* ONE CHEVRON IN THE APP. antd draws its own `DownOutlined` on every
          Select - a thin, wide glyph with sharp corners - beside lucide's
          rounded ones on the nav, the sort headers, the filter menu and the
          version switcher. Set here rather than on seven call sites, so a new
          Select cannot arrive wearing the other one. */}
      <ConfigProvider
        theme={antdTheme(mode, overrides)}
        componentSize="small"
        select={{ suffixIcon: <ChevronDown size={13} strokeWidth={1.75} aria-hidden="true" /> }}
      >
        {/* antd's <App> is what makes modal/message/notification inherit this
            theme. The static Modal.confirm() API mounts outside ConfigProvider
            and silently drops every token, so it is banned in this codebase:
            use App.useApp(). */}
        <AntApp>{children}</AntApp>
      </ConfigProvider>
    </Ctx.Provider>
  );
}

export function useTheme(): ThemeCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTheme must be used inside <ThemeProvider>');
  return v;
}
