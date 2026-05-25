'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useCart } from '@/context/CartContext';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { 
  ShoppingCart, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Languages, 
  ChevronRight, 
  Loader2, 
  Clock, 
  Check,
  AlertTriangle
} from 'lucide-react';

interface TableClientProps {
  table: {
    id: string;
    table_number: number;
    status: string;
  };
  categories: Array<{
    id: string;
    name_en: string;
    name_am: string;
    description_en: string | null;
    description_am: string | null;
  }>;
  initialMenuItems: Array<{
    id: string;
    category_id: string;
    name_en: string;
    name_am: string;
    description_en: string | null;
    description_am: string | null;
    price: number;
    image_url: string | null;
    is_available: boolean;
  }>;
}

export default function TableClient({ table, categories, initialMenuItems }: TableClientProps) {
  const { language, setLanguage, t } = useLanguage();
  const { cart, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, cartCount } = useCart();
  const router = useRouter();
  const supabase = createClient();

  // State
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedItemForModal, setSelectedItemForModal] = useState<any | null>(null);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemNotes, setItemNotes] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');

  // Filter items
  const filteredItems = initialMenuItems.filter((item) => {
    const matchesCategory = selectedCategory ? item.category_id === selectedCategory : true;
    const itemTitle = language === 'en' ? item.name_en : item.name_am;
    const itemDesc = (language === 'en' ? item.description_en : item.description_am) || '';
    const matchesSearch = searchQuery
      ? itemTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        itemDesc.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesCategory && matchesSearch;
  });

  const handleOpenAddModal = (item: any) => {
    setSelectedItemForModal(item);
    setItemQuantity(1);
    setItemNotes('');
  };

  const handleAddToCart = () => {
    if (!selectedItemForModal) return;
    addToCart(
      {
        id: selectedItemForModal.id,
        name_en: selectedItemForModal.name_en,
        name_am: selectedItemForModal.name_am,
        price: Number(selectedItemForModal.price),
      },
      itemQuantity,
      itemNotes
    );
    setSelectedItemForModal(null);
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    setIsSubmittingOrder(true);

    try {
      // 1. Get/Create Anonymous User Session
      let { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const { data, error: authError } = await supabase.auth.signInAnonymously();
        if (authError) {
          throw new Error('Authentication failed: ' + authError.message);
        }
        user = data.user;
      }

      // 2. Insert Order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          table_id: table.id,
          user_id: user?.id || null,
          status: 'placed',
          total_price: cartTotal,
          notes: orderNotes,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 3. Insert Order Items
      const orderItemsPayload = cart.map((item) => ({
        order_id: order.id,
        menu_item_id: item.id,
        quantity: item.quantity,
        price_at_order: item.price,
        notes: item.notes || null,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsPayload);

      if (itemsError) throw itemsError;

      // 4. Success! Clear cart & redirect
      clearCart();
      setIsCartOpen(false);
      router.push(`/order/${order.id}`);
    } catch (err: any) {
      console.error('Error placing order:', err);
      alert(t('Failed to place order. Please try again.', 'ትዕዛዝ ማስተላለፍ አልተሳካም። እባክዎ እንደገና ይሞክሩ።'));
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-amber-500 flex items-center gap-2">
            <span>BistroQR</span>
            <span className="text-xs bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
              {t(`Table ${table.table_number}`, `ጠረጴዛ ${table.table_number}`)}
            </span>
          </h1>
          <p className="text-[10px] text-slate-400">
            {t('Browse and order directly', 'በቀጥታ መርጠው ያዝዙ')}
          </p>
        </div>

        {/* Language Switcher */}
        <button
          onClick={() => setLanguage(language === 'en' ? 'am' : 'en')}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition duration-150 text-xs font-semibold"
        >
          <Languages className="w-4 h-4 text-amber-500" />
          <span>{language === 'en' ? 'አማርኛ' : 'English'}</span>
        </button>
      </header>

      {/* Hero / Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-amber-600/20 to-orange-600/20 px-4 py-8 text-center border-b border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent opacity-50" />
        <h2 className="text-2xl font-black text-slate-100 mb-1 z-10 relative">
          {t('Welcome to Our Restaurant', 'እንኳን ወደ ምግብ ቤታችን በደህና መጡ')}
        </h2>
        <p className="text-sm text-amber-200/80 z-10 relative max-w-md mx-auto">
          {t('Select your favorite dishes and place your order directly. We will handle the rest!', 'የሚወዱትን ምግብ ይምረጡና ትዕዛዝዎን ያስተላልፉ። ቀሪውን ለእኛ ይተውት!')}
        </p>
      </div>

      {/* Search Bar */}
      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={t('Search dishes...', 'ምግቦችን ይፈልጉ...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm transition"
          />
        </div>
      </div>

      {/* Categories Horizontal Scroll */}
      <div className="px-4 py-2 border-b border-slate-900/50">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition ${
              selectedCategory === null
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/10'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
            }`}
          >
            {t('All Items', 'ሁሉም ምግቦች')}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition ${
                selectedCategory === cat.id
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/10'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
              }`}
            >
              {t(cat.name_en, cat.name_am)}
            </button>
          ))}
        </div>
      </div>

      {/* Menu List */}
      <main className="px-4 py-4 flex-1">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500 text-sm">{t('No dishes found.', 'ምንም ምግብ አልተገኘም።')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-row h-28 hover:border-slate-700 transition"
              >
                {/* Image or Placeholder */}
                <div className="w-28 bg-slate-800 relative flex-shrink-0 flex items-center justify-center border-r border-slate-800">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name_en}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-amber-500 font-bold text-2xl opacity-40">
                      {item.name_en.charAt(0)}
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="p-3 flex-1 flex flex-col justify-between overflow-hidden">
                  <div>
                    <h3 className="font-bold text-sm text-slate-100 truncate">
                      {t(item.name_en, item.name_am)}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">
                      {t(item.description_en || '', item.description_am || '')}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-amber-400 text-sm">
                      {item.price} ETB
                    </span>
                    <button
                      onClick={() => handleOpenAddModal(item)}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold p-1 rounded-lg transition"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Floating View Cart Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent z-30">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 px-4 rounded-xl flex items-center justify-between shadow-xl shadow-amber-500/10 transition transform active:scale-[0.98] max-w-md mx-auto"
          >
            <div className="flex items-center gap-2">
              <span className="relative">
                <ShoppingCart className="w-5 h-5" />
                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-extrabold w-4.5 h-4.5 rounded-full flex items-center justify-center border border-slate-950">
                  {cartCount}
                </span>
              </span>
              <span className="text-sm">{t('View Cart', 'ትዕዛዞችን ይመልከቱ')}</span>
            </div>
            <div className="flex items-center gap-1 font-extrabold text-base">
              <span>{cartTotal.toFixed(2)} ETB</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* Add Item Modal */}
      {selectedItemForModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4">
          {/* Overlay closer */}
          <div className="absolute inset-0" onClick={() => setSelectedItemForModal(null)} />

          {/* Modal box */}
          <div className="bg-slate-900 border-t border-slate-800 md:border border-slate-850 rounded-t-3xl md:rounded-2xl w-full max-w-md p-6 relative z-10 animate-slide-up shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100 pr-8">
              {t(selectedItemForModal.name_en, selectedItemForModal.name_am)}
            </h3>
            <p className="text-sm text-slate-400 mt-1 mb-4">
              {t(selectedItemForModal.description_en || '', selectedItemForModal.description_am || '')}
            </p>

            <div className="flex items-center justify-between py-3 border-y border-slate-800 my-4">
              <span className="text-sm text-slate-300 font-semibold">{t('Quantity', 'ብዛት')}</span>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setItemQuantity((q) => Math.max(1, q - 1))}
                  className="bg-slate-800 border border-slate-700 text-slate-200 p-1.5 rounded-lg hover:bg-slate-700 transition"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-extrabold text-lg text-slate-100 w-6 text-center">
                  {itemQuantity}
                </span>
                <button
                  onClick={() => setItemQuantity((q) => q + 1)}
                  className="bg-slate-800 border border-slate-700 text-slate-200 p-1.5 rounded-lg hover:bg-slate-700 transition"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notes */}
            <div className="mb-6">
              <label className="block text-xs text-slate-400 font-bold mb-1 uppercase tracking-wider">
                {t('Special Instructions / Notes', 'ልዩ ማስታወሻ ወይም ትዕዛዝ')}
              </label>
              <textarea
                placeholder={t('e.g., No onions, extra spicy...', 'ምሳሌ፡ ቀይ ሽንኩርት አይግባበት፣ ቃሪያ ይብዛበት...')}
                value={itemNotes}
                onChange={(e) => setItemNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 text-sm h-20 resize-none"
              />
            </div>

            {/* Total / Add button */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{t('Total Price', 'ጠቅላላ ዋጋ')}</p>
                <p className="text-xl font-black text-amber-400">{(selectedItemForModal.price * itemQuantity).toFixed(2)} ETB</p>
              </div>
              <button
                onClick={handleAddToCart}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6 py-3 rounded-xl transition flex items-center gap-2"
              >
                <span>{t('Add to Cart', 'ትዕዛዝ ውስጥ ጨምር')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm">
          {/* Overlay closer */}
          <div className="absolute inset-0" onClick={() => setIsCartOpen(false)} />

          {/* Drawer content */}
          <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl w-full max-w-md h-[90vh] flex flex-col relative z-10 animate-slide-up shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-amber-500" />
                <h3 className="font-extrabold text-slate-100">{t('Your Order', 'የእርስዎ ትዕዛዝ')}</h3>
                <span className="bg-amber-500/20 text-amber-300 text-xs px-2 py-0.5 rounded-full font-bold">
                  {cartCount}
                </span>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-200 font-semibold px-2 py-1 bg-slate-800 border border-slate-700 rounded-md transition"
              >
                {t('Close', 'ዝጋ')}
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.map((item) => (
                <div
                  key={item.id + item.notes}
                  className="bg-slate-950/60 border border-slate-850 p-3 rounded-xl flex flex-col justify-between"
                >
                  <div className="flex justify-between items-start">
                    <div className="pr-4">
                      <h4 className="font-bold text-sm text-slate-100">
                        {t(item.name_en, item.name_am)}
                      </h4>
                      {item.notes && (
                        <p className="text-xs text-amber-400/90 italic mt-0.5">
                          {t('Note: ', 'ማስታወሻ፡ ')} {item.notes}
                        </p>
                      )}
                    </div>
                    <span className="font-extrabold text-sm text-slate-200 whitespace-nowrap">
                      {(item.price * item.quantity).toFixed(2)} ETB
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-3 border-t border-slate-900 pt-2">
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-500 hover:text-red-400 p-1 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="bg-slate-800 text-slate-300 p-1 rounded-md hover:bg-slate-700 transition"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-bold text-sm text-slate-100 w-4 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="bg-slate-800 text-slate-300 p-1 rounded-md hover:bg-slate-700 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* General Order Notes */}
              <div className="pt-2">
                <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">
                  {t('General Order Notes (Optional)', 'አጠቃላይ የትዕዛዝ ማስታወሻ (አማራጭ)')}
                </label>
                <textarea
                  placeholder={t('e.g., Deliver all items together, extra napkins...', 'ምሳሌ፡ ሁሉንም ምግቦች በአንድ ላይ አምጡልን፣ ተጨማሪ ሶፍት...')}
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 text-xs h-16 resize-none"
                />
              </div>
            </div>

            {/* Footer Summary & Checkout */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex-shrink-0">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-slate-400">{t('Total (VAT inclusive)', 'ጠቅላላ (ተ.እ.ታ ጨምሮ)')}</span>
                <span className="text-xl font-black text-amber-500">{cartTotal.toFixed(2)} ETB</span>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={isSubmittingOrder}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 text-slate-950 disabled:text-slate-500 font-black py-3.5 rounded-xl transition flex items-center justify-center gap-2"
              >
                {isSubmittingOrder ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{t('Sending Order...', 'ትዕዛዝ በመላክ ላይ...')}</span>
                  </>
                ) : (
                  <>
                    <span>{t('Send Order to Kitchen', 'ትዕዛዙን ወደ ማእድ ቤት ላክ')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
