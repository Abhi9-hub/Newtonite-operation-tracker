// Coloured pill for status / priority values (colours defined in styles.css).
import { humanize } from './format';

export function Badge({ kind, value }: { kind: 'status' | 'priority'; value: string }) {
  return <span className={`badge ${kind}-${value}`}>{humanize(value)}</span>;
}