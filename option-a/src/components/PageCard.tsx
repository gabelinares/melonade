import { useEffect, useRef, type ReactNode } from 'react';
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
  /**
   * ⚠ THE PAGE RENDERS ITS OWN COMPONENTS.
   *
   * Without it the shell wraps `toolbar` and `children` in ONE panel, which is
   * the right shape for a page that is a header over a list - Issues, Tests,
   * Runs, Audits - and means none of them had to change when the plane became
   * the ground.
   *
   * With it the page is handed the bare ground and lays out its own `PagePanel`
   * children. Sessions is the first: a QUESTION panel and an ANSWER panel, and
   * `toolbar` is refused because the strip it used to hold belongs inside the
   * second one.
   */
  split?: boolean;
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
 * ── ⚠ 2026-09-04: THE PLANE BECAME THE GROUND ──────────────────────────────
 * Mehdi walked production on 09-03 to make one point: a page there is not one
 * surface, it is TWO OR THREE with air between them. *"We need to have
 * components… this is just a technique we used over time to have it more
 * airy."* On the cards page he counted five - title, each series, breakdown,
 * card, drill-down - and asked for two or three here, no more.
 *
 * The obvious way to do that would have been to inset cards INTO the plane,
 * and it is the wrong one: ground, plane, card is three surfaces deep, and
 * Gabriel had already named the risk on the call - *"if we use that separation
 * with a lot of components it wouldn't make sense, it would feel really
 * disconnected."*
 *
 * So the plane gives up its own surface instead. It keeps its margin, its
 * scrolling and its header; what it loses is the border, the radius and the
 * fill. The header now sits ON the ground, and the components are the only
 * cards on screen. Two levels, exactly as many as before, and it is
 * production's own arrangement: a grey application background with white cards
 * on it.
 *
 * ── 2026-08-28, later the same day: the tabs came back ─────────────────────
 * An agent with several sections gets a `tabs` strip under the title, and the
 * TITLE STOPS CHANGING. Reading "Runs" where "Tests" was is indistinguishable
 * from having left Tests, however you got there - the menu cannot say "you are
 * still inside this" once you are looking at the page instead of at the menu.
 */
export function PageCard({ title, subtitle, meta, lede, actions, tabs, toolbar, split, children }: PageCardProps) {
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
      <div className="m-page__body">
        {split ? children : <PagePanel head={toolbar}>{children}</PagePanel>}
      </div>
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

/**
 * ONE COMPONENT — a card on the ground, with an optional head.
 *
 * ── WHAT GOES IN WHICH ONE, and it is not header-over-table ────────────────
 * The line that answers every list page is **what makes the set** against
 * **what reads the set**:
 *
 *   THE QUESTION — the filter, the date window, and the verbs that dispose of
 *     the query itself (Save as segment, Clear). Everything that changes WHICH
 *     ROWS EXIST.
 *   THE ANSWER — the narrowing tabs, the display menu, the column headers and
 *     their sorters, the rows, the pagination. Everything that changes HOW YOU
 *     READ the rows that exist.
 *
 * ⚠ THE TEST THAT SETTLES THE HARD CASES: a control that displays COUNTS
 * DERIVED FROM THE RESULT belongs to the result. "All 38 · Errors 6" is
 * arithmetic on what the filter returned, so it cannot sit above the thing it
 * counts - which is the same conclusion Mehdi reached by instinct on 09-03:
 * *"you filter something and then you look at the tabs to see what's in
 * there."*
 *
 * ⚠ AND THE DISTINCTION THAT WILL BITE ON EVERY OTHER PAGE: two kinds of tab
 * look identical and belong in different places. DESTINATION tabs (Sessions /
 * Bookmarks / Segments, or Tests / Runs / Environments) are different lists and
 * stay in the page header. NARROWING tabs (All / Errors / Bad Requests) are one
 * list filtered, carry counts, and belong in the answer's head.
 *
 * ── THE HEAD STICKS ────────────────────────────────────────────────────────
 * Which is why this is `overflow: clip` and not `overflow: hidden`: hidden
 * makes the panel its own scroll container, and a sticky child then sticks to a
 * box that never scrolls. Clip does the same rounding without the scrollport.
 */
export function PagePanel({
  head,
  spills,
  children,
}: {
  head?: ReactNode;
  /**
   * ⚠ THIS PANEL'S CONTENT MAY LEAVE IT, so it is not clipped.
   *
   * A panel clips by default because it usually holds a table, and a table's
   * own header fill would square off the corners it is sitting inside. The
   * QUESTION panel holds the filter, whose catalogue grows out of a button and
   * extends past the card's bottom edge - and a clipped one is worse than it
   * sounds: the menu is still laid out, so it still answers hit-testing as
   * "visible", it is simply painted nowhere. What you get is a menu you can see
   * the top of and cannot click, and every click lands on whatever is behind
   * it.
   */
  spills?: boolean;
  children: ReactNode;
}) {
  const box = useRef<HTMLElement>(null);
  const bar = useRef<HTMLDivElement>(null);

  /* ⚠ THE HEAD'S HEIGHT, PUBLISHED AS A VARIABLE, because a table's own column
     titles have to stick UNDER it and CSS cannot ask how tall a sibling is.
     Both are sticky at the same scrollport, so without this they pin at the
     same offset and the titles vanish behind the head - which is exactly what
     happened for one build, and it looks like the titles simply not sticking.
     Measured rather than hard-coded: the head holds a wrapping row of controls,
     so its height depends on the plane's width. */
  useEffect(() => {
    const el = bar.current;
    const host = box.current;
    if (!el || !host) return undefined;
    const publish = () => host.style.setProperty('--m-panel-head-h', `${Math.round(el.offsetHeight)}px`);
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => ro.disconnect();
  }, [head]);

  return (
    <section className={`m-panel${spills ? ' is-spilling' : ''}`} ref={box}>
      {head && (
        <div className="m-panel__head" ref={bar}>
          {head}
        </div>
      )}
      {children}
    </section>
  );
}
