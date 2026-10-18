// Returns `value` only after it stops changing for `ms`. Keeps search from firing a request per keystroke.
import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t); // cancel if the value changes again
  }, [value, ms]);
  return debounced;
}