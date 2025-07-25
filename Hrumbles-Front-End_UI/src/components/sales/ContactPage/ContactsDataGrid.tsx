// src/components/sales/ContactPage/ContactsDataGrid.tsx
import React from 'react';

import 'react-data-grid/lib/styles.css';
import { Button } from '@/components/ui/button';
import { Edit, Link as LinkIcon } from 'lucide-react';
import type { SimpleContact, SimpleContactUpdate } from '@/types/simple-contact.types';

const customEditorClass = `
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: 0 6px;
  border: 2px solid #36a;
  vertical-align: top;
  background-color: white;
  font-family: inherit;
  font-size: inherit;
`;

const modernDataGridStyle = `
  .rdg { border: none; font-size: 14px; }
  .rdg-header-row { background-color: #f8fafc; color: #475569; font-weight: 500; border-bottom: 1px solid #e2e8f0; }
  .rdg-cell { border-right: none; border-bottom: 1px solid #e2e8f0; padding: 0 12px; }
  .rdg-row { background-color: #ffffff; }
  .rdg-row:hover { background-color: #f8fafc; }
  .rdg-summary-row { position: sticky; bottom: 0; background-color: #f8fafc; font-weight: 500; border-top: 1px solid #e2e8f0; }
  .rdg-frozen-cell { box-shadow: 2px 0 5px -2px rgba(0,0,0,0.1); }
  .custom-editor { ${customEditorClass} }
`;

// --- Custom Editors ---
const ContactStageEditor = ({ row, onRowChange }: RenderEditCellProps<SimpleContact>) => {
  const CONTACT_STAGES = ['Prospect', 'Approaching', 'Replied', 'Interested', 'Not Interested', 'Cold', 'Un Responsive', 'Do Not Contact', 'Bad Data', 'Changed Job'];
  return (
    <select className="custom-editor" value={row.contact_stage ?? ''} onChange={(e) => onRowChange({ ...row, contact_stage: e.target.value }, true)} autoFocus>
      {CONTACT_STAGES.map(stage => <option key={stage} value={stage}>{stage}</option>)}
    </select>
  );
};

const DateEditor = ({ row, column, onRowChange }: RenderEditCellProps<SimpleContact>) => {
  const value = row.custom_data?.[column.key];
  const dateValue = value ? new Date(value).toISOString().split('T')[0] : '';
  return (
    <input type="date" className="custom-editor" value={dateValue} onChange={(e) => {
        const newCustomData = { ...(row.custom_data ?? {}), [column.key]: e.target.valueAsDate?.toISOString() };
        onRowChange({ ...row, custom_data: newCustomData }, true);
      }} autoFocus
    />
  );
};

// --- Column Definitions ---
export const generateColumns = (
  onEditContact: (contact: SimpleContact) => void,
  dynamicColumns: { key: string; name: string; type: string }[]
): readonly Column<SimpleContact, { totalCount: number }>[] => {
  const baseColumns: readonly Column<SimpleContact, { totalCount: number }>[] = [
    SelectColumn,
    { key: 'name', name: 'Name', editor: textEditor, resizable: true, frozen: true, width: 200 },
    { key: 'email', name: 'Email', editor: textEditor, resizable: true, frozen: true, width: 220 },
    { key: 'job_title', name: 'Job Title', editor: textEditor, resizable: true, width: 180 },
    { key: 'company_name', name: 'Company', resizable: true, width: 180 },
    { key: 'contact_stage', name: 'Stage', renderEditCell: ContactStageEditor, resizable: true, width: 150 },
    { key: 'contact_owner', name: 'Owner', editor: textEditor, resizable: true, width: 150 },
    { key: 'linkedin_url', name: 'LinkedIn', editor: textEditor, width: 100,
      renderCell: ({ row }) => row.linkedin_url ? (
        <a href={row.linkedin_url.startsWith('http') ? row.linkedin_url : `https://${row.linkedin_url}`} target="_blank" rel="noreferrer" className="flex items-center justify-center h-full text-blue-600 hover:text-blue-800"><LinkIcon size={16} /></a>
      ) : null
    },
    { key: 'actions', name: 'More', width: 80,
      renderCell: ({ row }) => (<div className="flex items-center justify-center h-full"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditContact(row)} title="Open Full Edit Form"><Edit className="h-4 w-4" /></Button></div>),
      renderSummaryCell: ({ row }) => (<strong>{row.totalCount} Contacts</strong>)
    }
  ];

  const customColumns: readonly Column<SimpleContact, { totalCount: number }>[] = dynamicColumns.map(col => ({
    key: col.key, name: col.name, resizable: true,
    renderEditCell: col.type === 'date' ? DateEditor : textEditor,
    formatter: ({ row }) => {
        const value = (row.custom_data as any)?.[col.key];
        if (col.type === 'date' && value) {
            return new Date(value).toLocaleDateString();
        }
        return value ?? null;
    }
  }));

  return [...baseColumns, ...customColumns];
};

interface ContactsDataGridProps {
  contacts: readonly SimpleContact[];
  onRowsChange: (rows: SimpleContact[], data: any) => void;
  onUpdateContactField: (item: SimpleContact, updates: SimpleContactUpdate) => void;
  onEditContact: (contact: SimpleContact) => void;
  dynamicColumns: { key: string; name: string; type: string }[];
  sortColumns: any;
  onSortColumnsChange: any;
  selectedRows: ReadonlySet<string>;
  onSelectedRowsChange: (selectedRows: ReadonlySet<string>) => void;
  summaryRows: readonly { totalCount: number }[];
  gridRef: React.RefObject<DataGridHandle<SimpleContact, { totalCount: number }>>;
}

const ContactsDataGrid: React.FC<ContactsDataGridProps> = (props) => {
  const { contacts, onRowsChange, onUpdateContactField, onEditContact, dynamicColumns, summaryRows, gridRef, ...rest } = props;

  const handleFill = ({ columnKey, sourceRow, targetRow }: FillEvent<SimpleContact>): SimpleContact => {
    const updatedRow = { ...targetRow, [columnKey]: sourceRow[columnKey as keyof SimpleContact] };
    onUpdateContactField(targetRow, { [columnKey]: sourceRow[columnKey as keyof SimpleContact] });
    return updatedRow;
  };

  const columns = generateColumns(onEditContact, dynamicColumns);

  return (
    <>
      <style>{modernDataGridStyle}</style>
      <DataGrid
        ref={gridRef}
        className="rdg-light fill-grid"
        columns={columns}
        rows={contacts}
        onRowsChange={onRowsChange}
        rowKeyGetter={row => row.id}
        onFill={handleFill}
        defaultColumnOptions={{ sortable: true, resizable: true }}
        bottomSummaryRows={summaryRows}
        {...rest}
      />
    </>
  );
};

export default ContactsDataGrid;