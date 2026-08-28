import type { ReactNode } from 'react';
import './page-card.css';

export interface PageCardProps {
  title: string;
  /** One line under the title saying what this page is. It replaced the info
   *  icon that held the same sentence behind a hover: a page's own description
   *  is not a footnote, and the header has room for it now. */
  subtitle?: string;
  /** A muted count beside the title. Not a subtitle. */
  meta?: ReactNode;
  /** Slot immediately after the title cluster, for page-level state. */
  lede?: ReactNode;
  /** The right-hand cluster. */
  actions?: ReactNode;
  /** The page's own sections, as a strip under the title. A page with this
   *  keeps ONE title while the strip changes what is under it - which is the
   *  difference between three sections of a page and three pages. Text tabs
   *  with an ink bar, deliberately a different shape from the pill toolbar
   *  below, because a section replaces the body and a filter only narrows it. */
  tabs?: ReactNode;
  /** A row under the header: the filters over the body below it. A page whose
   *  body has several sections leaves this empty and lets each section render
   *  its own `<PageToolbar>` as its first element - same row, same class, but
   *  owned by the section it filters. */
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
 * ── 2026-08-28: the card became the plane ──────────────────────────────────
 * It used to be one card among several possible ones, centred on a grey canvas
 * with a fixed 44px header so its title lined up with the nav's. It is now the
 * whole content plane - it fills its share of the window, floats on the nav's
 * own colour with an equal margin on four sides, and scrolls inside itself.
 *
 * Two consequences, and both are subtractions. The header is no longer a fixed
 * row: it has real top padding, a title at page size and a subtitle under it.
 * And there is no hairline beneath it, because the whitespace does that job
 * better and the page below is not a second thing - it is what the title is
 * about.
 *
 * ── 2026-08-28, later the same day: the tabs came back ─────────────────────
 * An agent with several sections gets a `tabs` strip under the title, and the
 * TITLE STOPS CHANGING. Reading "Runs" where "Tests" was is indistinguishable
 * from having left Tests, however you got there - the menu cannot say "you are
 * still inside this" once you are looking at the page instead of at the menu.
 */
export function PageCard({ title, subtitle, meta, lede, actions, tabs, toolbar, children }: PageCardProps) {
  return (
    <section className={`m-page${tabs ? ' m-page--tabbed' : ''}`}>
      <header className="m-page__head">
        <div className="m-page__lead">
          <h1 className="m-page__title">{title}</h1>
          {subtitle && <p className="m-page__sub">{subtitle}</p>}
        </div>
        {meta != null && <span className="m-page__meta">{meta}</span>}
        {lede}
        {actions && <div className="m-page__actions">{actions}</div>}
      </header>
      {tabs && <div className="m-page__tabs">{tabs}</div>}
      {toolbar && <PageToolbar>{toolbar}</PageToolbar>}
      <div className="m-page__body">{children}</div>
    </section>
  );
}

/**
 * The filter row under the header. Exported so a page with several sections can
 * let each one render its own, rather than the shell assembling three sections'
 * controls and switching between them.
 */
export function PageToolbar({ children }: { children: ReactNode }) {
  return <div className="m-page__toolbar">{children}</div>;
}
