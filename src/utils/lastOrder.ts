const STORAGE_KEY = 'bistroqr-last-order';

export type LastOrder = {
  orderId: string;
  tableNumber: number;
  createdAt: string;
};

export function saveLastOrder(orderId: string, tableNumber: number): void {
  if (typeof window === 'undefined') return;
  const entry: LastOrder = {
    orderId,
    tableNumber,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
}

export function getLastOrder(): LastOrder | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastOrder;
    if (parsed?.orderId && parsed?.tableNumber) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function getLastOrderForTable(tableNumber: number): LastOrder | null {
  const last = getLastOrder();
  if (!last || last.tableNumber !== tableNumber) return null;
  return last;
}
