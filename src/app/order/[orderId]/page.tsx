import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import OrderTrackerClient, { normalizeTrackedOrder } from './OrderTrackerClient';

interface PageProps {
  params: Promise<{ orderId: string }>;
}

export const dynamic = 'force-dynamic';

export default async function OrderPage({ params }: PageProps) {
  const { orderId } = await params;

  if (!orderId) {
    notFound();
  }

  const supabase = await createClient();

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(`
      *,
      restaurant_tables (
        table_number
      )
    `)
    .eq('id', orderId)
    .maybeSingle();

  if (orderError) {
    console.error('Order fetch error:', orderError);
    notFound();
  }

  if (!order) {
    notFound();
  }

  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select(`
      *,
      menu_items (
        name_en,
        name_am
      )
    `)
    .eq('order_id', orderId);

  if (itemsError) {
    console.error('Order items fetch error:', itemsError);
  }

  return (
    <OrderTrackerClient
      order={normalizeTrackedOrder(order as Record<string, unknown>)}
      orderItems={items ?? []}
    />
  );
}