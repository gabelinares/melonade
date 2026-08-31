import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * The pager's two arrows.
 *
 * Same complaint and same answer as SortIcon: antd draws these with its own
 * icon set, which is filled and sharp-cornered, and next to a page of 1.75px
 * rounded lucide strokes they are the two hardest shapes on screen - which is
 * exactly backwards, because "previous page" is the quietest control in the
 * footer, not the loudest.
 *
 * It is the same chevron the menu, the sort headers and every disclosure in the
 * app already use. One gesture, one glyph, at one weight.
 *
 * Spread as `itemRender={pagerItem}` rather than written out at each footer, so
 * a fourth list cannot get antd's arrows back by forgetting.
 */
export function pagerItem(
  _page: number,
  type: 'page' | 'prev' | 'next' | 'jump-prev' | 'jump-next',
  element: ReactNode,
): ReactNode {
  if (type === 'prev') return <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />;
  if (type === 'next') return <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />;
  return element;
}
