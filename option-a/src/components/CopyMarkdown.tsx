import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { IconButton } from './IconButton.tsx';

export interface CopyMarkdownProps {
  /** Built lazily: serialising the whole issue on every render of a header that
   *  re-renders on every playback tick is work nobody asked for. */
  markdown: () => string;
  label: string;
  icon: ReactNode;
}

/**
 * COPY THE WHOLE CASE, as markdown.
 *
 * The most portable thing this product makes is the write-up, and the place it
 * is most useful is somewhere else: the editor where the fix gets written, the
 * agent that will attempt it, the message to whoever owns that screen. A link
 * is no use to any of those, so what goes on the clipboard is the case itself.
 *
 * It reports back, because a copy button that does nothing visible has to be
 * pressed twice by anyone who was not watching the moment they clicked.
 *
 * The `execCommand` fallback is not superstition: the async clipboard API needs
 * a secure context and a permission, and this prototype gets opened from file
 * URLs and inside preview iframes.
 */
export function CopyMarkdown({ markdown, label, icon }: CopyMarkdownProps) {
  const [done, setDone] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => () => { if (timer.current != null) window.clearTimeout(timer.current); }, []);

  const copy = async () => {
    const text = markdown();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      try {
        document.execCommand('copy');
      } finally {
        document.body.removeChild(area);
      }
    }
    setDone(true);
    if (timer.current != null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setDone(false), 1600);
  };

  return (
    <IconButton
      icon={done ? <Check size={15} /> : icon}
      label={done ? 'Copied as markdown' : label}
      variant="ghost"
      active={done}
      onClick={copy}
    />
  );
}
