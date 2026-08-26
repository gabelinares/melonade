import type { ReactNode } from 'react';
import './empty-state.css';

export interface EmptyStateProps {
  /** One line. Set in the display serif, because an empty pane is one of the
   *  two places this design system lets the serif speak. */
  title: string;
  hint?: ReactNode;
  action?: ReactNode;
  /** `pane` fills the detail column; `inline` sits inside the list column. */
  variant?: 'pane' | 'inline';
}

/**
 * An empty state teaches the interface. "No results" restates what the reader
 * can already see; naming the filter that emptied the list points at the
 * control to reach for.
 *
 * No illustration. This one fills a whole pane, and a drawing at that size
 * would be the loudest thing in the product.
 */
export function EmptyState({ title, hint, action, variant = 'pane' }: EmptyStateProps) {
  return (
    <div className={`b-empty b-empty--${variant}`}>
      <p className={variant === 'pane' ? 'b-empty__title m-display' : 'b-empty__title-sm'}>
        {title}
      </p>
      {hint && <p className="b-empty__hint">{hint}</p>}
      {action && <div className="b-empty__action">{action}</div>}
    </div>
  );
}
