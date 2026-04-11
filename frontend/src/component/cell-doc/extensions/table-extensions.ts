/**
 * Table extensions for cell-doc.
 *
 * Node contract:
 *   table       -> backend table
 *   tableRow    -> backend table_row
 *   tableCell   -> backend table_cell (header=false)
 *   tableHeader -> backend table_cell (header=true)
 *
 * Resizing is disabled for Story 5.
 */
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import type { Extensions } from '@tiptap/core';

export function buildTableExtensions(): Extensions {
  return [
    Table.configure({ resizable: false }),
    TableRow,
    TableCell,
    TableHeader,
  ];
}
