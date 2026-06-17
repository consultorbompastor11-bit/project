import { useSearchParams } from 'react-router-dom';
import { useCallback, useMemo } from 'react';

export function useFilterState<T extends Record<string, string | undefined>>(
  defaults: T
): [T, (updates: Partial<T>) => void, () => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => {
    const result = { ...defaults };
    for (const key of Object.keys(defaults) as Array<keyof T>) {
      const value = searchParams.get(key as string);
      if (value !== null) {
        (result as Record<string, string>)[key as string] = value;
      }
    }
    return result;
  }, [searchParams, defaults]);

  const setFilters = useCallback(
    (updates: Partial<T>) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(updates)) {
          if (value === undefined || value === '') {
            next.delete(key);
          } else {
            next.set(key, String(value));
          }
        }
        return next;
      });
    },
    [setSearchParams]
  );

  const clearFilters = useCallback(() => {
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  return [filters, setFilters, clearFilters];
}
