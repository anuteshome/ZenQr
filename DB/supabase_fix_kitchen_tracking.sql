-- Run this in Supabase SQL Editor if kitchen cannot see orders or status stays "placed"
-- The kitchen page does not require login; these policies allow the board + order tracker to work.

-- Kitchen board: read active orders (no employee login required)
DROP POLICY IF EXISTS "Kitchen board read active orders" ON orders;
CREATE POLICY "Kitchen board read active orders" ON orders
  FOR SELECT
  USING (status IN ('placed', 'preparing', 'ready'));

-- Kitchen board: update status (placed → preparing → ready → served)
DROP POLICY IF EXISTS "Kitchen board update order status" ON orders;
CREATE POLICY "Kitchen board update order status" ON orders
  FOR UPDATE
  USING (status IN ('placed', 'preparing', 'ready'))
  WITH CHECK (status IN ('placed', 'preparing', 'ready', 'served', 'cancelled'));

-- Customer tracker: read any order by ID (works even if phone loses anonymous session)
DROP POLICY IF EXISTS "Public read order for status tracking" ON orders;
CREATE POLICY "Public read order for status tracking" ON orders
  FOR SELECT
  USING (true);

-- Kitchen board: read line items for active orders
DROP POLICY IF EXISTS "Kitchen board read order items" ON order_items;
CREATE POLICY "Kitchen board read order items" ON order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.status IN ('placed', 'preparing', 'ready')
    )
  );

-- Customer tracker: read items for any order
DROP POLICY IF EXISTS "Public read order items for tracking" ON order_items;
CREATE POLICY "Public read order items for tracking" ON order_items
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id)
  );
