import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button, Input, type InputRef } from 'antd';
import { Pencil } from 'lucide-react';
import './editable-row.css';

export interface EditableRowProps {
  label: ReactNode;
  value: string;
  /** Absent means read-only: the row prints and never grows a pencil. */
  onSave?: (value: string) => void;
  /** A textarea instead of an input - for a description, not a name. */
  multiline?: boolean;
  placeholder?: string;
  /** Printed instead of the raw value when there is one - a formatted count,
   *  a mono pill. Editing still starts from `value`. */
  display?: ReactNode;
  /** An explanation beside the label, shown as a tooltip-ish hint text. */
  hint?: ReactNode;
}

/**
 * ONE ROW OF A DATA ITEM: label on the left, value on the right, and a pencil
 * that turns the value into a field with Cancel / Save. Production draws this
 * shape on the event page, the property page and the user-properties drawer
 * (`DataItemPage`, `UserPropertiesModal`), so it is one component here rather
 * than three lookalikes. Enter saves, Escape cancels, an unchanged value saves
 * nothing.
 */
export function EditableRow({ label, value, onSave, multiline, placeholder, display, hint }: EditableRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<InputRef>(null);

  useEffect(() => {
    if (editing) {
      setDraft(value);
      ref.current?.focus();
    }
  }, [editing, value]);

  const commit = () => {
    const next = draft.trim();
    if (next !== value && onSave) onSave(next);
    setEditing(false);
  };
  const cancel = () => setEditing(false);

  return (
    <div className={`m-erow${editing ? ' is-editing' : ''}${onSave ? ' is-editable' : ''}`}>
      <div className="m-erow__label">
        <span>{label}</span>
        {hint && <span className="m-erow__hint">{hint}</span>}
      </div>
      {editing ? (
        <div className="m-erow__editor">
          {multiline ? (
            <Input.TextArea
              ref={ref}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoSize={{ minRows: 2, maxRows: 6 }}
              placeholder={placeholder}
              onKeyDown={(e) => {
                if (e.key === 'Escape') cancel();
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) commit();
              }}
            />
          ) : (
            <Input
              ref={ref}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={placeholder}
              onPressEnter={commit}
              onKeyDown={(e) => e.key === 'Escape' && cancel()}
            />
          )}
          <div className="m-erow__buttons">
            <Button size="small" onClick={cancel}>
              Cancel
            </Button>
            <Button size="small" type="primary" onClick={commit}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div className="m-erow__value">
          <span className={`m-erow__text${value ? '' : ' is-empty'}`}>
            {display ?? (value || placeholder || '—')}
          </span>
          {onSave && (
            <button type="button" className="m-erow__pencil" aria-label={`Edit ${typeof label === 'string' ? label.toLowerCase() : 'value'}`} onClick={() => setEditing(true)}>
              <Pencil size={13} aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
