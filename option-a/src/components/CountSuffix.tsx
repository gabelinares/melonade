export interface CountSuffixProps {
  n: number;
}

/** The faded count that follows a label. One definition, so a tab count and a
 *  nav count are the same weight and colour. */
export function CountSuffix({ n }: CountSuffixProps) {
  return (
    <span
      style={{
        marginLeft: 'var(--m-space-3)',
        color: 'var(--m-content-muted)',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {n}
    </span>
  );
}
