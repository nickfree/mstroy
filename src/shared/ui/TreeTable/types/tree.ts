export type TreeId = string | number

export type TreeNode<TId extends TreeId = TreeId> = {
  id: TId
  parent: TId | null
}

export type TreeRow<T extends TreeNode> = T & {
  hasChildren: boolean
  expanded: boolean
  level: number
}

export type TreeRowsChange<T extends TreeNode> = {
  added: TreeRow<T>[]
  removed: TreeRow<T>[]
  updated: TreeRow<T>[]
  addIndex: number | null
}

export type TreeRowCache<T extends TreeNode> = Map<
  T['id'],
  { item: T; row: TreeRow<T> }
>
