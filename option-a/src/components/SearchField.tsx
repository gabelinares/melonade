import { Input } from 'antd';
import './search-field.css';

export interface SearchFieldProps {
  /** Names what is being searched: "Search tests". Also the accessible name. */
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}

/**
 * The page header's search box, at one width on every page.
 *
 * It is a component rather than three copies of `<Input className="...">`
 * because the width is a layout decision - it shrinks on a narrow window so the
 * header's action cluster never wraps - and a decision made in three places is
 * a decision that drifts.
 */
export function SearchField({ placeholder, value, onChange }: SearchFieldProps) {
  return (
    <Input
      className="m-search"
      allowClear
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      maxLength={120}
      aria-label={placeholder}
    />
  );
}
