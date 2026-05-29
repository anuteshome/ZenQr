export type TrackedOrder = {
  id: string;
  table_id: string | null;
  status: 'placed' | 'preparing' | 'ready' | 'served' | 'cancelled';
  total_price: number;
  notes: string | null;
  created_at: string;
  restaurant_tables: {
    table_number: number;
  } | null;
};

export type TrackedOrderItem = {
  id: string;
  menu_item_id: string | null;
  quantity: number;
  price_at_order: number;
  notes: string | null;
  menu_items: {
    name_en: string;
    name_am: string;
  } | null;
};

/** Supabase joins may return an object or a single-element array. */
function unwrapJoin<T extends Record<string, unknown>>(raw: unknown): T | null {
  if (Array.isArray(raw)) {
    const first = raw[0];
    return first && typeof first === 'object' ? (first as T) : null;
  }
  if (raw && typeof raw === 'object') {
    return raw as T;
  }
  return null;
}

/** Normalize order row — restaurant_tables must be `{ table_number }`, not `[{ table_number }]`. */
export function normalizeTrackedOrder(row: Record<string, unknown>): TrackedOrder {
  const tableJoin = unwrapJoin<{ table_number: number }>(row.restaurant_tables);

  return {
    id: String(row.id),
    table_id: (row.table_id as string | null) ?? null,
    status: row.status as TrackedOrder['status'],
    total_price: Number(row.total_price),
    notes: (row.notes as string | null) ?? null,
    created_at: String(row.created_at),
    restaurant_tables: tableJoin
      ? { table_number: Number(tableJoin.table_number) }
      : null,
  };
}

export function normalizeTrackedOrderItems(rows: Record<string, unknown>[]): TrackedOrderItem[] {
  return rows.map((row) => {
    const menuJoin = unwrapJoin<{ name_en: string; name_am: string }>(row.menu_items);

    return {
      id: String(row.id),
      menu_item_id: (row.menu_item_id as string | null) ?? null,
      quantity: Number(row.quantity),
      price_at_order: Number(row.price_at_order),
      notes: (row.notes as string | null) ?? null,
      menu_items: menuJoin
        ? { name_en: String(menuJoin.name_en), name_am: String(menuJoin.name_am) }
        : null,
    };
  });
}
