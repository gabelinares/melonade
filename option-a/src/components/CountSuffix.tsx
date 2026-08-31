export interface CountSuffixProps {
  n: number;
}

/** The faded count that follows a label. One definition, so a tab count and a
 *  nav count are the same weight and colour.
 *
 *  The gap is TIGHT on purpose: at the strip's own item spacing the number
 *  floats between two labels and stops reading as belonging to either. A count
 *  is part of its label, not a second column. */
export function CountSuffix({ n }: CountSuffixProps) {
  return (
    <span
      style={{
        marginLeft: 'var(--m-space-2)',
        color: 'var(--m-content-muted)',
        fontFamily: 'var(--m-font-num)',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {n}
    </span>
  );
}
