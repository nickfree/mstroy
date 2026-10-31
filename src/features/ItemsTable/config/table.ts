import type { ColDef } from 'ag-grid-community';
import type { ExpanderLabels } from '@/shared/ui/TreeTable';
import type { ItemCategory, ItemsTableRow } from '../types';

export const categoryBasePadding = 16;
export const categoryLevelIndent = 18;

export const itemCategories = {
  group: 'Группа',
  item: 'Элемент',
} as const satisfies Record<string, ItemCategory>;

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
    valueGetter: (params) =>
      params.data?.hasChildren ? itemCategories.group : itemCategories.item,
    cellStyle: (params) => ({
      paddingLeft: `${categoryBasePadding + (params.data?.level ?? 0) * categoryLevelIndent}px`,
    }),
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
