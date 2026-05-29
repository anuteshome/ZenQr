# Supabase & Next.js Backend Configuration Guide

This guide explains step-by-step how to set up the backend for the **Restaurant QR Code Ordering & Management System** using Supabase and integrate it into a Next.js application.

---

## Step 1: Create a Supabase Project

1. Go to [database.new](https://database.new) or log in to the [Supabase Dashboard](https://db.supabase.com).
2. Click **New Project** and select your Organization.
3. Configure the project details:
   - **Name**: `restaurant-qr-ordering`
   - **Database Password**: *Securely generate and save this password*
   - **Region**: Choose the region closest to your target audience.
4. Click **Create new project** and wait for database provisioning (takes ~1-2 minutes).

---

## Step 2: Initialize Database Schema

We have created a full schema file for you at [schema.sql](file:///c:/Users/hp/Documents/Projects/schema.sql). It defines:
- **Enums**: `order_status` (`placed`, `preparing`, `ready`, `served`, `cancelled`) and `employee_role` (`admin`, `kitchen`, `waiter`).
- **Tables**: `restaurant_tables`, `categories`, `menu_items`, `orders`, `order_items`, `employees`, and `inventory`.
- **Triggers**: Automatic `updated_at` time updating.
- **Helper Functions**: `get_user_role()` to authenticate RBAC (Role-Based Access Control) in security policies.
- **Row Level Security (RLS) Policies**: Restricting write operations to specific roles (e.g., only Admin can edit menu items, Kitchen/Admin can read inventory, etc.).
- **Realtime publication**: Setup for the `orders` and `order_items` tables to support real-time sync.

### How to apply this schema:
1. In the Supabase sidebar, click on **SQL Editor**.
2. Click **New query** (or **New blank query**).
3. Copy the entire content of [schema.sql](file:///c:/Users/hp/Documents/Projects/schema.sql) and paste it into the editor.
4. Click **Run** (or press `Cmd + Enter` / `Ctrl + Enter`).
5. Ensure the query runs successfully with no errors.

### Add or change tables

**In the app (recommended):** Log in to **Admin** → **Tables & QR** → enter a table number → **Add Table**. Active tables appear on the home page with QR codes.

**In Supabase SQL Editor:**

```sql
INSERT INTO restaurant_tables (table_number, status) VALUES (6, 'active');
```

Table numbers must be unique. Customers use `/table/6` (or your deployed link + `/table/6`).

### Kitchen / order tracking not syncing?
If phone orders do not appear on `/kitchen`, or the customer status page stays on **placed** after the kitchen updates an order, run [supabase_fix_kitchen_tracking.sql](file:///c:/Users/hp/Documents/Projects/supabase_fix_kitchen_tracking.sql) in the SQL Editor. The kitchen board does not use employee login, so extra RLS policies are required.

Also confirm **Authentication → Providers → Anonymous Sign-ins** is enabled so customers can place orders from phones.

---

## Step 3: Configure Authentication

To support seamless ordering for Customers (no login details required) and secure panels for Employees (Admin, Kitchen, Waiters), we configure two auth pathways:

### A. Enable Anonymous Sign-ins (For Customers)
Anonymous authentication ensures customers can place orders and track their specific order status securely using RLS, without needing to create an account.
1. In the Supabase Dashboard, go to **Authentication** > **Providers** > **Anonymous Sign-ins**.
2. Toggle **Enable Anonymous Sign-ins** to **ON**.
3. Save the changes.

### B. Setup Employee / Admin Sign-ins
Employees use standard email and password authentication. To create an Admin or Employee account:
1. Go to **Authentication** > **Users** > **Add User** > **Create User**.
2. Enter the employee's email and password.
3. Note the newly created User ID (`UUID`).
4. Go to the **SQL Editor** and run the following insert command to grant roles (replace placeholder values):
   ```sql
   INSERT INTO public.employees (id, first_name, last_name, role, email, phone)
   VALUES (
     'PASTE_AUTH_USER_UUID_HERE', 
     'John', 
     'Doe', 
     'admin', -- Can be 'admin', 'kitchen', or 'waiter'
     'admin@restaurant.com', 
     '+251911234567'
   );
   ```

---

## Step 4: Configure Storage (Menu Item Photos)

1. In the Supabase Dashboard, navigate to **Storage** in the sidebar.
2. Click **New Bucket**.
3. Configure the bucket:
   - **Bucket Name**: `menu-images`
   - **Allowed MIME types**: `image/*`
   - **Public Bucket**: **Toggle ON** (This makes menu photos publicly readable via URL).
4. Click **Save**.
5. Add an RLS Policy to restrict writes to Admins:
   - Click **Policies** under Storage.
   - Click **New Policy** under the `menu-images` bucket.
   - Choose **For full customization (allowed operations, roles...)**.
   - **Policy Name**: `Allow admin full access, public read`
   - **Allowed operations**: Select **INSERT, UPDATE, DELETE** (SELECT is already public).
   - **Target roles**: `authenticated`
   - **Expression (USING / WITH CHECK)**:
     ```sql
     (select public.get_user_role() = 'admin')
     ```
   - Click **Save Policy**.

---

## Step 5: Configure Next.js Environment Variables

Copy your Supabase project credentials from **Project Settings** > **API**. Create a `.env.local` file in the root of your Next.js application:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Step 6: Next.js Client Integration

Install the required Supabase packages in your Next.js project:

```bash
npm install @supabase/supabase-js @supabase/ssr
```

### 1. Creating the Browser Client (Client Components)
Create a file at `utils/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr';

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
```

### 2. Creating the Server Client (Server Components, Route Handlers, Server Actions)
Create a file at `utils/supabase/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const createClient = () => {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method can be called from Server Components,
            // which cannot write cookies. This can be ignored if you have
            // middleware refreshing sessions.
          }
        },
      },
    }
  );
};
```

### 3. Creating the Proxy (Token/Session Refresh)
Create `src/proxy.ts` (or `proxy.ts` in your root folder):

```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh auth token if necessary
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

---

## Step 7: Implementing Key Real-time Features

### A. Subscribing to New Orders (Kitchen Display / Admin Alerts)
To show new orders instantly without page refreshes, use Supabase Realtime in your React/Next.js Client Components:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function KitchenDisplay() {
  const supabase = createClient();
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    // 1. Fetch initial orders
    const fetchOrders = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*, restaurant_tables(table_number)')
        .neq('status', 'served')
        .order('created_at', { ascending: true });
      if (data) setOrders(data);
    };
    fetchOrders();

    // 2. Subscribe to live changes
    const channel = supabase
      .channel('orders-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          console.log('Change received!', payload);
          // Handle Insert, Update, Delete in real-time
          if (payload.eventType === 'INSERT') {
            setOrders((prev) => [...prev, payload.new]);
          } else if (payload.eventType === 'UPDATE') {
            setOrders((prev) =>
              prev.map((order) => (order.id === payload.new.id ? { ...order, ...payload.new } : order))
            );
          } else if (payload.eventType === 'DELETE') {
            setOrders((prev) => prev.filter((order) => order.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Render logic here
}
```

### B. Customer Anonymous Order Placement
Here is how an anonymous customer signs in and places an order:

```typescript
'use client';

import { createClient } from '@/utils/supabase/client';

export default function OrderButton({ tableId, cartItems }) {
  const supabase = createClient();

  const handlePlaceOrder = async () => {
    // 1. Authenticate anonymously if not already signed in
    let { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) return alert('Failed to start anonymous session');
      user = data.user;
    }

    // 2. Create the order
    const total = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select()
      .insert({
        table_id: tableId,
        user_id: user?.id,
        total_price: total,
        status: 'placed'
      })
      .select()
      .single();

    if (orderError) return alert('Order creation failed');

    // 3. Create order items
    const orderItemsPayload = cartItems.map((item) => ({
      order_id: order.id,
      menu_item_id: item.id,
      quantity: item.quantity,
      price_at_order: item.price
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItemsPayload);

    if (itemsError) return alert('Failed to add order items');

    alert('Order placed successfully! Redirecting to order tracking page...');
  };

  return <button onClick={handlePlaceOrder}>Place Order</button>;
}
```
