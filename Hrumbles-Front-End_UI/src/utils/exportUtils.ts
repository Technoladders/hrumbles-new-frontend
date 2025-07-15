// src/utils/exportUtils.ts
import { flushSync } from 'react-dom';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { DataGridHandle } from 'react-data-grid';

// Extend the jsPDF type to include the autoTable method
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDFWithAutoTable;
}

export function exportToCsv(gridElement: HTMLDivElement, fileName: string) {
  const { head, body, foot } = getGridContent(gridElement);
  const content = [...head, ...body, ...foot]
    .map((cells) => cells.map(getCellContent).join(','))
    .join('\n')
    .replace(/,/g, '","')
    .replace(/\n/g, '"\n"')
    .replace(/^"/, '')
    .replace(/"$/, '');

  const link = document.createElement('a');
  link.href = `data:text/csv;charset=utf-8,${encodeURIComponent(content)}`;
  link.download = fileName;
  link.click();
}

export async function exportToPdf(gridElement: HTMLDivElement, fileName: string) {
  const { head, body } = getGridContent(gridElement);
  const doc = new jsPDF({
    orientation: 'l',
    unit: 'px'
  }) as jsPDFWithAutoTable;

  doc.autoTable({
    head: head.map((cells) => cells.map(getCellContent)),
    body: body.map((cells) => cells.map(getCellContent)),
    styles: {
      font: 'sans-serif',
      fontSize: 7
    }
  });
  doc.save(fileName);
}

function getGridContent(gridElement: HTMLDivElement) {
  const head: HTMLDivElement[][] = [];
  const body: HTMLDivElement[][] = [];
  const foot: HTMLDivElement[][] = [];
  const grid = gridElement.querySelector<HTMLDivElement>('.rdg');
  const headerRows = grid!.querySelectorAll<HTMLDivElement>('.rdg-header-row');
  const rows = grid!.querySelectorAll<HTMLDivElement>('.rdg-row');
  const summaryRows = grid!.querySelectorAll<HTMLDivElement>('.rdg-summary-row');

  for (const headerRow of headerRows) {
    head.push(Array.from(headerRow.querySelectorAll<HTMLDivElement>('.rdg-cell')));
  }
  for (const row of rows) {
    body.push(Array.from(row.querySelectorAll<HTMLDivElement>('.rdg-cell')));
  }
  for (const summaryRow of summaryRows) {
    foot.push(Array.from(summaryRow.querySelectorAll<HTMLDivElement>('.rdg-cell')));
  }

  return { head, body, foot };
}

function getCellContent(cell: HTMLDivElement): string {
  if (cell.ariaColIndex === '1') return ''; // Don't export the checkbox column
  return cell.innerText;
}

// You need to install jspdf and jspdf-autotable for PDF export to work
// npm install jspdf jspdf-autotable