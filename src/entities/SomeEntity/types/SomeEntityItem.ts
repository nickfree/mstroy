export type ItemId = number | string

// Доменный тип сущности не является частью tree API. Сейчас он структурно
// совместим с TreeNode из shared/ui/TreeTable (id/parent), поэтому его можно
// передать в generic TreeTable; типы при этом остаются независимыми.
export type SomeEntityItem = {
  id: ItemId
  parent: ItemId | null
  label: string
}
