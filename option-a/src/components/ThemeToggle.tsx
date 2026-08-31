import { Tooltip } from 'antd';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '../theme/ThemeProvider.tsx';

const ICON = { light: Sun, dark: Moon, system: Monitor } as const;
const NEXT = { light: 'dark', dark: 'system', system: 'light' } as const;

/** Cycles light -> dark -> system. "System" is a real state and the default,
 *  so a two-way switch would be lying about what is set. */
export function ThemeToggle() {
  const { pref, cycle } = useTheme();
  const Icon = ICON[pref];
  return (
    <Tooltip title={`Theme: ${pref}. Switch to ${NEXT[pref]}.`} placement="right">
      <button
        type="button"
        onClick={cycle}
        aria-label={`Theme: ${pref}. Switch to ${NEXT[pref]}.`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '1.75rem',
          height: '1.75rem',
          borderRadius: 'var(--m-radius-control)',
          color: 'var(--m-content-muted)',
        }}
      >
        <Icon size={15} aria-hidden="true" />
      </button>
    </Tooltip>
  );
}
