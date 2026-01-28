import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { useUpdateCell } from '@/hooks/crm/useCRMData';

export const EditableCell = ({ getValue, row, column }: any) => {
  const initialValue = getValue();
  const [value, setValue] = useState(initialValue);
  const { mutate } = useUpdateCell();

  useEffect(() => { setValue(initialValue); }, [initialValue]);

  const onBlur = () => {
    if (value !== initialValue) {
      mutate({ id: row.original.id, column: column.id, value });
    }
  };

  return (
    <input
      value={value || ''}
      onChange={e => setValue(e.target.value)}
      onBlur={onBlur}
      className="w-full bg-transparent border-none outline-none focus:ring-1 focus:ring-indigo-500/20 px-1 py-0.5 rounded text-xs font-medium text-slate-700 truncate"
    />
  );
};