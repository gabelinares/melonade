import { Tooltip } from 'antd';

export interface MoreCountProps {
  /** The items that did not fit. Empty renders nothing at all. */
  hidden: readonly string[];
}

/** The overflow marker for any truncated list of chips. One implementation,
 *  so "+2" means the same thing and looks the same everywhere. */
export function MoreCount({ hidden }: MoreCountProps) {
  if (hidden.length === 0) return null;
  return (
    <Tooltip title={hidden.join(', ')} mouseEnterDelay={0.2}>
      <span
        style={{
          fontSize: 'var(--m-text-xs)',
          color: 'var(--m-content-muted)',
          cursor: 'default',
          flex: 'none',
        }}
      >
        +{hidden.length}
      </span>
    </Tooltip>
  );
}
