import type { ReactNode } from 'react';
import { Modal } from 'antd';
import '../dialogs/dialogs.css';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** The sentence under the title. Name the subject with `<span
   *  className="m-dlg__subject">`, the way the test dialogs do. */
  children: ReactNode;
  okText: string;
  danger?: boolean;
  onOk: () => void;
  onCancel: () => void;
}

/**
 * THE ONE CONFIRM SHAPE, for every "are you sure" the detail views need -
 * delete a user, remove a feature, delete a dashboard, an alert, a spot, a
 * card. Production writes each as its own `confirm({...})`; here it is one
 * component so the width, the lede style and the danger button cannot drift.
 * ⚠ Never the static `Modal.confirm` - it renders outside the theme provider
 * (see the componentization note in the memory). This is a rendered `<Modal>`.
 */
export function ConfirmDialog({ open, title, children, okText, danger = true, onOk, onCancel }: ConfirmDialogProps) {
  return (
    <Modal
      title={title}
      open={open}
      onCancel={onCancel}
      okText={okText}
      okButtonProps={{ danger }}
      onOk={onOk}
      width={440}
      destroyOnHidden
    >
      <p className="m-dlg__lede">{children}</p>
    </Modal>
  );
}
