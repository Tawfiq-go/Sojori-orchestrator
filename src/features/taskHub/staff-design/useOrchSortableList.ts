import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

/** Capteurs drag — même réglage que SupportConfigTab (listing) */
export function useOrchSortableSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
}

function sortableKey(item: { _id?: string; id?: string }): string {
  return item._id ?? item.id ?? '';
}

export function orchDragEndIndices(
  items: { _id?: string; id?: string }[],
  event: DragEndEvent,
): { oldIndex: number; newIndex: number } | null {
  const { active, over } = event;
  if (!over || active.id === over.id) return null;
  const oldIndex = items.findIndex((x) => sortableKey(x) === active.id);
  const newIndex = items.findIndex((x) => sortableKey(x) === over.id);
  if (oldIndex < 0 || newIndex < 0) return null;
  return { oldIndex, newIndex };
}

export function orchDragEndListOrder(
  listOrder: string[],
  event: DragEndEvent,
): { oldIndex: number; newIndex: number } | null {
  const { active, over } = event;
  if (!over || active.id === over.id) return null;
  const oldIndex = listOrder.indexOf(String(active.id));
  const newIndex = listOrder.indexOf(String(over.id));
  if (oldIndex < 0 || newIndex < 0) return null;
  return { oldIndex, newIndex };
}
