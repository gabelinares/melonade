import { useEffect, useState } from 'react';
import { Input, Modal } from 'antd';
import '../dialogs/dialogs.css';

export interface RenameDialogProps {
  open: boolean;
  /** "Rename dashboard", "Rename recording" - the verb and the noun. */
  title: string;
  value: string;
  okText?: string;
  placeholder?: string;
  onOk: (value: string) => void;
  onCancel: () => void;
}

/**
 * THE ONE RENAME SHAPE. Dashboards, cards, alerts, spots and recordings all
 * have a "Rename" in their row menu and production gives each its own small
 * modal with an input and Save / Cancel. One component here, so the width,
 * the label and the Enter-saves behaviour are the same in all five places.
 */
export function RenameDialog({ open, title, value, okText = 'Save', placeholder, onOk, onCancel }: RenameDialogProps) {
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);
  const commit = () => {
    const next = draft.trim();
    if (next) onOk(next);
  };
  return (
    <Modal
      title={title}
      open={open}
      onCancel={onCancel}
      okText={okText}
      okButtonProps={{ disabled: !draft.trim() || draft.trim() === value }}
      onOk={commit}
      width={440}
      destroyOnHidden
    >
      <Input
        autoFocus
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onPressEnter={commit}
        maxLength={80}
      />
    </Modal>
  );
}
