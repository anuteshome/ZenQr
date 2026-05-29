'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useLanguage } from '@/context/LanguageContext';
import { playNewOrderSound } from '@/utils/notificationSound';
import { 
  ChefHat, 
  Clock, 
  Check, 
  Play, 
  Trash2, 
  CheckSquare, 
  Languages, 
  AlertCircle,
} from 'lucide-react';

interface OrderItem {
  id: string;
  quantity: number;
  price_at_order: number;
  notes: string | null;
  menu_items: {
    name_en: string;
    name_am: string;
  } | null;
}

interface Order {
  id: string;
  table_id: string | null;
  status: 'placed' | 'preparing' | 'ready' | 'served' | 'cancelled';
  total_price: number;
  notes: string | null;
  created_at: string;
  restaurant_tables: {
    table_number: number;
  } | null;
  order_items: OrderItem[];
}

export default function KitchenDisplay() {
  const { language, setLanguage, t } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  // 1. Fetch active orders
  const fetchActiveOrders = async () => {
    try {
      const { data, error: dbError } = await supabase
        .from('orders')
        .select(`
          *,
          restaurant_tables (table_number),
          order_items (
            id,
            quantity,
            price_at_order,
            notes,
            menu_items (
              name_en,
              name_am
            )
          )
        `)
        .not('status', 'in', '("served","cancelled")')
        .order('created_at', { ascending: true });

      if (dbError) throw dbError;
      setOrders((data as Order[]) || []);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching kitchen orders:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveOrders();

    const pollInterval = setInterval(fetchActiveOrders, 5000);

    const orderChannel = supabase
      .channel('kitchen-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            playNewOrderSound();
          }
          fetchActiveOrders();
        }
      )
      .subscribe();

    const itemsChannel = supabase
      .channel('kitchen-order-items')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
        () => fetchActiveOrders()
      )
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(orderChannel);
      supabase.removeChannel(itemsChannel);
    };
  }, [supabase]);

  // Update order status
  const updateStatus = async (orderId: string, nextStatus: Order['status']) => {
    try {
      const { data: updated, error: patchError } = await supabase
        .from('orders')
        .update({ status: nextStatus })
        .eq('id', orderId)
        .select('id, status')
        .single();

      if (patchError) throw patchError;
      if (!updated) {
        throw new Error(
          t(
            'Status not saved. Run supabase_fix_kitchen_tracking.sql in Supabase SQL Editor.',
            'ሁኔታ አልተቀመጠም። በ Supabase SQL Editor ውስጥ supabase_fix_kitchen_tracking.sql ያስገቡ።'
          )
        );
      }

      setOrders((prev) =>
        prev
          .map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
          .filter((o) => o.status !== 'served' && o.status !== 'cancelled')
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert(t('Failed to update status: ', 'ሁኔታ ማዘመን አልተሳካም፡ ') + message);
      fetchActiveOrders();
    }
  };

  // Time elapsed calculator
  const getMinutesElapsed = (createdAtStr: string) => {
    const created = new Date(createdAtStr);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    return Math.floor(diffMs / 60000);
  };

  const [timeTicker, setTimeTicker] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeTicker((prev) => prev + 1);
    }, 60000); // refresh time elapsed every minute
    return () => clearInterval(timer);
  }, []);

  // Columns filter
  const placedOrders = orders.filter((o) => o.status === 'placed');
  const preparingOrders = orders.filter((o) => o.status === 'preparing');
  const readyOrders = orders.filter((o) => o.status === 'ready');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <ChefHat className="w-12 h-12 text-amber-500 animate-pulse mb-4" />
        <p className="text-sm font-semibold">{t('Loading Kitchen Display...', 'ማእድ ቤት ማሳያ በመጫን ላይ...')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ChefHat className="w-8 h-8 text-amber-500" />
          <div>
            <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
              <span>{t('Kitchen Display System', 'የማእድ ቤት ማሳያ ሰሌዳ')}</span>
              <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30 flex items-center gap-1 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Live
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              {t('Manage and prepare incoming table orders', 'የሚመጡ የጠረጴዛ ትዕዛዞችን ይቆጣጠሩ እና ያዘጋጁ')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Active Orders Count */}
          <span className="text-xs bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 font-bold text-slate-300">
            {t(`Total Active: ${orders.length}`, `አጠቃላይ ንቁ ትዕዛዝ: ${orders.length}`)}
          </span>

          {/* Language Selector */}
          <button
            onClick={() => setLanguage(language === 'en' ? 'am' : 'en')}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-1.5 rounded-lg border border-slate-700 transition text-xs font-bold"
          >
            <Languages className="w-4 h-4 text-amber-500" />
            <span>{language === 'en' ? 'አማርኛ' : 'English'}</span>
          </button>
        </div>
      </header>

      {error && (
        <div className="mx-6 mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
          <p className="font-bold">{t('Kitchen cannot load orders', 'ማእድ ቤት ትዕዛዞችን ማንበብ አልቻለም')}</p>
          <p className="mt-1">{error}</p>
          <p className="mt-2 text-slate-400">
            {t(
              'Fix: Supabase → SQL Editor → run file supabase_fix_kitchen_tracking.sql',
              'መፍትሄ፡ Supabase → SQL Editor → supabase_fix_kitchen_tracking.sql ፋይሉን ያስገቡ'
            )}
          </p>
        </div>
      )}

      {/* Main Board Columns */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 p-6 overflow-hidden h-[calc(100vh-73px)]">
        
        {/* Column 1: Placed (New) */}
        <div className="bg-slate-900/50 border border-slate-850 rounded-2xl flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-blue-500/5 flex items-center justify-between flex-shrink-0">
            <h2 className="font-extrabold text-sm text-blue-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              {t('New Orders', 'አዲስ ትዕዛዞች')}
            </h2>
            <span className="bg-blue-500/20 text-blue-300 text-xs font-black px-2 py-0.5 rounded-full">
              {placedOrders.length}
            </span>
          </div>

          <div className="p-4 flex-1 overflow-y-auto space-y-4">
            {placedOrders.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs text-center">
                {t('No new orders.', 'አዲስ ትዕዛዝ የለም።')}
              </div>
            ) : (
              placedOrders.map((o) => (
                <OrderCard 
                  key={o.id} 
                  order={o} 
                  t={t} 
                  elapsed={getMinutesElapsed(o.created_at)}
                  onAction={() => updateStatus(o.id, 'preparing')}
                  actionLabel={t('Start Cooking', 'ማዘጋጀት ጀምር')}
                  actionIcon={Play}
                  actionColor="bg-blue-500 hover:bg-blue-400 text-white"
                  onCancel={() => updateStatus(o.id, 'cancelled')}
                />
              ))
            )}
          </div>
        </div>

        {/* Column 2: Preparing */}
        <div className="bg-slate-900/50 border border-slate-850 rounded-2xl flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-amber-500/5 flex items-center justify-between flex-shrink-0">
            <h2 className="font-extrabold text-sm text-amber-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              {t('Preparing', 'በመዘጋጀት ላይ')}
            </h2>
            <span className="bg-amber-500/20 text-amber-300 text-xs font-black px-2 py-0.5 rounded-full">
              {preparingOrders.length}
            </span>
          </div>

          <div className="p-4 flex-1 overflow-y-auto space-y-4">
            {preparingOrders.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs text-center">
                {t('No orders in preparation.', 'በመዘጋጀት ላይ ያለ ትዕዛዝ የለም።')}
              </div>
            ) : (
              preparingOrders.map((o) => (
                <OrderCard 
                  key={o.id} 
                  order={o} 
                  t={t} 
                  elapsed={getMinutesElapsed(o.created_at)}
                  onAction={() => updateStatus(o.id, 'ready')}
                  actionLabel={t('Mark as Ready', 'ተዘጋጅቷል')}
                  actionIcon={Check}
                  actionColor="bg-amber-500 hover:bg-amber-400 text-slate-950"
                  onCancel={() => updateStatus(o.id, 'cancelled')}
                />
              ))
            )}
          </div>
        </div>

        {/* Column 3: Ready (Served wait) */}
        <div className="bg-slate-900/50 border border-slate-850 rounded-2xl flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-green-500/5 flex items-center justify-between flex-shrink-0">
            <h2 className="font-extrabold text-sm text-green-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              {t('Ready to Serve', 'የደረሱ / የሚቀርቡ')}
            </h2>
            <span className="bg-green-500/20 text-green-300 text-xs font-black px-2 py-0.5 rounded-full">
              {readyOrders.length}
            </span>
          </div>

          <div className="p-4 flex-1 overflow-y-auto space-y-4">
            {readyOrders.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs text-center">
                {t('No orders ready for pickup.', 'የደረሰ ምግብ የለም።')}
              </div>
            ) : (
              readyOrders.map((o) => (
                <OrderCard 
                  key={o.id} 
                  order={o} 
                  t={t} 
                  elapsed={getMinutesElapsed(o.created_at)}
                  onAction={() => updateStatus(o.id, 'served')}
                  actionLabel={t('Mark as Served', 'ቀረበ / አስተናግድ')}
                  actionIcon={CheckSquare}
                  actionColor="bg-green-600 hover:bg-green-500 text-white"
                  onCancel={() => updateStatus(o.id, 'cancelled')}
                />
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// Order Card helper component
interface OrderCardProps {
  order: Order;
  t: (en: string, am: string) => string;
  elapsed: number;
  onAction: () => void;
  actionLabel: string;
  actionIcon: React.ComponentType<any>;
  actionColor: string;
  onCancel: () => void;
}

function OrderCard({ 
  order, 
  t, 
  elapsed, 
  onAction, 
  actionLabel, 
  actionIcon: ActionIcon, 
  actionColor, 
  onCancel 
}: OrderCardProps) {
  const isLate = elapsed >= 15;

  return (
    <div className={`bg-slate-950 border rounded-xl overflow-hidden shadow-md transition duration-200 ${
      isLate ? 'border-red-500/40 shadow-red-500/5' : 'border-slate-800 hover:border-slate-700'
    }`}>
      {/* Header */}
      <div className="px-4 py-3 bg-slate-900/60 border-b border-slate-900 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-black text-amber-500 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
            {order.restaurant_tables ? `#${order.restaurant_tables.table_number}` : 'T?'}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {order.id.slice(0, 6).toUpperCase()}
          </span>
        </div>

        {/* Timer */}
        <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
          isLate 
            ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse' 
            : 'bg-slate-800 text-slate-400'
        }`}>
          <Clock className="w-3 h-3" />
          <span>{elapsed}m</span>
        </div>
      </div>

      {/* Body / Items list */}
      <div className="p-4 space-y-3">
        <div className="space-y-2">
          {order.order_items.map((item) => (
            <div key={item.id} className="text-xs flex justify-between items-start">
              <div>
                <p className="font-extrabold text-slate-200">
                  {item.quantity}x {item.menu_items ? t(item.menu_items.name_en, item.menu_items.name_am) : 'Dishes'}
                </p>
                {item.notes && (
                  <p className="text-[10px] text-amber-400 font-medium italic pl-4">
                    ↳ "{item.notes}"
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Global Notes */}
        {order.notes && (
          <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-850 flex items-start gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-200/80 italic leading-normal">
              "{order.notes}"
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-3 py-2 bg-slate-900/30 border-t border-slate-900/80 flex items-center gap-2">
        <button
          onClick={onCancel}
          title={t('Cancel Order', 'ትዕዛዝ ሰርዝ')}
          className="bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 hover:border-red-500/20 p-2 rounded-lg transition"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <button
          onClick={onAction}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-extrabold transition ${actionColor}`}
        >
          <ActionIcon className="w-4 h-4" />
          <span>{actionLabel}</span>
        </button>
      </div>
    </div>
  );
}
