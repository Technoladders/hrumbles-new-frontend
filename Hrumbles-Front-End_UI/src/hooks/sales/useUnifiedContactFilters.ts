import { useState, useCallback } from 'react';
import { ColumnFiltersState } from '@tanstack/react-table';

export const useUnifiedContactFilters = () => {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const updateFilter = useCallback((id: string, value: any) => {
    setColumnFilters((prev) => {
      const existing = prev.find((f) => f.id === id);
      if (existing) {
        return prev.map((f) => (f.id === id ? { id, value } : f));
      }
      return [...prev, { id, value }];
    });
  }, []);

  const removeFilter = useCallback((id: string) => {
    setColumnFilters((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const clearAll = useCallback(() => setColumnFilters([]), []);

  return { columnFilters, setColumnFilters, updateFilter, removeFilter, clearAll };
};