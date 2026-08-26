import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  ACCENTS,
  DEFAULTS,
  FONTS,
  GREYS,
  type AccentKey,
  type DensityKey,
  type FontKey,
  type GreyKey,
} from '../tokens/proto-themes.ts';
import type { Mode, ThemeOverrides } from './antd.ts';
import '../tokens/proto-themes.css';

/**
 * ════════════════════════════════════════════════════════════════════════════
 * THE TOKENS THE REVIEWER CAN MOVE.
 *
 * Mehdi asked for the type and the colours to be switchable rather than
 * described: "everything added there because it makes it so easy." The reason
 * this is worth wiring properly rather than swapping a stylesheet is that a
 * token change has to land in TWO places at once:
 *
 *   the CSS layer      every rule in the app reads var(--m-*), so an attribute
 *                      on <html> is enough
 *   antd               is not styled by our variables at all. It derives whole
 *                      ramps from colorPrimary with a palette algorithm that
 *                      needs a real colour string, so it has to be handed the
 *                      resolved hexes and re-rendered
 *
 * Miss the second and the page recolours while every button, switch and slider
 * on it stays teal, which reads as a broken build rather than as a palette.
 *
 * Both maps come out of one generator, so they cannot disagree.
 * ════════════════════════════════════════════════════════════════════════════
 */
export interface ProtoTokens {
  grey: GreyKey;
  accent: AccentKey;
  font: FontKey;
  density: DensityKey;
  setGrey: (k: GreyKey) => void;
  setAccent: (k: AccentKey) => void;
  setFont: (k: FontKey) => void;
  setDensity: (k: DensityKey) => void;
  reset: () => void;
}

const Ctx = createContext<ProtoTokens | null>(null);

const KEY = 'melonade-a-proto-tokens';

interface Saved {
  grey: GreyKey;
  accent: AccentKey;
  font: FontKey;
  density: DensityKey;
}

/* Persisted, because a reviewer who found a combination they liked should still
   have it after a reload. Anything unrecognised falls back to the shipped
   value rather than throwing: the stored keys outlive the variant list. */
function read(): Saved {
  const fallback: Saved = { ...DEFAULTS };
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fallback;
    const v = JSON.parse(raw) as Partial<Saved>;
    return {
      grey: v.grey && GREYS[v.grey] ? v.grey : fallback.grey,
      accent: v.accent && ACCENTS[v.accent] ? v.accent : fallback.accent,
      font: v.font && FONTS[v.font as keyof typeof FONTS] ? v.font : fallback.font,
      density: v.density === 'spaced' ? 'spaced' : fallback.density,
    };
  } catch {
    return fallback;
  }
}

export interface ProtoTokensProviderProps {
  children: React.ReactNode;
  /** Pin the shipped tokens and touch no storage. Storybook uses this: a story
   *  is a reference for a component, so it must not inherit whichever palette
   *  somebody last picked in the app - they share an origin and would otherwise
   *  share the key. */
  frozen?: boolean;
}

export function ProtoTokensProvider({ children, frozen = false }: ProtoTokensProviderProps) {
  const [saved, setSaved] = useState<Saved>(() => (frozen ? { ...DEFAULTS } : read()));

  /* The attributes are written even for the default variants. The generator
     emits the defaults too, so "back to the shipped palette" is a value rather
     than the absence of one - which means the panel can return to it without a
     reload and without a second code path. */
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-grey', saved.grey);
    root.setAttribute('data-accent', saved.accent);
    root.setAttribute('data-font', saved.font);
    root.setAttribute('data-density', saved.density);
  }, [saved]);

  /* WARM THE OTHER TWO FACES. A <link> to Google Fonts only DECLARES the
     @font-face rules; the browser fetches a file the first time something is
     actually painted in it. So the first switch used to paint the fallback for a
     beat and then swap - which, when the fallback is San Francisco and the target
     is Inter, looks like the control did nothing rather than like a load. Asking
     for them up front costs two requests on a prototype and makes the switch
     instant. */
  useEffect(() => {
    if (typeof document === 'undefined' || !document.fonts) return;
    for (const f of Object.values(FONTS)) {
      for (const weight of [400, 500, 600]) {
        void document.fonts.load(`${weight} 14px ${f.sans}`).catch(() => {});
      }
      void document.fonts.load(`400 14px ${f.mono}`).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (frozen) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(saved));
    } catch {
      /* private window, or site data blocked. The controls still work for this
         session; only the memory of them is lost. */
    }
  }, [saved, frozen]);

  const value = useMemo<ProtoTokens>(
    () => ({
      ...saved,
      setGrey: (grey) => setSaved((s) => ({ ...s, grey })),
      setAccent: (accent) => setSaved((s) => ({ ...s, accent })),
      setFont: (font) => setSaved((s) => ({ ...s, font })),
      setDensity: (density) => setSaved((s) => ({ ...s, density })),
      reset: () => setSaved({ ...DEFAULTS }),
    }),
    [saved],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProtoTokens(): ProtoTokens {
  const v = useContext(Ctx);
  if (!v) throw new Error('useProtoTokens must be used inside <ProtoTokensProvider>');
  return v;
}

/** The same choice, shaped for antd. Grey first, accent second: they touch
 *  disjoint roles, but the accent is the one a reader is looking at.
 *
 *  THE FONT HAS TO COME THROUGH HERE TOO. antd stamps its own `font-family` onto
 *  every component from its `fontFamily` token, so switching only the CSS
 *  variable changes the body and leaves every table, tab, input and button on
 *  the old face - and on this page that is nearly everything, which reads as the
 *  control being broken rather than as a partial switch. */
export function useAntdOverrides(mode: Mode): ThemeOverrides {
  const { grey, accent, font } = useProtoTokens();
  return useMemo(() => {
    const g = GREYS[grey];
    const a = ACCENTS[accent];
    const f = FONTS[font];
    return {
      palette: { ...g?.palette, ...a?.palette },
      roles: { ...(mode === 'dark' ? g?.dark : g?.light), ...(mode === 'dark' ? a?.dark : a?.light) },
      fonts: { sans: f?.sans, mono: f?.mono },
    };
  }, [grey, accent, font, mode]);
}
