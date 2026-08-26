import type { ReactNode } from 'react';
import { Tooltip } from 'antd';
import { Info } from 'lucide-react';
import './page-card.css';

export interface PageCardProps {
  title: string;
  /** A muted count beside the title. Not a subtitle. */
  meta?: ReactNode;
  /** The one-paragraph explanation of what this page is, on an info icon. */
  info?: string;
  /** Slot immediately after the title cluster, for page-level state. */
  lede?: ReactNode;
  /** The right-hand cluster. */
  actions?: ReactNode;
  /** A second row under the header: filters, tabs. */
  toolbar?: ReactNode;
  children: ReactNode;
}

/**
 * The page shell, and the only way a page gets a header in this app.
 *
 * There is deliberately no `className` or `style` escape hatch. Handing pages
 * one is exactly how fourteen pages in the current app ended up with four
 * different header heights and three paddings: if a page needs something the
 * shell cannot say, the shell changes.
 *
 * The header height is a hard 44px rather than vertical padding, because
 * padding makes the row 40px on a title-only page and 44px the moment a
 * control lands in it, so the title sits at a different height per page.
 */
export function PageCard({ title, meta, info, lede, actions, toolbar, children }: PageCardProps) {
  return (
    <section className="m-page">
      <header className="m-page__head">
        <h1 className="m-page__title">{title}</h1>
        {meta != null && <span className="m-page__meta">{meta}</span>}
        {info && (
          <Tooltip title={info} placement="bottom">
            <span className="m-page__info" tabIndex={0} role="note" aria-label={info}>
              <Info size={14} aria-hidden="true" />
            </span>
          </Tooltip>
        )}
        {lede}
        {actions && <div className="m-page__actions">{actions}</div>}
      </header>
      {toolbar && <div className="m-page__toolbar">{toolbar}</div>}
      <div className="m-page__body">{children}</div>
    </section>
  );
}
