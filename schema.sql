-- ==========================================
-- Database Schema for Restaurant QR Ordering
-- ==========================================

-- 1. Create Enums
CREATE TYPE order_status AS ENUM ('placed', 'preparing', 'ready', 'served', 'cancelled');
CREATE TYPE employee_role AS ENUM ('admin', 'kitchen', 'waiter');

-- 2. Create Tables

-- Restaurant Tables
CREATE TABLE restaurant_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_number INT UNIQUE NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Categories
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en TEXT NOT NULL,
    name_am TEXT NOT NULL,
    description_en TEXT,
    description_am TEXT,
    image_url TEXT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Menu Items
CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    name_en TEXT NOT NULL,
    name_am TEXT NOT NULL,
    description_en TEXT,
    description_am TEXT,
    price NUMERIC(10, 2) NOT NULL,
    image_url TEXT,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Orders
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id UUID REFERENCES restaurant_tables(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- linked to anonymous user or employee
    status order_status NOT NULL DEFAULT 'placed',
    total_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Order Items
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    price_at_order NUMERIC(10, 2) NOT NULL, -- capture price at moment of ordering
    notes TEXT
);

-- Employees
CREATE TABLE employees (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role employee_role NOT NULL DEFAULT 'waiter',
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Inventory
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_name_en TEXT NOT NULL,
    item_name_am TEXT NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    unit TEXT NOT NULL, -- e.g., 'kg', 'liters', 'pieces'
    reorder_level NUMERIC(10, 2) NOT NULL DEFAULT 10.00,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Trigger for updated_at column automatic updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 4. Enable Row Level Security (RLS) on all tables
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- 5. Helper Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS employee_role AS $$
    SELECT role FROM public.employees WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 6. Row Level Security (RLS) Policies

-- restaurant_tables policies
CREATE POLICY "Allow public read restaurant_tables" ON restaurant_tables FOR SELECT USING (true);
CREATE POLICY "Allow admin write restaurant_tables" ON restaurant_tables FOR ALL USING (get_user_role() = 'admin');

-- categories policies
CREATE POLICY "Allow public read categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Allow admin write categories" ON categories FOR ALL USING (get_user_role() = 'admin');

-- menu_items policies
CREATE POLICY "Allow public read menu_items" ON menu_items FOR SELECT USING (true);
CREATE POLICY "Allow admin write menu_items" ON menu_items FOR ALL USING (get_user_role() = 'admin');

-- orders policies
CREATE POLICY "Allow customers to view their own orders" ON orders FOR SELECT 
    USING (auth.uid() = user_id OR get_user_role() IN ('admin', 'kitchen', 'waiter'));

CREATE POLICY "Allow customer order creation" ON orders FOR INSERT 
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Allow kitchen, waiter and admin to update orders" ON orders FOR UPDATE 
    USING (get_user_role() IN ('admin', 'kitchen', 'waiter'))
    WITH CHECK (get_user_role() IN ('admin', 'kitchen', 'waiter'));

-- order_items policies
CREATE POLICY "Allow customers/staff to view order items" ON order_items FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_items.order_id 
            AND (orders.user_id = auth.uid() OR get_user_role() IN ('admin', 'kitchen', 'waiter'))
        )
    );

CREATE POLICY "Allow customers to insert order items" ON order_items FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_items.order_id 
            AND (orders.user_id = auth.uid() OR orders.user_id IS NULL)
        )
    );

-- employees policies
CREATE POLICY "Allow employees to view profiles" ON employees FOR SELECT 
    USING (auth.uid() = id OR get_user_role() IN ('admin', 'kitchen', 'waiter'));

CREATE POLICY "Allow admin full control on employees" ON employees FOR ALL 
    USING (get_user_role() = 'admin');

-- inventory policies
CREATE POLICY "Allow admin and kitchen to view inventory" ON inventory FOR SELECT 
    USING (get_user_role() IN ('admin', 'kitchen'));

CREATE POLICY "Allow admin to write inventory" ON inventory FOR ALL 
    USING (get_user_role() = 'admin');

CREATE POLICY "Allow kitchen to update stock level" ON inventory FOR UPDATE 
    USING (get_user_role() = 'kitchen')
    WITH CHECK (get_user_role() = 'kitchen');

-- 7. Realtime Enablement (Supabase replication)
-- Enable realtime for orders and order_items safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr
    JOIN pg_class c ON pr.prrelid = c.oid
    JOIN pg_publication p ON pr.prpubid = p.oid
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr
    JOIN pg_class c ON pr.prrelid = c.oid
    JOIN pg_publication p ON pr.prpubid = p.oid
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'order_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
  END IF;
END $$;
