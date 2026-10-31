// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import type { ColDef } from 'ag-grid-community';
import type { TreeRow } from '../../types';
import { createExpanderColumn, expanderColumnId } from '../table';

type TestItem = {
  id: number
  parent: number | null
  label: string
}

const row: TreeRow<TestItem> = {
  id: 1,
  parent: null,
  label: 'Группа',
  hasChildren: true,
  expanded: false,
  level: 0,
};

const labels = {
  expand: 'Развернуть',
  collapse: 'Свернуть',
};

const getCellRenderer = (
  column: ColDef<TreeRow<TestItem>>,
): ((params: { data?: TreeRow<TestItem> }) => HTMLElement | string) =>
  column.cellRenderer as (params: { data?: TreeRow<TestItem> }) => HTMLElement | string;

const createColumn = (
  handleToggle: (id: number) => void = vi.fn(),
): ColDef<TreeRow<TestItem>> =>
  createExpanderColumn<TestItem>(handleToggle, (value) => value.label, labels);

describe('TreeTable expander column', () => {
  it('renders an accessible expander button for groups', () => {
    const handleToggle = vi.fn();
    const column = createColumn(handleToggle);
    const render = getCellRenderer(column);
    const button = render({ data: row }) as HTMLButtonElement;

    expect(column.colId).toBe(expanderColumnId);
    expect(button.tagName).toBe('BUTTON');
    expect(button.type).toBe('button');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.getAttribute('aria-label')).toBe('Развернуть «Группа»');

    button.click();

    expect(handleToggle).toHaveBeenCalledWith(1);
  });

  it('reflects the expanded state in the expander button', () => {
    const render = getCellRenderer(createColumn());
    const button = render({ data: { ...row, expanded: true } }) as HTMLButtonElement;

    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(button.getAttribute('aria-label')).toBe('Свернуть «Группа»');
  });

  it('does not render an expander button for leaves', () => {
    const render = getCellRenderer(createColumn());

    expect(render({ data: { ...row, hasChildren: false } })).toBe('');
  });
});
