import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import type { ExpanderLabels } from '@/shared/ui/TreeTable';
import type { ItemCategory, ItemsTableRow } from '../types';

export const categoryBasePadding = 16;
export const categoryLevelIndent = 18;
export const categoryMinWidth = 160;
export const categoryCellClass = 'items-table__category';
export const categoryValueClass = 'items-table__category-value';
export const categoryIndentVar = '--items-table-category-indent';

export const itemCategories = {
  group: 'Группа',
  item: 'Элемент',
} as const satisfies Record<string, ItemCategory>;

export const getItemCategory = (row?: ItemsTableRow): ItemCategory =>
  row?.hasChildren ? itemCategories.group : itemCategories.item;

const getCategoryIndent = (level: number): string =>
  `${categoryBasePadding + level * categoryLevelIndent}px`;

export const createCategoryCellRenderer = (
  params: ICellRendererParams<ItemsTableRow>,
): HTMLElement => {
  const cellValue = document.createElement('span');
  cellValue.className = categoryValueClass;
  cellValue.textContent = getItemCategory(params.data);
  cellValue.style.setProperty(
    categoryIndentVar,
    getCategoryIndent(params.data?.level ?? 0),
  );
  return cellValue;
};

export const itemsTableColumnDefs: ColDef<ItemsTableRow>[] = [
  {
    colId: 'rowNumber',
    headerName: '№ п/п',
    width: 90,
    valueGetter: (params) =>
      params.node?.rowIndex != null ? params.node.rowIndex + 1 : null,
    cellStyle: { textAlign: 'center', color: '#5f6368' },
  },
  {
    colId: 'category',
    headerName: 'Категория',
    width: 200,
    minWidth: categoryMinWidth,
    cellClass: categoryCellClass,
    valueGetter: (params) => getItemCategory(params.data),
    cellRenderer: createCategoryCellRenderer,
  },
  {
    headerName: 'Наименование',
    field: 'label',
    flex: 1,
    minWidth: 280,
    resizable: false,
  },
];

export const itemsTableExpanderLabels: ExpanderLabels = {
  expand: 'Развернуть',
  collapse: 'Свернуть',
};

export const itemsTableLocaleText: Record<string, string> = {
  noRowsToShow: 'Нет данных',
};

export const getItemsRowLabel = (row: ItemsTableRow): string => row.label;
