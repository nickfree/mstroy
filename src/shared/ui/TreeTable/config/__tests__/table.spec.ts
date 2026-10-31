// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import type { ColDef } from 'ag-grid-community';
import type { TreeRow } from '../../types';
import { createExpanderColumn, defaultExpanderLabels, expanderColumnId } from '../table';

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

  it('renders nothing when the row is missing', () => {
    const render = getCellRenderer(createColumn());

    expect(render({})).toBe('');
  });

  it('falls back to the default labels', () => {
    const column = createExpanderColumn<TestItem>(vi.fn(), (value) => value.label);
    const button = getCellRenderer(column)({ data: row }) as HTMLButtonElement;

    expect(button.getAttribute('aria-label')).toBe(
      `${defaultExpanderLabels.expand} «Группа»`,
    );
  });

  it('stops click propagation from the expander button', () => {
    const handleToggle = vi.fn();
    const column = createColumn(handleToggle);
    const button = getCellRenderer(column)({ data: row }) as HTMLButtonElement;
    const parent = document.createElement('div');
    const parentClick = vi.fn();
    parent.addEventListener('click', parentClick);
    parent.appendChild(button);

    button.click();

    expect(handleToggle).toHaveBeenCalledWith(1);
    expect(parentClick).not.toHaveBeenCalled();
  });
});
