import { Pagination } from 'antd';
import { pagerItem } from './Pager.tsx';
import './list-footer.css';

export interface ListFooterProps {
  page: number;
  pageSize: number;
  total: number;
  /** Singular and plural, because "1 issues" is the tell that a count was
   *  formatted by a template rather than written. */
  noun: [string, string];
  /** Omit and the footer is a count with no pager - which is what a list
   *  shorter than one page is. */
  onPage?: (page: number) => void;
  /** Appended to the count when everything fits on one page: the issue queue
   *  says "in 4 groups" there, which is true of nothing else. */
  detail?: string;
}

/**
 * ════════════════════════════════════════════════════════════════════════════
 * THE BOTTOM EDGE OF EVERY LIST.
 *
 * Five pages had written this out longhand - issues, tests, runs, audits and
 * sessions - and by 2026-09-02 the five had drifted in three separate ways:
 * four of them inset the row by 12px against a table whose cells are inset by
 * 20px, the fifth had no horizontal padding at all and its count sat against
 * the plane's own edge, and one of the five had no rule above it. Mehdi saw
 * the last one and called it: "the footer padding is wrong".
 *
 * ── THE ALIGNMENT RULE, and it is the whole reason this exists ────────────
 * The count starts where the first CELL starts, and the pager ends where the
 * last cell ends. Not where the table starts - the table is edge to edge in
 * the plane and its outer cells carry the page's margin themselves (see the
 * "one left inset for every table" block in antd-overrides.css). A footer that
 * uses a different number is a footer that is nearly right, which is the only
 * kind of misalignment people feel without being able to name.
 * ════════════════════════════════════════════════════════════════════════════
 */
export function ListFooter({ page, pageSize, total, noun, onPage, detail }: ListFooterProps) {
  const paginated = onPage != null && total > pageSize;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const word = total === 1 ? noun[0] : noun[1];

  return (
    <footer className="m-listfoot">
      <span className="m-listfoot__range">
        {paginated
          ? `${start}–${end} of ${total} ${word}`
          : `${total} ${word}${detail ? ` ${detail}` : ''}`}
      </span>
      {paginated && (
        <Pagination
          size="small"
          current={page}
          total={total}
          pageSize={pageSize}
          onChange={onPage}
          showSizeChanger={false}
          itemRender={pagerItem}
        />
      )}
    </footer>
  );
}
