import type { ReactNode } from 'react';
import { Drawer } from 'antd';
import { Placeholder } from './Placeholder.tsx';

export interface StubDrawerProps {
  open: boolean;
  onClose: () => void;
  /** The row you opened, named. */
  title: string;
  /** The facts the list already knows, on one line under the title. */
  meta?: ReactNode;
  /** What this drawer will hold, in one sentence, and what it will not. */
  note: string;
}

/**
 * The panel a row opens, before the panel exists.
 *
 * This round is the two LIST pages, and a row that does nothing when clicked
 * reads as broken rather than unfinished - so the row opens, and what it opens
 * says plainly which piece is next. The header is real: it carries the row's
 * name and the facts the table already knows, so the drawer proves the click
 * landed on the right test before it admits there is nothing else in here yet.
 *
 * One component for both pages, so "not built" is a single sentence in a single
 * shape, and deleting it later is one import per callsite.
 */
export function StubDrawer({ open, onClose, title, meta, note }: StubDrawerProps) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      size={480}
      destroyOnHidden
      title={
        <div style={{ display: 'grid', gap: 'var(--m-space-2)', minWidth: 0 }}>
          <span
            className="m-truncate"
            style={{ fontSize: 'var(--m-text-md)', fontWeight: 'var(--m-weight-medium)' }}
          >
            {title}
          </span>
          {meta && (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--m-space-3)',
                fontSize: 'var(--m-text-xs)',
                fontWeight: 'var(--m-weight-regular)',
                color: 'var(--m-content-muted)',
              }}
            >
              {meta}
            </span>
          )}
        </div>
      }
    >
      <Placeholder title="Not in this round" note={note} />
    </Drawer>
  );
}
