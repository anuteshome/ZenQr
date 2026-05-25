import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import TableClient from './TableClient';

interface PageProps {
  params: Promise<{ number: string }>;
}

export default async function TablePage({ params }: PageProps) {
  const { number } = await params;
  const tableNumber = parseInt(number, 10);

  if (isNaN(tableNumber)) {
    notFound();
  }

  const supabase = await createClient();

  // 1. Fetch table details
  const { data: table, error: tableError } = await supabase
    .from('restaurant_tables')
    .select('*')
    .eq('table_number', tableNumber)
    .single();

  if (tableError || !table) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-slate-100">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl text-center">
          <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-2xl font-black">!</span>
          </div>
          <h2 className="text-xl font-black text-slate-100 mb-2">Table Not Found in Database</h2>
          <p className="text-xs text-slate-400 leading-relaxed mb-6">
            We successfully reached your Supabase project, but table number <strong>{tableNumber}</strong> does not exist in the <code>restaurant_tables</code> database table. This usually means you haven't run the seed script yet!
          </p>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 text-left text-xs mb-6 space-y-2">
            <p className="font-bold text-amber-500">To fix this in 30 seconds:</p>
            <ol className="list-decimal pl-4 text-slate-300 space-y-1">
              <li>Open your <strong>Supabase Dashboard SQL Editor</strong>.</li>
              <li>Open the file <strong><code>seed.sql</code></strong> in your local workspace.</li>
              <li>Copy its entire content, paste it into the editor, and click <strong>Run</strong>.</li>
            </ol>
          </div>

          <a
            href="/"
            className="inline-flex justify-center items-center w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold py-3 rounded-xl transition"
          >
            Back to Launchpad Home
          </a>
        </div>
      </div>
    );
  }

  // 2. Fetch categories
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });

  // 3. Fetch menu items
  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('*')
    .eq('is_available', true);

  return (
    <TableClient
      table={table}
      categories={categories || []}
      initialMenuItems={menuItems || []}
    />
  );
}
