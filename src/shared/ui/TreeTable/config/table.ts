import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import type { ExpanderLabels, TreeNode, TreeRow } from '../types';

export const expanderColumnId = 'expander';
export const treeRowHeight = 36;
export const treeHeaderHeight = 42;
export const treeDefaultColDef: ColDef = {
  sortable: false,
  resizable: true,
  suppressMovable: true,
};
export const treeThemeParams: Record<string, string | number | boolean> = {
  headerColumnBorder: true,
  headerColumnBorderHeight: '100%',
};

export const defaultExpanderLabels: ExpanderLabels = {
  expand: 'Expand',
  collapse: 'Collapse',
};

const createExpanderCellRenderer = <T extends TreeNode>(
  params: ICellRendererParams<TreeRow<T>>,
  handleToggle: (id: T['id']) => void,
  getRowLabel: (row: TreeRow<T>) => string,
  labels: ExpanderLabels,
): HTMLElement | string => {
  const row = params.data;

  if (!row?.hasChildren) return '';

  const action = row.expanded ? labels.collapse : labels.expand;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tree-grid__expander-button';
  button.setAttribute('aria-expanded', String(row.expanded));
  button.setAttribute('aria-label', `${action} «${getRowLabel(row)}»`);
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    handleToggle(row.id);
  });

  return button;
};

export const createExpanderColumn = <T extends TreeNode>(
  handleToggle: (id: T['id']) => void,
  getRowLabel: (row: TreeRow<T>) => string,
  labels: ExpanderLabels = defaultExpanderLabels,
): ColDef<TreeRow<T>> => {
  return {
    colId: expanderColumnId,
    headerName: '',
    width: 52,
    minWidth: 52,
    maxWidth: 52,
    resizable: false,
    cellClass: 'tree-grid__expander',
    cellClassRules: {
      'tree-grid__expander--group': (params) => params.data?.hasChildren === true,
      'tree-grid__expander--expanded': (params) => params.data?.expanded === true,
    },
    cellRenderer: (params: ICellRendererParams<TreeRow<T>>) =>
      createExpanderCellRenderer(params, handleToggle, getRowLabel, labels),
  };
};
