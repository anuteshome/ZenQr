import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import OrderTrackerClient from './OrderTrackerClient';

interface PageProps {
  params: Promise<{ orderId: string }>;
}

export default async function OrderPage({ params }: PageProps) {
  const { orderId } = await params;
  const supabase = await createClient();

  // 1. Fetch Order Details with Table Info
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*, restaurant_tables(table_number)')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    notFound();
  }

  // 2. Fetch Order Items
  const { data: items } = await supabase
    .from('order_items')
    .select('*, menu_items(name_en, name_am)')
    .eq('order_id', orderId);

  return (
    <OrderTrackerClient
      order={order}
      orderItems={items || []}
    />
  );
}
