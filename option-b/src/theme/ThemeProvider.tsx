import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { MantineProvider, createTheme, mergeThemeOverrides } from '@mantine/core';
import '@mantine/core/styles.css';
import '@mantine/spotlight/styles.css';
import { mantineTheme } from './mantine.ts';
import '../tokens/tokens.css';
import '../tokens/base.css';
import './mantine-overrides.css';

export type ThemePref = 'light' | 'dark' | 'system';
export type Mode = 'light' | 'dark';

interface ThemeCtx {
  pref: ThemePref;
  mode: Mode;
  setPref: (p: ThemePref) => void;
  cycle: () => void;
}

const Ctx = createContext<ThemeCtx | null>(null);
const STORAGE_KEY = 'melonade-b-theme';

function readPref(): ThemePref {
  if (typeof localStorage === 'undefined') return 'system';
  const v = localStorage.getItem(STORAGE_KEY);
  return v === 'light' || v === 'dark' ? v : 'system';
}

/* Mantine keys its own colour scheme off a data attribute it manages, and our
 * token layer keys off data-theme. Both have to be driven from the same state
 * or the two halves of the palette disagree, which is how a "themed" app ends
 * up with a light popover on a dark page. */
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

  /* Mantine's own body colours are switched off: our token layer owns the
     surfaces, and letting both paint produces a one-frame flash of Mantine's
     default grey on every theme change. */
  const theme = useMemo(
    () =>
      mergeThemeOverrides(
        mantineTheme,
        createTheme({
          other: { mode },
        }),
      ),
    [mode],
  );

  return (
    <Ctx.Provider value={value}>
      <MantineProvider
        theme={theme}
        forceColorScheme={mode}
        withCssVariables
        cssVariablesSelector=":root"
      >
        {children}
      </MantineProvider>
    </Ctx.Provider>
  );
}

export function useTheme(): ThemeCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTheme must be used inside <ThemeProvider>');
  return v;
}
