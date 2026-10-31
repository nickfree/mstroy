export type ItemId = number | string

export type SomeEntityItem = {
  id: ItemId
  parent: ItemId | null
  label: string
}
