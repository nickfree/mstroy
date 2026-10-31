import type { TreeNode } from '../types';

export class TreeStore<T extends TreeNode> {
  private items: T[] = [];
  private itemById = new Map<T['id'], T>();
  private childrenByParent = new Map<T['id'] | null, T[]>();
  private positionById = new Map<T['id'], number>();

  constructor(items: readonly T[] = []) {
    this.setItems(items);
  }

  setItems(items: readonly T[]): void {
    const nextItems = items.slice();
    const nextItemById = new Map<T['id'], T>();
    const nextChildrenByParent = new Map<T['id'] | null, T[]>();
    const nextPositionById = new Map<T['id'], number>();

    for (let i = 0; i < nextItems.length; i += 1) {
      const item = nextItems[i];

      if (nextItemById.has(item.id)) {
        throw new Error(`Item with id "${String(item.id)}" already exists`);
      }

      nextItemById.set(item.id, item);
      nextPositionById.set(item.id, i);

      let children = nextChildrenByParent.get(item.parent);
      if (!children) {
        children = [];
        nextChildrenByParent.set(item.parent, children);
      }
      children.push(item);
    }

    this.items = nextItems;
    this.itemById = nextItemById;
    this.childrenByParent = nextChildrenByParent;
    this.positionById = nextPositionById;
  }

  getAll(): readonly T[] {
    return this.items;
  }

  getItem(id: T['id']): T | undefined {
    return this.itemById.get(id);
  }

  getChildren(id: T['id'] | null): readonly T[] {
    return this.childrenByParent.get(id) ?? [];
  }

  getAllChildren(id: T['id']): T[] {
    const result: T[] = [];
    const stack: T[] = [];
    const seen = new Set<T['id']>([id]);

    const pushChildren = (parentId: T['id'] | null): void => {
      const children = this.childrenByParent.get(parentId);
      if (!children) return;
      for (let i = children.length - 1; i >= 0; i -= 1) {
        stack.push(children[i]);
      }
    };

    pushChildren(id);

    while (stack.length > 0) {
      const item = stack.pop();
      if (!item || seen.has(item.id)) continue;

      seen.add(item.id);
      result.push(item);
      pushChildren(item.id);
    }

    return result;
  }

  getAllParents(id: T['id']): T[] {
    const result: T[] = [];
    const seen = new Set<T['id']>();
    let current = this.itemById.get(id);

    while (current && !seen.has(current.id)) {
      result.push(current);
      seen.add(current.id);
      if (current.parent === null) break;
      current = this.itemById.get(current.parent);
    }

    return result;
  }

  addItem(item: T): void {
    if (item.parent === item.id) {
      throw new Error('Cannot add an item as its own parent');
    }

    if (this.itemById.has(item.id)) {
      throw new Error(`Item with id "${String(item.id)}" already exists`);
    }

    if (item.parent !== null && !this.itemById.has(item.parent)) {
      throw new Error(`Parent with id "${String(item.parent)}" not found`);
    }

    this.items.push(item);
    this.itemById.set(item.id, item);
    this.positionById.set(item.id, this.items.length - 1);

    let children = this.childrenByParent.get(item.parent);
    if (!children) {
      children = [];
      this.childrenByParent.set(item.parent, children);
    }
    children.push(item);
  }

  removeItem(id: T['id']): void {
    const root = this.itemById.get(id);
    if (!root) return;

    const idsToRemove = new Set<T['id']>();
    const stack: T[] = [root];

    while (stack.length > 0) {
      const item = stack.pop();
      if (!item || idsToRemove.has(item.id)) continue;

      idsToRemove.add(item.id);
      const children = this.childrenByParent.get(item.id);
      if (children) {
        for (const child of children) stack.push(child);
      }
    }

    const siblings = this.childrenByParent.get(root.parent);
    if (siblings) {
      const index = siblings.indexOf(root);
      if (index !== -1) siblings.splice(index, 1);
      if (siblings.length === 0) this.childrenByParent.delete(root.parent);
    }

    for (const removedId of idsToRemove) {
      this.itemById.delete(removedId);
      this.childrenByParent.delete(removedId);
    }

    this.items = this.items.filter((item) => !idsToRemove.has(item.id));

    this.positionById.clear();
    for (let i = 0; i < this.items.length; i += 1) {
      this.positionById.set(this.items[i].id, i);
    }
  }

  updateItem(item: T): void {
    const current = this.itemById.get(item.id);
    const index = this.positionById.get(item.id);

    if (!current || index === undefined) {
      throw new Error(`Item with id "${String(item.id)}" not found`);
    }

    if (current.parent !== item.parent) {
      if (item.parent !== null && !this.itemById.has(item.parent)) {
        throw new Error(`Parent with id "${String(item.parent)}" not found`);
      }

      const isDescendant = this.getAllChildren(item.id).some(
        (child) => child.id === item.parent,
      );

      if (item.parent === item.id || isDescendant) {
        throw new Error('Cannot move an item into its own subtree');
      }

      this.detachChild(current.parent, current);
      this.attachChild(item);
    } else {
      const siblings = this.childrenByParent.get(item.parent);
      if (siblings) {
        const siblingIndex = siblings.indexOf(current);
        if (siblingIndex !== -1) siblings[siblingIndex] = item;
      }
    }

    this.items[index] = item;
    this.itemById.set(item.id, item);
  }

  private attachChild(item: T): void {
    let children = this.childrenByParent.get(item.parent);
    if (!children) {
      children = [];
      this.childrenByParent.set(item.parent, children);
    }
    children.push(item);
  }

  private detachChild(parentId: T['id'] | null, item: T): void {
    const children = this.childrenByParent.get(parentId);
    if (!children) return;

    const index = children.indexOf(item);
    if (index !== -1) children.splice(index, 1);
    if (children.length === 0) this.childrenByParent.delete(parentId);
  }
}
