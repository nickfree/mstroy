import {
  themeQuartz,
  type ColDef,
  type GridOptions,
  type ICellRendererParams,
} from 'ag-grid-community';
import type { ItemId } from '@/entities/SomeEntity';
import type { ItemsTableRow } from '../types';

export const itemsTableTheme = themeQuartz.withParams({
  headerColumnBorder: true,
  headerColumnBorderHeight: '100%',
});
export const expanderColumnId = 'expander';
export const categoryBasePadding = 16;
export const categoryLevelIndent = 18;
export const tableRowHeight = 36;
export const tableHeaderHeight = 42;

export const tableDefaultColDef: ColDef<ItemsTableRow> = {
  sortable: false,
  resizable: true,
  suppressMovable: true,
};

export const tableGridOptions: GridOptions<ItemsTableRow> = {
  rowHeight: tableRowHeight,
  headerHeight: tableHeaderHeight,
  animateRows: false,
  getRowId: ({ data }) => `${typeof data.id}:${String(data.id)}`,
  localeText: {
    noRowsToShow: 'Нет данных',
    loadingOoo: 'Загрузка элементов…',
  },
};

const createExpanderCellRenderer = (
  params: ICellRendererParams<ItemsTableRow>,
  handleToggle: (id: ItemId) => void,
): HTMLElement | string => {
  const row = params.data;

  if (!row?.hasChildren) return '';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'items-table-grid__expander-button';
  button.setAttribute('aria-expanded', String(row.expanded));
  button.setAttribute(
    'aria-label',
    `${row.expanded ? 'Свернуть' : 'Развернуть'} группу «${row.label}»`,
  );
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    handleToggle(row.id);
  });

  return button;
};

export const createColumnDefs = (
  handleToggle: (id: ItemId) => void,
): ColDef<ItemsTableRow>[] => {
  return [
    {
      colId: 'rowNumber',
      headerName: '№ п/п',
      width: 90,
      valueGetter: (params) =>
        params.node?.rowIndex != null ? params.node.rowIndex + 1 : null,
      cellStyle: { textAlign: 'center', color: '#5f6368' },
    },
    {
      colId: expanderColumnId,
      headerName: '',
      width: 52,
      minWidth: 52,
      maxWidth: 52,
      resizable: false,
      cellClass: 'items-table-grid__expander',
      cellClassRules: {
        'items-table-grid__expander--group': (params) => params.data?.hasChildren === true,
        'items-table-grid__expander--expanded': (params) => params.data?.expanded === true,
      },
      cellRenderer: (params: ICellRendererParams<ItemsTableRow>) =>
        createExpanderCellRenderer(params, handleToggle),
    },
    {
      headerName: 'Категория',
      field: 'category',
      width: 200,
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
};
