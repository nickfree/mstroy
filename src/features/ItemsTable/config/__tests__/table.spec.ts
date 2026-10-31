// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import type { ItemCategory, ItemsTableRow } from '../../types';
import {
  categoryIndentVar,
  categoryMinWidth,
  categoryValueClass,
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

const getCategoryCellRenderer = (): ((params: { data?: ItemsTableRow }) => HTMLElement) =>
  findColumn('category')?.cellRenderer as (
    params: { data?: ItemsTableRow },
  ) => HTMLElement;

const readCategoryIndent = (cell: HTMLElement): string =>
  cell.style.getPropertyValue(categoryIndentVar);

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

  it('renders the category value with a level indent', () => {
    const render = getCategoryCellRenderer();
    const groupCell = render({ data: { ...row, hasChildren: true, level: 0 } });
    const itemCell = render({ data: { ...row, hasChildren: false, level: 3 } });

    expect(groupCell.className).toBe(categoryValueClass);
    expect(groupCell.textContent).toBe(itemCategories.group);
    expect(itemCell.textContent).toBe(itemCategories.item);
    expect(readCategoryIndent(groupCell)).toBe('16px');
    expect(readCategoryIndent(itemCell)).toBe('70px');
  });

  it('keeps the category column above the minimum width', () => {
    expect(findColumn('category')?.minWidth).toBe(categoryMinWidth);
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
    const cell = getCategoryCellRenderer()({});

    expect(getCategory()({})).toBe(itemCategories.item);
    expect(cell.textContent).toBe(itemCategories.item);
    expect(readCategoryIndent(cell)).toBe('16px');
  });
});
