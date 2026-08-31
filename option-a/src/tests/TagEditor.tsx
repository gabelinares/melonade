import { useState } from 'react';
import { Input, Tooltip } from 'antd';
import { Plus } from 'lucide-react';
import { TESTS } from '@shared/tests-data.ts';
import { Chip } from '../components/Chip.tsx';
import './tag-editor.css';

/** Every tag anybody has used, so adding one is mostly picking one. A free-text
 *  field with no memory is how a list ends up with Billing, billing and
 *  Billling. */
const KNOWN = Array.from(new Set(TESTS.flatMap((t) => t.tags ?? []))).sort();

const MAX = 3;

/**
 * Up to three tags, and the cap is the point: a test with eight tags has none.
 * Existing tags are offered as you type; anything new is allowed, because the
 * vocabulary is the team's and not ours.
 */
export function TagEditor({ value, onChange }: { value: string[]; onChange: (tags: string[]) => void }) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');

  const add = (tag: string) => {
    const t = tag.trim();
    if (!t || value.includes(t) || value.length >= MAX) return;
    onChange([...value, t]);
    setText('');
    setAdding(false);
  };

  const suggestions = KNOWN.filter((t) => !value.includes(t) && t.toLowerCase().includes(text.toLowerCase()));

  return (
    <div className="m-tags">
      {value.map((tag) => (
        <Chip key={tag} kind="tag" removeLabel={`Remove ${tag}`} onRemove={() => onChange(value.filter((t) => t !== tag))}>
          {tag}
        </Chip>
      ))}

      {value.length < MAX &&
        (adding ? (
          <Input
            size="small"
            autoFocus
            value={text}
            placeholder="Tag"
            className="m-tags__input"
            maxLength={24}
            onChange={(e) => setText(e.target.value)}
            onPressEnter={() => add(text)}
            onBlur={() => { setAdding(false); setText(''); }}
            onKeyDown={(e) => { if (e.key === 'Escape') { setAdding(false); setText(''); } }}
          />
        ) : (
          <button type="button" className="m-tags__add" onClick={() => setAdding(true)}>
            <Plus size={12} aria-hidden="true" /> Tag
          </button>
        ))}

      {adding && suggestions.length > 0 && (
        <span className="m-tags__sugg">
          {suggestions.slice(0, 4).map((t) => (
            <button key={t} type="button" onMouseDown={(e) => { e.preventDefault(); add(t); }}>
              {t}
            </button>
          ))}
        </span>
      )}

      {value.length >= MAX && (
        <Tooltip title="Three is the cap. A test with eight tags has none.">
          <span className="m-tags__full">3 of 3</span>
        </Tooltip>
      )}
    </div>
  );
}
