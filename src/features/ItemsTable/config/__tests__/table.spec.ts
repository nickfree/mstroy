// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { createColumnDefs, expanderColumnId } from '../table';
import type { ItemsTableRow } from '../../types';

const row: ItemsTableRow = {
  id: 1,
  parent: null,
  label: 'Группа',
  hasChildren: true,
  expanded: false,
  level: 0,
  category: 'Группа',
};

const getCellRenderer = (
  columns: ReturnType<typeof createColumnDefs>,
): ((params: { data?: ItemsTableRow }) => HTMLElement | string) => {
  const expander = columns.find((column) => column.colId === expanderColumnId);

  return expander?.cellRenderer as (
    params: { data?: ItemsTableRow },
  ) => HTMLElement | string;
};

const getRowNumber = (
  columns: ReturnType<typeof createColumnDefs>,
): ((params: { node: { rowIndex: number | null } }) => number | null) => {
  const rowNumber = columns.find((column) => column.colId === 'rowNumber');

  return rowNumber?.valueGetter as (
    params: { node: { rowIndex: number | null } },
  ) => number | null;
};

const getCellStyle = (
  columns: ReturnType<typeof createColumnDefs>,
  field: string,
): ((params: { data?: ItemsTableRow }) => Record<string, string>) | undefined => {
  const column = columns.find((value) => value.field === field);

  return column?.cellStyle as
    | ((params: { data?: ItemsTableRow }) => Record<string, string>)
    | undefined;
};

describe('ItemsTable columns', () => {
  it('renders an accessible expander button for groups', () => {
    const handleToggle = vi.fn();
    const render = getCellRenderer(createColumnDefs(handleToggle));
    const button = render({ data: row }) as HTMLButtonElement;

    expect(button.tagName).toBe('BUTTON');
    expect(button.type).toBe('button');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.getAttribute('aria-label')).toBe('Развернуть группу «Группа»');

    button.click();

    expect(handleToggle).toHaveBeenCalledWith(1);
  });

  it('reflects the expanded state in the expander button', () => {
    const render = getCellRenderer(createColumnDefs(vi.fn()));
    const button = render({ data: { ...row, expanded: true } }) as HTMLButtonElement;

    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(button.getAttribute('aria-label')).toBe('Свернуть группу «Группа»');
  });

  it('does not render an expander button for leaves', () => {
    const render = getCellRenderer(createColumnDefs(vi.fn()));

    expect(render({ data: { ...row, hasChildren: false, category: 'Элемент' } })).toBe('');
  });

  it('uses the visible row index for row numbers', () => {
    const getNumber = getRowNumber(createColumnDefs(vi.fn()));

    expect(getNumber({ node: { rowIndex: 0 } })).toBe(1);
    expect(getNumber({ node: { rowIndex: 41 } })).toBe(42);
    expect(getNumber({ node: { rowIndex: null } })).toBeNull();
  });

  it('does not resize the last column', () => {
    const columns = createColumnDefs(vi.fn());
    const lastColumn = columns[columns.length - 1];

    expect(lastColumn.resizable).toBe(false);
  });

  it('indents the category column by row level', () => {
    const cellStyle = getCellStyle(createColumnDefs(vi.fn()), 'category');

    expect(cellStyle?.({ data: { ...row, level: 0 } })).toEqual({ paddingLeft: '16px' });
    expect(cellStyle?.({ data: { ...row, level: 3 } })).toEqual({ paddingLeft: '70px' });
  });

  it('does not indent the name column', () => {
    expect(getCellStyle(createColumnDefs(vi.fn()), 'label')).toBeUndefined();
  });
});
