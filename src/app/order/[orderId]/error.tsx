'use client';

import Link from 'next/link';

export default function OrderError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[100dvh] bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
        <h1 className="text-lg font-black text-slate-100 mb-2">Could not load order</h1>
        <p className="text-sm text-slate-400 mb-6">
          The order may not exist, or the server could not reach the database. If you just
          placed an order, try opening Track again from the menu.
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={reset}
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 rounded-xl"
          >
            Try again
          </button>
          <Link
            href="/"
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 rounded-xl border border-slate-700"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
