import type { SomeEntityItem } from '@/entities/SomeEntity';

export type ItemCategory = 'Группа' | 'Элемент'

export type ItemsTableRow = SomeEntityItem & {
  hasChildren: boolean
  expanded: boolean
  level: number
  category: ItemCategory
}
