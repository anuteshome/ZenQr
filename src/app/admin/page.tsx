'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useLanguage } from '@/context/LanguageContext';
import { playNewOrderSound } from '@/utils/notificationSound';
import {
  LayoutDashboard,
  Utensils,
  BookOpen,
  Users,
  Package,
  LayoutGrid,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Languages,
  LogOut,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Upload,
  CheckCircle,
  Bell
} from 'lucide-react';

// Interfaces
interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'kitchen' | 'waiter';
  email: string;
  phone: string | null;
  is_active: boolean;
}

interface Category {
  id: string;
  name_en: string;
  name_am: string;
  description_en: string | null;
  description_am: string | null;
  sort_order: number;
}

interface MenuItem {
  id: string;
  category_id: string;
  name_en: string;
  name_am: string;
  description_en: string | null;
  description_am: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
}

interface RestaurantTable {
  id: string;
  table_number: number;
  status: 'active' | 'inactive';
  created_at: string;
}

interface InventoryItem {
  id: string;
  item_name_en: string;
  item_name_am: string;
  quantity: number;
  unit: string;
  reorder_level: number;
}

interface OrderSummary {
  id: string;
  status: string;
  total_price: number;
  created_at: string;
}

export default function AdminDashboard() {
  const { language, setLanguage, t } = useLanguage();
  const supabase = createClient();

  // Auth State
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<
    'overview' | 'tables' | 'categories' | 'menu' | 'employees' | 'inventory'
  >('overview');

  // Data States
  const [restaurantTables, setRestaurantTables] = useState<RestaurantTable[]>([]);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Modal / Form States
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [catNameEn, setCatNameEn] = useState('');
  const [catNameAm, setCatNameAm] = useState('');
  const [catDescEn, setCatDescEn] = useState('');
  const [catDescAm, setCatDescAm] = useState('');
  const [catSort, setCatSort] = useState(0);

  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [itemCatId, setItemCatId] = useState('');
  const [itemNameEn, setItemNameEn] = useState('');
  const [itemNameAm, setItemNameAm] = useState('');
  const [itemDescEn, setItemDescEn] = useState('');
  const [itemDescAm, setItemDescAm] = useState('');
  const [itemPrice, setItemPrice] = useState(0);
  const [itemAvailable, setItemAvailable] = useState(true);
  const [itemFile, setItemFile] = useState<File | null>(null);

  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [empFirstName, setEmpFirstName] = useState('');
  const [empLastName, setEmpLastName] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empPassword, setEmpPassword] = useState('');
  const [empRole, setEmpRole] = useState<'admin' | 'kitchen' | 'waiter'>('waiter');
  const [empPhone, setEmpPhone] = useState('');

  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [selectedInvItem, setSelectedInvItem] = useState<InventoryItem | null>(null);
  const [invNameEn, setInvNameEn] = useState('');
  const [invNameAm, setInvNameAm] = useState('');
  const [invQty, setInvQty] = useState(0);
  const [invUnit, setInvUnit] = useState('');
  const [invReorder, setInvReorder] = useState(0);

  // 1. Check Auth Status
  const checkUserAuth = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
      if (currentUser) {
        // Fetch employee profile
        const { data: emp, error: empErr } = await supabase
          .from('employees')
          .select('role')
          .eq('id', currentUser.id)
          .single();

        if (emp && emp.role === 'admin') {
          setIsAdmin(true);
          fetchAllData();
        } else {
          setIsAdmin(false);
        }
      }
    } catch (err) {
      console.error('Auth check error:', err);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    checkUserAuth();

    // Subscribe to new orders to play alarm in dashboard
    const channel = supabase
      .channel('admin-new-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          playNewOrderSound();
          fetchOverviewStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // 2. Fetch all database data
  const fetchAllData = async () => {
    setDataLoading(true);
    await Promise.all([
      fetchRestaurantTables(),
      fetchCategories(),
      fetchMenuItems(),
      fetchEmployees(),
      fetchInventory(),
      fetchOverviewStats(),
    ]);
    setDataLoading(false);
  };

  const fetchRestaurantTables = async () => {
    const { data } = await supabase
      .from('restaurant_tables')
      .select('*')
      .order('table_number', { ascending: true });
    if (data) setRestaurantTables(data as RestaurantTable[]);
  };

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(newTableNumber, 10);
    if (Number.isNaN(num) || num < 1) {
      alert(t('Enter a valid table number (1 or higher).', 'ትክክለኛ የጠረጴዛ ቁጥር ያስገቡ (1 እና ላይ)።'));
      return;
    }
    try {
      const { error } = await supabase
        .from('restaurant_tables')
        .insert({ table_number: num, status: 'active' });
      if (error) throw error;
      setNewTableNumber('');
      fetchRestaurantTables();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert(t('Could not add table: ', 'ጠረጴዛ ማክል አልተሳካም፡ ') + message);
    }
  };

  const handleToggleTableStatus = async (table: RestaurantTable) => {
    const next = table.status === 'active' ? 'inactive' : 'active';
    try {
      const { error } = await supabase
        .from('restaurant_tables')
        .update({ status: next })
        .eq('id', table.id);
      if (error) throw error;
      fetchRestaurantTables();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert(message);
    }
  };

  const handleDeleteTable = async (id: string, tableNumber: number) => {
    if (
      !confirm(
        t(
          `Delete table ${tableNumber}? Existing orders keep history but new scans will fail until you re-add this number.`,
          `ጠረጴዛ ${tableNumber} ይሰረዝ? የቀድሞ ትዕዛዞች ይቆያሉ፤ ቁጥሩ እንደገና ካልተጨመረ አዲስ ስካን አይሰራም።`
        )
      )
    ) {
      return;
    }
    try {
      const { error } = await supabase.from('restaurant_tables').delete().eq('id', id);
      if (error) throw error;
      fetchRestaurantTables();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      alert(message);
    }
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
    if (data) setCategories(data);
  };

  const fetchMenuItems = async () => {
    const { data } = await supabase.from('menu_items').select('*').order('created_at', { ascending: false });
    if (data) setMenuItems(data);
  };

  const fetchEmployees = async () => {
    const { data } = await supabase.from('employees').select('*').order('created_at', { ascending: false });
    if (data) setEmployees(data);
  };

  const fetchInventory = async () => {
    const { data } = await supabase.from('inventory').select('*').order('quantity', { ascending: true });
    if (data) setInventory(data);
  };

  const fetchOverviewStats = async () => {
    const { data: ords } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (ords) setOrders(ords);
  };

  // 3. Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setLoginError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      
      setUser(data.user);
      const { data: emp, error: empErr } = await supabase
        .from('employees')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (emp && emp.role === 'admin') {
        setIsAdmin(true);
        fetchAllData();
      } else {
        setIsAdmin(false);
        setLoginError(t('Your account is not configured as an Admin in the employees table.', 'የእርስዎ አካውንት በሠራተኞች ሰንጠረዥ ውስጥ እንደ አስተዳዳሪ አልተመዘገበም።'));
      }
    } catch (err: any) {
      setLoginError(err.message || 'Login failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
    setRestaurantTables([]);
    setCategories([]);
    setMenuItems([]);
    setEmployees([]);
    setInventory([]);
    setOrders([]);
  };

  // 4. CRUD operations
  // Categories CRUD
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name_en: catNameEn,
      name_am: catNameAm,
      description_en: catDescEn || null,
      description_am: catDescAm || null,
      sort_order: catSort,
    };

    try {
      if (selectedCategory) {
        // Update
        const { error } = await supabase.from('categories').update(payload).eq('id', selectedCategory.id);
        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase.from('categories').insert(payload);
        if (error) throw error;
      }
      setIsCategoryModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      alert('Error saving category: ' + err.message);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm(t('Are you sure you want to delete this category?', 'ይህን ምድብ ለመሰረዝ እርግጠኛ ነዎት?'))) return;
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      fetchCategories();
    } catch (err: any) {
      alert('Error deleting category: ' + err.message);
    }
  };

  const handleOpenCategoryModal = (cat: Category | null = null) => {
    setSelectedCategory(cat);
    if (cat) {
      setCatNameEn(cat.name_en);
      setCatNameAm(cat.name_am);
      setCatDescEn(cat.description_en || '');
      setCatDescAm(cat.description_am || '');
      setCatSort(cat.sort_order);
    } else {
      setCatNameEn('');
      setCatNameAm('');
      setCatDescEn('');
      setCatDescAm('');
      setCatSort(categories.length + 1);
    }
    setIsCategoryModalOpen(true);
  };

  // Menu Items CRUD
  const handleSaveMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    let imageUrl = selectedMenuItem ? selectedMenuItem.image_url : null;

    try {
      // Handle file upload
      if (itemFile) {
        const fileExt = itemFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `menu/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('menu-images')
          .upload(filePath, itemFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('menu-images')
          .getPublicUrl(filePath);

        imageUrl = publicUrlData.publicUrl;
      }

      const payload = {
        category_id: itemCatId,
        name_en: itemNameEn,
        name_am: itemNameAm,
        description_en: itemDescEn || null,
        description_am: itemDescAm || null,
        price: itemPrice,
        is_available: itemAvailable,
        image_url: imageUrl,
      };

      if (selectedMenuItem) {
        const { error } = await supabase.from('menu_items').update(payload).eq('id', selectedMenuItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('menu_items').insert(payload);
        if (error) throw error;
      }

      setIsMenuModalOpen(false);
      setItemFile(null);
      fetchMenuItems();
    } catch (err: any) {
      alert('Error saving menu item: ' + err.message);
    }
  };

  const handleDeleteMenuItem = async (id: string) => {
    if (!confirm(t('Are you sure you want to delete this dish?', 'ይህን ምግብ ለመሰረዝ እርግጠኛ ነዎት?'))) return;
    try {
      const { error } = await supabase.from('menu_items').delete().eq('id', id);
      if (error) throw error;
      fetchMenuItems();
    } catch (err: any) {
      alert('Error deleting menu item: ' + err.message);
    }
  };

  const handleOpenMenuModal = (item: MenuItem | null = null) => {
    setSelectedMenuItem(item);
    if (item) {
      setItemCatId(item.category_id);
      setItemNameEn(item.name_en);
      setItemNameAm(item.name_am);
      setItemDescEn(item.description_en || '');
      setItemDescAm(item.description_am || '');
      setItemPrice(Number(item.price));
      setItemAvailable(item.is_available);
    } else {
      setItemCatId(categories[0]?.id || '');
      setItemNameEn('');
      setItemNameAm('');
      setItemDescEn('');
      setItemDescAm('');
      setItemPrice(0);
      setItemAvailable(true);
    }
    setItemFile(null);
    setIsMenuModalOpen(true);
  };

  // Employee Add (through Auth and Public table insert)
  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // First, call a custom Supabase signUp to create the employee user.
      // In production, Admins use supabase.auth.admin.createUser via a Server Action/API Route.
      // For sandbox and client-only execution, we trigger standard signUp.
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: empEmail,
        password: empPassword,
      });

      if (signUpError) throw signUpError;

      if (!data.user) throw new Error('User creation returned empty.');

      // Insert employee details in database public.employees table
      const { error: empError } = await supabase.from('employees').insert({
        id: data.user.id,
        first_name: empFirstName,
        last_name: empLastName,
        role: empRole,
        email: empEmail,
        phone: empPhone || null,
        is_active: true,
      });

      if (empError) throw empError;

      alert(t('Employee registered successfully! They will need to verify their email (if enabled) or log in.', 'ሰራተኛው በተሳካ ሁኔታ ተመዝግቧል!'));
      setIsEmployeeModalOpen(false);
      fetchEmployees();
    } catch (err: any) {
      alert('Error adding employee: ' + err.message);
    }
  };

  // Inventory CRUD
  const handleSaveInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      item_name_en: invNameEn,
      item_name_am: invNameAm,
      quantity: invQty,
      unit: invUnit,
      reorder_level: invReorder,
    };

    try {
      if (selectedInvItem) {
        const { error } = await supabase.from('inventory').update(payload).eq('id', selectedInvItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('inventory').insert(payload);
        if (error) throw error;
      }
      setIsInventoryModalOpen(false);
      fetchInventory();
    } catch (err: any) {
      alert('Error saving inventory: ' + err.message);
    }
  };

  const handleOpenInventoryModal = (item: InventoryItem | null = null) => {
    setSelectedInvItem(item);
    if (item) {
      setInvNameEn(item.item_name_en);
      setInvNameAm(item.item_name_am);
      setInvQty(Number(item.quantity));
      setInvUnit(item.unit);
      setInvReorder(Number(item.reorder_level));
    } else {
      setInvNameEn('');
      setInvNameAm('');
      setInvQty(0);
      setInvUnit('pieces');
      setInvReorder(10);
    }
    setIsInventoryModalOpen(true);
  };

  // Render Section Loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-10 h-10 text-amber-500 animate-spin mb-4" />
        <p className="text-sm font-semibold">{t('Verifying Admin Credentials...', 'አስተዳዳሪ ማረጋገጫ በመፈተሽ ላይ...')}</p>
      </div>
    );
  }

  // Render Login Form if not admin
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-amber-500 mb-1">BistroQR Admin</h1>
            <p className="text-xs text-slate-400">
              {t('Sign in to access restaurant panels', 'የአስተዳዳሪ ሰሌዳውን ለመክፈት ይግቡ')}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">
                {t('Email Address', 'ኢሜል አድራሻ')}
              </label>
              <input
                type="email"
                required
                placeholder="admin@restaurant.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500 text-sm transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">
                {t('Password', 'የይለፍ ቃል')}
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500 text-sm transition"
              />
            </div>

            {loginError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 rounded-xl transition text-sm flex items-center justify-center gap-2"
            >
              <span>{t('Sign In', 'ግባ')}</span>
            </button>
          </form>

          {/* Setup Help */}
          <div className="mt-8 pt-6 border-t border-slate-800 text-xs text-slate-400">
            <p className="font-bold text-slate-300 mb-1">{t('Need help setting up?', 'ለማዋቀር እርዳታ ይፈልጋሉ?')}</p>
            <p className="leading-relaxed">
              {t(
                'Make sure you configured authentication and added your profile inside employees table. Refer to step-by-step instructions in supabase_setup_guide.md.',
                'እባክዎ አውቴንቲኬሽን ማዋቀርዎን እና ፕሮፋይልዎን በሠራተኞች ሰንጠረዥ ውስጥ ማስገባትዎን ያረጋግጡ። በ supabase_setup_guide.md ውስጥ ያለውን መመሪያ ይከተሉ።'
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Overview calculations
  const totalRevenue = orders.filter(o => o.status === 'served').reduce((sum, o) => sum + Number(o.total_price), 0);
  const activeOrdersCount = orders.filter(o => o.status !== 'served' && o.status !== 'cancelled').length;
  const lowStockItems = inventory.filter(i => Number(i.quantity) <= Number(i.reorder_level));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col justify-between shrink-0">
        <div>
          <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-black text-amber-500">BistroQR Admin</h1>
              <p className="text-[10px] text-slate-400">{user?.email}</p>
            </div>
            <button
              onClick={() => setLanguage(language === 'en' ? 'am' : 'en')}
              className="p-1.5 bg-slate-850 hover:bg-slate-800 text-amber-500 rounded-lg border border-slate-800 transition"
              title={t('Switch Language', 'ቋንቋ ቀይር')}
            >
              <Languages className="w-4 h-4" />
            </button>
          </div>

          <nav className="p-4 space-y-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition ${
                activeTab === 'overview'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>{t('Dashboard', 'ዳሽቦርድ')}</span>
            </button>

            <button
              onClick={() => setActiveTab('tables')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition ${
                activeTab === 'tables'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>{t('Tables & QR', 'ጠረጴዛዎች እና QR')}</span>
            </button>

            <button
              onClick={() => setActiveTab('categories')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition ${
                activeTab === 'categories'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>{t('Menu Categories', 'የምግብ ምድቦች')}</span>
            </button>

            <button
              onClick={() => setActiveTab('menu')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition ${
                activeTab === 'menu'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Utensils className="w-4 h-4" />
              <span>{t('Menu Items', 'የምግብ ዝርዝሮች')}</span>
            </button>

            <button
              onClick={() => setActiveTab('employees')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition ${
                activeTab === 'employees'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>{t('Employees', 'ሰራተኞች')}</span>
            </button>

            <button
              onClick={() => setActiveTab('inventory')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition ${
                activeTab === 'inventory'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>{t('Inventory', 'ኢንቬንተሪ')}</span>
            </button>
          </nav>
        </div>

        {/* Logout */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-850 hover:bg-red-500/10 hover:text-red-400 text-slate-400 border border-slate-800 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t('Logout', 'ውጣ')}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 bg-slate-950 p-6 md:p-8 overflow-y-auto max-h-screen">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <h2 className="text-xl font-black">{t('Overview Dashboard', 'አጠቃላይ ዳሽቦርድ')}</h2>
              <button 
                onClick={fetchAllData}
                className="text-xs bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition"
              >
                {t('Refresh Stats', 'ዳታዎችን አድስ')}
              </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-md">
                <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">{t('Served Revenue', 'የተስተናገደ ገቢ')}</p>
                  <p className="text-xl font-black text-slate-100 mt-0.5">{totalRevenue.toFixed(2)} ETB</p>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-md">
                <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl border border-blue-500/20">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">{t('Active Orders', 'ንቁ ትዕዛዞች')}</p>
                  <p className="text-xl font-black text-slate-100 mt-0.5">{activeOrdersCount}</p>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-md">
                <div className={`p-3 rounded-xl border ${
                  lowStockItems.length > 0 ? 'bg-red-500/10 text-red-500 border-red-500/20 animate-pulse' : 'bg-green-500/10 text-green-500 border-green-500/20'
                }`}>
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">{t('Low Stock Items', 'ያለቁ/ያነሱ ግብዓቶች')}</p>
                  <p className="text-xl font-black text-slate-100 mt-0.5">{lowStockItems.length}</p>
                </div>
              </div>
            </div>

            {/* Recent Orders List */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
              <h3 className="font-extrabold text-sm text-slate-200 border-b border-slate-850 pb-3 mb-4">{t('Recent Order Activity', 'የቅርብ ጊዜ እንቅስቃሴዎች')}</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-800">
                      <th className="py-2.5 font-bold uppercase tracking-wider">{t('Order ID', 'ትዕዛዝ ቁጥር')}</th>
                      <th className="py-2.5 font-bold uppercase tracking-wider">{t('Status', 'ሁኔታ')}</th>
                      <th className="py-2.5 font-bold uppercase tracking-wider">{t('Total Price', 'ዋጋ')}</th>
                      <th className="py-2.5 font-bold uppercase tracking-wider">{t('Time', 'ሰዓት')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {orders.slice(0, 5).map((o) => (
                      <tr key={o.id} className="text-slate-300">
                        <td className="py-3 font-mono">{o.id.slice(0, 8).toUpperCase()}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            o.status === 'served' ? 'bg-green-500/20 text-green-400' :
                            o.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                            'bg-amber-500/20 text-amber-400 animate-pulse'
                          }`}>
                            {o.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 font-semibold">{o.total_price} ETB</td>
                        <td className="py-3 text-slate-500">{new Date(o.created_at).toLocaleTimeString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TABLES TAB */}
        {activeTab === 'tables' && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-xl font-black">{t('Restaurant Tables', 'የምግብ ቤት ጠረጴዛዎች')}</h2>
              <p className="text-xs text-slate-400 mt-1">
                {t(
                  'Each table gets a menu link and QR code on the home page. Customers scan to order.',
                  'እያንዳንዱ ጠረጴዛ በመነሻ ገጽ ላይ ሜኑ ሊንክ እና QR ኮድ ያገኛል። ደንበኞች በስካን ያዘጋጁ።'
                )}
              </p>
            </div>

            <form
              onSubmit={handleAddTable}
              className="flex flex-col sm:flex-row gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl"
            >
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  {t('Table number', 'የጠረጴዛ ቁጥር')}
                </label>
                <input
                  type="number"
                  min={1}
                  value={newTableNumber}
                  onChange={(e) => setNewTableNumber(e.target.value)}
                  placeholder="e.g. 6"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
              <button
                type="submit"
                className="sm:self-end bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-5 py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-sm"
              >
                <Plus className="w-4 h-4" />
                <span>{t('Add Table', 'ጠረጴዛ ጨምር')}</span>
              </button>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {restaurantTables.map((tbl) => (
                <div
                  key={tbl.id}
                  className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-amber-500">#{tbl.table_number}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        tbl.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-slate-800 text-slate-500 border-slate-700'
                      }`}
                    >
                      {tbl.status === 'active'
                        ? t('Active', 'ንቁ')
                        : t('Inactive', 'አይሰራም')}
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-slate-500 truncate">
                    /table/{tbl.table_number}
                  </p>
                  <div className="flex gap-2 mt-auto">
                    <button
                      type="button"
                      onClick={() => handleToggleTableStatus(tbl)}
                      className="flex-1 text-xs font-bold py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                    >
                      {tbl.status === 'active'
                        ? t('Deactivate', 'አቦዝን')
                        : t('Activate', 'አንቅ')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTable(tbl.id, tbl.table_number)}
                      className="p-2 bg-slate-800 hover:bg-red-500/10 text-red-500 rounded-lg border border-slate-700 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {restaurantTables.length === 0 && (
              <p className="text-center text-sm text-slate-500 py-8">
                {t('No tables yet. Add your first table above.', 'ጠረጴዛ የለም። ከላይ የመጀመሪያውን ይጨምሩ።')}
              </p>
            )}
          </div>
        )}

        {/* CATEGORIES TAB */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <h2 className="text-xl font-black">{t('Menu Categories', 'የምግብ ምድቦች ማስተዳደሪያ')}</h2>
              <button
                onClick={() => handleOpenCategoryModal(null)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold px-4 py-2 rounded-xl flex items-center gap-1.5 transition"
              >
                <Plus className="w-4 h-4" />
                <span>{t('Add Category', 'ምድብ ጨምር')}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {categories.map((cat) => (
                <div key={cat.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex justify-between items-start">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-200">{t(cat.name_en, cat.name_am)}</h3>
                    <p className="text-xs text-slate-400 mt-1">{t(cat.description_en || '', cat.description_am || '')}</p>
                    <span className="inline-block bg-slate-800 border border-slate-700 text-slate-300 text-[10px] px-2 py-0.5 rounded-full mt-3">
                      {t(`Sort Order: ${cat.sort_order}`, `ቅደም ተከተል: ${cat.sort_order}`)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenCategoryModal(cat)}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="p-2 bg-slate-800 hover:bg-red-500/10 text-red-500 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MENU ITEMS TAB */}
        {activeTab === 'menu' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <h2 className="text-xl font-black">{t('Menu Items Management', 'የምግብ ዝርዝር ማስተዳደሪያ')}</h2>
              <button
                onClick={() => handleOpenMenuModal(null)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold px-4 py-2 rounded-xl flex items-center gap-1.5 transition"
              >
                <Plus className="w-4 h-4" />
                <span>{t('Add Dish', 'አዲስ ምግብ ጨምር')}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {menuItems.map((item) => {
                const cat = categories.find(c => c.id === item.category_id);
                return (
                  <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex gap-4 items-start">
                    {/* Preview box */}
                    <div className="w-20 h-20 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name_en} className="w-full h-full object-cover" />
                      ) : (
                        <Utensils className="w-6 h-6 text-slate-700" />
                      )}
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-extrabold text-sm text-slate-200 truncate">{t(item.name_en, item.name_am)}</h3>
                        <span className="font-extrabold text-xs text-amber-500 shrink-0">{item.price} ETB</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{t(item.description_en || '', item.description_am || '')}</p>
                      
                      <div className="flex items-center justify-between mt-3">
                        <span className="bg-slate-800 border border-slate-750 text-[10px] text-slate-300 px-2.5 py-0.5 rounded-full font-bold">
                          {cat ? t(cat.name_en, cat.name_am) : 'Unknown Category'}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenMenuModal(item)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteMenuItem(item.id)}
                            className="p-1.5 bg-slate-800 hover:bg-red-500/10 text-red-500 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* EMPLOYEES TAB */}
        {activeTab === 'employees' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <h2 className="text-xl font-black">{t('Employee Management', 'የሰራተኞች መቆጣጠሪያ')}</h2>
              <button
                onClick={() => {
                  setEmpFirstName('');
                  setEmpLastName('');
                  setEmpEmail('');
                  setEmpPassword('');
                  setEmpPhone('');
                  setEmpRole('waiter');
                  setIsEmployeeModalOpen(true);
                }}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold px-4 py-2 rounded-xl flex items-center gap-1.5 transition"
              >
                <Plus className="w-4 h-4" />
                <span>{t('Register Employee', 'አዲስ ሰራተኛ መዝግብ')}</span>
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-855 bg-slate-850/50">
                      <th className="p-4 font-bold uppercase tracking-wider">{t('Name', 'ስም')}</th>
                      <th className="p-4 font-bold uppercase tracking-wider">{t('Role', 'የስራ ድርሻ')}</th>
                      <th className="p-4 font-bold uppercase tracking-wider">{t('Email', 'ኢሜል')}</th>
                      <th className="p-4 font-bold uppercase tracking-wider">{t('Phone', 'ስልክ')}</th>
                      <th className="p-4 font-bold uppercase tracking-wider">{t('Status', 'ሁኔታ')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {employees.map((emp) => (
                      <tr key={emp.id} className="text-slate-300">
                        <td className="p-4 font-semibold">{emp.first_name} {emp.last_name}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                            emp.role === 'admin' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/20' :
                            emp.role === 'kitchen' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20' :
                            'bg-blue-500/20 text-blue-400 border border-blue-500/20'
                          }`}>
                            {emp.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 text-slate-400">{emp.email}</td>
                        <td className="p-4 text-slate-400">{emp.phone || '-'}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            emp.is_active ? 'bg-green-500/20 text-green-400' : 'bg-slate-800 text-slate-500'
                          }`}>
                            {emp.is_active ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* INVENTORY TAB */}
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <h2 className="text-xl font-black">{t('Inventory Management', 'የግብዓቶች ክምችት (ኢንቬንተሪ)')}</h2>
              <button
                onClick={() => handleOpenInventoryModal(null)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold px-4 py-2 rounded-xl flex items-center gap-1.5 transition"
              >
                <Plus className="w-4 h-4" />
                <span>{t('Add Stock Item', 'አዲስ ግብዓት ጨምር')}</span>
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-855 bg-slate-850/50">
                      <th className="p-4 font-bold uppercase tracking-wider">{t('Ingredient Name', 'የግብዓቱ ስም')}</th>
                      <th className="p-4 font-bold uppercase tracking-wider">{t('Quantity Available', 'ያለው መጠን')}</th>
                      <th className="p-4 font-bold uppercase tracking-wider">{t('Reorder Level', 'ማስጠንቀቂያ መጠን')}</th>
                      <th className="p-4 font-bold uppercase tracking-wider text-right">{t('Actions', 'ድርጊቶች')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {inventory.map((item) => {
                      const isLow = Number(item.quantity) <= Number(item.reorder_level);
                      return (
                        <tr key={item.id} className={`text-slate-300 transition ${isLow ? 'bg-red-500/5' : ''}`}>
                          <td className="p-4 font-semibold">
                            <span className="block">{t(item.item_name_en, item.item_name_am)}</span>
                          </td>
                          <td className={`p-4 font-extrabold text-sm ${isLow ? 'text-red-400' : 'text-slate-200'}`}>
                            {item.quantity} {item.unit}
                            {isLow && (
                              <span className="ml-2 text-[9px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full border border-red-500/20 inline-flex items-center gap-0.5 animate-pulse">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                LOW
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-slate-400 font-bold">{item.reorder_level} {item.unit}</td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => handleOpenInventoryModal(item)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* CATEGORY MODAL */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
            <h3 className="text-base font-black text-slate-100 mb-4">
              {selectedCategory ? t('Edit Category', 'ምድብ ማስተካከል') : t('Create New Category', 'አዲስ ምድብ መፍጠር')}
            </h3>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                  Name (English)
                </label>
                <input
                  type="text"
                  required
                  value={catNameEn}
                  onChange={(e) => setCatNameEn(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                  ስም (በአማርኛ)
                </label>
                <input
                  type="text"
                  required
                  value={catNameAm}
                  onChange={(e) => setCatNameAm(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                  Description (English)
                </label>
                <textarea
                  value={catDescEn}
                  onChange={(e) => setCatDescEn(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500 text-xs h-16 resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                  መግለጫ (በአማርኛ)
                </label>
                <textarea
                  value={catDescAm}
                  onChange={(e) => setCatDescAm(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500 text-xs h-16 resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                  {t('Sort Order Value', 'ቅደም ተከተል ቅድሚያ መስጫ')}
                </label>
                <input
                  type="number"
                  required
                  value={catSort}
                  onChange={(e) => setCatSort(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2 rounded-xl text-xs transition"
                >
                  {t('Cancel', 'ሰርዝ')}
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition"
                >
                  {t('Save Category', 'ምድብ አስቀምጥ')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MENU ITEM MODAL */}
      {isMenuModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 relative shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-black text-slate-100 mb-4">
              {selectedMenuItem ? t('Edit Menu Item', 'ምግብ ማስተካከል') : t('Add New Dish', 'አዲስ ምግብ ጨምር')}
            </h3>

            <form onSubmit={handleSaveMenuItem} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                  {t('Category', 'ምድብ')}
                </label>
                <select
                  required
                  value={itemCatId}
                  onChange={(e) => setItemCatId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500 text-xs"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{t(c.name_en, c.name_am)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                  Name (English)
                </label>
                <input
                  type="text"
                  required
                  value={itemNameEn}
                  onChange={(e) => setItemNameEn(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                  ስም (በአማርኛ)
                </label>
                <input
                  type="text"
                  required
                  value={itemNameAm}
                  onChange={(e) => setItemNameAm(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                  Description (English)
                </label>
                <textarea
                  value={itemDescEn}
                  onChange={(e) => setItemDescEn(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500 text-xs h-16 resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                  መግለጫ (በአማርኛ)
                </label>
                <textarea
                  value={itemDescAm}
                  onChange={(e) => setItemDescAm(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500 text-xs h-16 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                    {t('Price (ETB)', 'ዋጋ (ብር)')}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={itemPrice}
                    onChange={(e) => setItemPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500 text-xs"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={itemAvailable}
                      onChange={(e) => setItemAvailable(e.target.checked)}
                      className="rounded border-slate-850 text-amber-500 bg-slate-950 focus:ring-amber-500 w-4 h-4"
                    />
                    <span>{t('Available', 'አለ')}</span>
                  </label>
                </div>
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                  {t('Dish Image Upload', 'የምግብ ፎቶ ማያያዣ')}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setItemFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                    id="menu-file-input"
                  />
                  <label
                    htmlFor="menu-file-input"
                    className="bg-slate-950 border border-slate-800 px-4 py-2 rounded-lg text-xs text-slate-300 cursor-pointer hover:bg-slate-900 transition flex items-center gap-2 border-dashed"
                  >
                    <Upload className="w-4 h-4 text-amber-500" />
                    <span>{itemFile ? itemFile.name : t('Choose Image', 'ፎቶ ይምረጡ')}</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setIsMenuModalOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2 rounded-xl text-xs transition"
                >
                  {t('Cancel', 'ሰርዝ')}
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition"
                >
                  {t('Save Dish', 'ምግብ አስቀምጥ')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EMPLOYEE MODAL */}
      {isEmployeeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
            <h3 className="text-base font-black text-slate-100 mb-4">
              {t('Register New Employee', 'አዲስ ሰራተኛ መመዝገቢያ')}
            </h3>

            <form onSubmit={handleSaveEmployee} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={empFirstName}
                    onChange={(e) => setEmpFirstName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={empLastName}
                    onChange={(e) => setEmpLastName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={empEmail}
                  onChange={(e) => setEmpEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={empPassword}
                  onChange={(e) => setEmpPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                    Role
                  </label>
                  <select
                    value={empRole}
                    onChange={(e) => setEmpRole(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500 text-xs"
                  >
                    <option value="waiter">Waiter</option>
                    <option value="kitchen">Kitchen Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                    Phone (Optional)
                  </label>
                  <input
                    type="text"
                    value={empPhone}
                    onChange={(e) => setEmpPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500 text-xs"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setIsEmployeeModalOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2 rounded-xl text-xs transition"
                >
                  {t('Cancel', 'ሰርዝ')}
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition"
                >
                  {t('Save Employee', 'ሰራተኛ መዝግብ')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INVENTORY MODAL */}
      {isInventoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
            <h3 className="text-base font-black text-slate-100 mb-4">
              {selectedInvItem ? t('Edit Inventory Item', 'ግብዓት ማስተካከል') : t('Add Stock Item', 'አዲስ ግብዓት መመዝገቢያ')}
            </h3>

            <form onSubmit={handleSaveInventory} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                  Ingredient (English)
                </label>
                <input
                  type="text"
                  required
                  value={invNameEn}
                  onChange={(e) => setInvNameEn(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                  ግብዓት ስም (በአማርኛ)
                </label>
                <input
                  type="text"
                  required
                  value={invNameAm}
                  onChange={(e) => setInvNameAm(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                    {t('Stock Quantity', 'ያለው መጠን')}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={invQty}
                    onChange={(e) => setInvQty(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                    {t('Unit type', 'የመለኪያ አይነት')}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. kg, liters, pieces"
                    value={invUnit}
                    onChange={(e) => setInvUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                  {t('Reorder Alert Threshold Level', 'የማስጠንቀቂያ ዝቅተኛ መጠን')}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={invReorder}
                  onChange={(e) => setInvReorder(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setIsInventoryModalOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2 rounded-xl text-xs transition"
                >
                  {t('Cancel', 'ሰርዝ')}
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition"
                >
                  {t('Save Stock Item', 'ግብዓት አስቀምጥ')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
