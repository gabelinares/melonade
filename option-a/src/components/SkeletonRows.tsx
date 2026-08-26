import './skeleton-rows.css';

export interface SkeletonRowsProps {
  rows?: number;
  /** Column widths as flex-basis percentages, so the skeleton mirrors the
   *  real table's rhythm instead of a generic grey block. */
  columns?: readonly number[];
}

/**
 * A loading state that has the SHAPE of the thing loading. A centred spinner
 * inside a table tells the reader to wait; a skeleton with the right column
 * widths tells them what is arriving, and the row height stops the layout from
 * jumping when it does.
 */
export function SkeletonRows({ rows = 6, columns = [10, 46, 20, 14, 6] }: SkeletonRowsProps) {
  return (
    <div className="m-skrows" role="status" aria-label="Loading issues">
      {Array.from({ length: rows }, (_, r) => (
        <div className="m-skrows__row" key={r}>
          {columns.map((w, c) => (
            <span
              key={c}
              className="m-skeleton m-skrows__cell"
              style={{
                flexBasis: `${w}%`,
                /* vary the fill inside each cell so it reads as text, not bars */
                maxWidth: `${w - (c === 1 ? (r % 3) * 8 : 0)}%`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
