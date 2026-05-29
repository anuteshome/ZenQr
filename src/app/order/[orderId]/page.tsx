import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import OrderTrackerClient from './OrderTrackerClient';
import {
  normalizeTrackedOrder,
  normalizeTrackedOrderItems,
} from '@/utils/orderTracking';

interface PageProps {
  params: Promise<{ orderId: string }>;
}

export const dynamic = 'force-dynamic';

export default async function OrderPage({ params }: PageProps) {
  const { orderId } = await params;

  if (!orderId || !/^[0-9a-f-]{36}$/i.test(orderId)) {
    notFound();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables on the server.');
  }

  try {
    const supabase = await createClient();

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        table_id,
        status,
        total_price,
        notes,
        created_at,
        restaurant_tables (
          table_number
        )
      `)
      .eq('id', orderId)
      .maybeSingle();

    if (orderError) {
      console.error('Order fetch error:', orderError.message);
      notFound();
    }

    if (!order) {
      notFound();
    }

    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select(`
        id,
        menu_item_id,
        quantity,
        price_at_order,
        notes,
        menu_items (
          name_en,
          name_am
        )
      `)
      .eq('order_id', orderId);

    if (itemsError) {
      console.error('Order items fetch error:', itemsError.message);
    }

    return (
      <OrderTrackerClient
        order={normalizeTrackedOrder(order as Record<string, unknown>)}
        orderItems={normalizeTrackedOrderItems((items ?? []) as Record<string, unknown>[])}
      />
    );
  } catch (err) {
    console.error('Order page error:', err);
    notFound();
  }
}
