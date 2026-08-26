import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { IconButton } from './IconButton.tsx';

export interface CopyMarkdownProps {
  /** Built lazily, because serialising the whole issue on every render of a
   *  header that re-renders on every playback tick would be work nobody asked
   *  for. */
  markdown: () => string;
  label: string;
}

/**
 * COPY THE WHOLE CASE, as markdown.
 *
 * The most portable thing this product makes is the write-up, and the place it
 * is most useful is somewhere else: the editor where the fix gets written, the
 * agent that is going to attempt it, the message to the person who owns that
 * screen. A link is no use to any of those - two of them cannot open it - so
 * what goes on the clipboard is the case itself: symptom, diagnosis, proposed
 * fix, and the recording's own journey as a step table.
 *
 * IT REPORTS BACK. A copy button that does nothing visible has to be pressed
 * twice by anyone who was not watching the exact moment they clicked, and the
 * second press is how you find out whether the first one worked. The glyph
 * becomes a tick for a beat and then goes back.
 *
 * The `execCommand` fallback is not superstition: the async clipboard API needs
 * a secure context and a permission, and this prototype gets opened from file
 * URLs and inside preview iframes. A control that silently fails in half the
 * places it is demonstrated is worse than one that is ten lines longer.
 */
export function CopyMarkdown({ markdown, label }: CopyMarkdownProps) {
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
      icon={done ? <Check size={15} /> : <Copy size={15} />}
      label={done ? 'Copied as markdown' : label}
      variant="ghost"
      active={done}
      onClick={copy}
    />
  );
}
