import type { ReactNode } from 'react';
import './empty-state.css';

export interface EmptyStateProps {
  /** One line, sentence case, states the situation as a fact. */
  title: string;
  /** What to do next. Optional only when there is genuinely nothing to do. */
  hint?: ReactNode;
  action?: ReactNode;
}

/**
 * An empty state teaches the interface. "No results" tells the reader what
 * they can already see; naming the filter that emptied the list tells them
 * which control to reach for. No illustration: the row it replaces is 38px
 * tall and a drawing here would out-shout the whole page.
 */
export function EmptyState({ title, hint, action }: EmptyStateProps) {
  return (
    <div className="m-empty">
      <p className="m-empty__title">{title}</p>
      {hint && <p className="m-empty__hint">{hint}</p>}
      {action && <div className="m-empty__action">{action}</div>}
    </div>
  );
}
