import { describe, expect, it } from 'vitest';
import type { ItemCategory, ItemsTableRow } from '../../types';
import {
  getItemsRowLabel,
  itemCategories,
  itemsTableColumnDefs,
  itemsTableExpanderLabels,
  itemsTableLocaleText,
} from '../table';

const row: ItemsTableRow = {
  id: 1,
  parent: null,
  label: 'Группа',
  hasChildren: true,
  expanded: false,
  level: 0,
};

const findColumn = (colId: string): (typeof itemsTableColumnDefs)[number] | undefined =>
  itemsTableColumnDefs.find((column) => column.colId === colId);

const getRowNumber = (): ((params: { node: { rowIndex: number | null } }) => number | null) =>
  findColumn('rowNumber')?.valueGetter as (
    params: { node: { rowIndex: number | null } },
  ) => number | null;

const getCategory = (): ((params: { data?: ItemsTableRow }) => ItemCategory) =>
  findColumn('category')?.valueGetter as (
    params: { data?: ItemsTableRow },
  ) => ItemCategory;

const getCategoryCellStyle = (): ((params: { data?: ItemsTableRow }) => Record<string, string>) =>
  findColumn('category')?.cellStyle as (
    params: { data?: ItemsTableRow },
  ) => Record<string, string>;

describe('ItemsTable columns', () => {
  it('uses the visible row index for row numbers', () => {
    const getNumber = getRowNumber();

    expect(getNumber({ node: { rowIndex: 0 } })).toBe(1);
    expect(getNumber({ node: { rowIndex: 41 } })).toBe(42);
    expect(getNumber({ node: { rowIndex: null } })).toBeNull();
  });

  it('derives the category from the presence of children', () => {
    const getValue = getCategory();

    expect(getValue({ data: { ...row, hasChildren: true } })).toBe(itemCategories.group);
    expect(getValue({ data: { ...row, hasChildren: false } })).toBe(itemCategories.item);
  });

  it('indents the category column by row level', () => {
    const cellStyle = getCategoryCellStyle();

    expect(cellStyle({ data: { ...row, level: 0 } })).toEqual({ paddingLeft: '16px' });
    expect(cellStyle({ data: { ...row, level: 3 } })).toEqual({ paddingLeft: '70px' });
  });

  it('does not resize the last column', () => {
    const lastColumn = itemsTableColumnDefs[itemsTableColumnDefs.length - 1];

    expect(lastColumn.resizable).toBe(false);
  });

  it('provides the row label for accessible expander buttons', () => {
    expect(getItemsRowLabel(row)).toBe('Группа');
  });

  it('defines the columns in display order', () => {
    expect(itemsTableColumnDefs.map((column) => column.colId ?? column.field)).toEqual([
      'rowNumber',
      'category',
      'label',
    ]);
    expect(itemsTableColumnDefs.map((column) => column.headerName)).toEqual([
      '№ п/п',
      'Категория',
      'Наименование',
    ]);
  });

  it('provides expander labels and locale text', () => {
    expect(itemsTableExpanderLabels).toEqual({
      expand: 'Развернуть',
      collapse: 'Свернуть',
    });
    expect(itemsTableLocaleText).toEqual({ noRowsToShow: 'Нет данных' });
  });

  it('uses safe defaults when row data is missing', () => {
    expect(getCategory()({})).toBe(itemCategories.item);
    expect(getCategoryCellStyle()({})).toEqual({ paddingLeft: '16px' });
  });
});
