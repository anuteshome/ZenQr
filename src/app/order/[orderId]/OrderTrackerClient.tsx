'use client';

import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { createClient } from '@/utils/supabase/client';
import { 
  Clock, 
  ChefHat, 
  CheckCircle, 
  Utensils, 
  ShoppingBag, 
  ArrowLeft,
  Loader2
} from 'lucide-react';
import Link from 'next/link';

interface OrderTrackerClientProps {
  order: {
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
  orderItems: Array<{
    id: string;
    menu_item_id: string | null;
    quantity: number;
    price_at_order: number;
    notes: string | null;
    menu_items: {
      name_en: string;
      name_am: string;
    } | null;
  }>;
}

export default function OrderTrackerClient({ order: initialOrder, orderItems }: OrderTrackerClientProps) {
  const { t } = useLanguage();
  const [order, setOrder] = useState(initialOrder);
  const supabase = createClient();

  useEffect(() => {
    // 1. Subscribe to order updates in real-time
    const channel = supabase
      .channel(`order-track:${order.id}`)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'orders', 
          filter: `id=eq.${order.id}` 
        },
        (payload: any) => {
          console.log('Order status updated real-time:', payload.new);
          setOrder((prev) => ({
            ...prev,
            status: payload.new.status,
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order.id, supabase]);

  const steps = [
    { 
      key: 'placed', 
      label: t('Order Placed', 'ትዕዛዝ ተቀምጧል'), 
      desc: t('We have received your order.', 'ትዕዛዝዎን በትክክል ተቀብለናል።'),
      icon: Clock,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20'
    },
    { 
      key: 'preparing', 
      label: t('Preparing', 'በመዘጋጀት ላይ'), 
      desc: t('The kitchen is preparing your food.', 'ማእድ ቤቱ ምግብዎን በማዘጋጀት ላይ ነው።'),
      icon: ChefHat,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    },
    { 
      key: 'ready', 
      label: t('Ready to Serve', 'ተዘጋጅቷል'), 
      desc: t('Your order is ready! A waiter will bring it to you shortly.', 'ምግብዎ ደርሷል! አስተናጋጅ አሁን ያመጣልዎታል።'),
      icon: CheckCircle,
      color: 'text-green-400 bg-green-500/10 border-green-500/20'
    },
    { 
      key: 'served', 
      label: t('Served', 'ቀረበ'), 
      desc: t('Enjoy your meal!', 'መልካም ምግብ!'),
      icon: Utensils,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 font-bold'
    }
  ];

  const getStepIndex = (status: string) => {
    if (status === 'cancelled') return -1;
    return steps.findIndex((s) => s.key === status);
  };

  const currentStepIndex = getStepIndex(order.status);

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 px-4 py-6 max-w-md mx-auto">
      {/* Back to menu option */}
      {order.restaurant_tables && (
        <Link 
          href={`/table/${order.restaurant_tables.table_number}`}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 mb-6 w-fit transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t('Back to Menu', 'ወደ ምናሌ ተመለስ')}</span>
        </Link>
      )}

      {/* Main Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl mb-6 relative overflow-hidden">
        {/* Glow behind */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-3xl rounded-full -mr-10 -mt-10" />

        <div className="flex justify-between items-start mb-4 relative z-10">
          <div>
            <h1 className="text-xl font-black text-slate-100 flex items-center gap-2">
              <span>{t('Order Status', 'የትዕዛዝ ሁኔታ')}</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-bold mt-1">
              ID: {order.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
          {order.restaurant_tables && (
            <span className="bg-amber-500 text-slate-950 font-black text-xs px-3 py-1 rounded-full">
              {t(`Table ${order.restaurant_tables.table_number}`, `ጠረጴዛ ${order.restaurant_tables.table_number}`)}
            </span>
          )}
        </div>

        {order.status === 'cancelled' ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center my-6">
            <h3 className="font-bold text-red-400">{t('Order Cancelled', 'ትዕዛዝ ተሰርዟል')}</h3>
            <p className="text-xs text-slate-400 mt-1">
              {t('This order has been cancelled by staff.', 'ይህ ትዕዛዝ በሰራተኞች ተሰርዟል።')}
            </p>
          </div>
        ) : (
          /* Timeline Steps */
          <div className="my-8 relative pl-8 space-y-8 before:content-[''] before:absolute before:left-3.5 before:top-2.5 before:bottom-2.5 before:w-0.5 before:bg-slate-800">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isCompleted = index < currentStepIndex;
              const isActive = index === currentStepIndex;
              const isUpcoming = index > currentStepIndex;

              return (
                <div key={step.key} className="relative transition duration-300">
                  {/* Circle Indicator */}
                  <span className={`absolute -left-8.5 top-0.5 w-7.5 h-7.5 rounded-full flex items-center justify-center border transition-all duration-300 z-10 ${
                    isActive 
                      ? 'bg-amber-500 border-amber-400 text-slate-950 scale-110 shadow-lg shadow-amber-500/20 animate-pulse'
                      : isCompleted 
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}>
                    {isCompleted ? (
                      <span className="text-xs font-black">✓</span>
                    ) : (
                      <StepIcon className="w-3.5 h-3.5" />
                    )}
                  </span>

                  {/* Connecting line glow */}
                  {isCompleted && (
                    <span className="absolute -left-5 top-5 w-0.5 h-10.5 bg-emerald-500 -z-10" />
                  )}

                  {/* Content */}
                  <div className={`transition ${
                    isActive 
                      ? 'opacity-100 scale-[1.01]' 
                      : isCompleted 
                        ? 'opacity-80' 
                        : 'opacity-40'
                  }`}>
                    <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                      {step.label}
                      {isActive && (
                        <span className="inline-flex h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                      )}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 pr-2">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Status Pulsing Banner */}
        {order.status !== 'cancelled' && order.status !== 'served' && (
          <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl">
            <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
            <p className="text-xs text-amber-200/80 font-medium">
              {t('Page updates in real-time. Keep this screen open!', 'ይህ ገጽ ራሱኑ ያድሳል፤ ገጹን ክፍት አድርገው ይጠብቁ!')}
            </p>
          </div>
        )}
      </div>

      {/* Order Items Breakdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <h2 className="font-extrabold text-sm text-slate-100 border-b border-slate-800 pb-3 mb-3 flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-amber-500" />
          <span>{t('Your Ordered Items', 'ያዘዟቸው ምግቦች')}</span>
        </h2>

        <div className="space-y-3">
          {orderItems.map((item) => (
            <div key={item.id} className="flex justify-between items-start text-xs">
              <div>
                <p className="font-bold text-slate-200">
                  {item.quantity}x {item.menu_items ? t(item.menu_items.name_en, item.menu_items.name_am) : t('Item', 'ምግብ')}
                </p>
                {item.notes && (
                  <p className="text-[10px] text-amber-400 italic mt-0.5">
                    ({item.notes})
                  </p>
                )}
              </div>
              <span className="font-semibold text-slate-400">
                {(item.price_at_order * item.quantity).toFixed(2)} ETB
              </span>
            </div>
          ))}
        </div>

        {order.notes && (
          <div className="border-t border-slate-800 mt-4 pt-3">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">{t('Table Note', 'አጠቃላይ ማስታወሻ')}</p>
            <p className="text-xs text-amber-400/80 italic mt-0.5">"{order.notes}"</p>
          </div>
        )}

        <div className="border-t border-slate-800 mt-4 pt-3 flex justify-between items-center text-sm">
          <span className="font-bold text-slate-300">{t('Total Amount', 'የተከፈለ ጠቅላላ')}</span>
          <span className="font-black text-amber-400 text-base">
            {order.total_price} ETB
          </span>
        </div>
      </div>
    </div>
  );
}
