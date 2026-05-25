'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { 
  ChefHat, 
  Users, 
  QrCode, 
  ExternalLink, 
  Languages, 
  UtensilsCrossed, 
  Sparkles,
  ArrowRight,
  X,
  Laptop
} from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const { language, setLanguage, t } = useLanguage();

  const tables = [1, 2, 3, 4, 5];

  // QR Modal States
  const [selectedTableForQr, setSelectedTableForQr] = useState<number | null>(null);
  const [localIp, setLocalIp] = useState('localhost');

  const getQrUrl = (tableNum: number) => {
    return `http://${localIp}:3000/table/${tableNum}`;
  };

  const getQrImageUrl = (tableNum: number) => {
    const dataUrl = encodeURIComponent(getQrUrl(tableNum));
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${dataUrl}`;
  };

  return (
    <div className="flex-1 bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden min-h-screen">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-20%] w-[600px] h-[600px] bg-amber-500/5 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-20%] w-[600px] h-[600px] bg-orange-600/5 blur-3xl rounded-full pointer-events-none" />

      {/* Top Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-900 bg-slate-900/50 backdrop-blur-md relative z-10">
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="w-5 h-5 text-amber-500" />
          <span className="text-lg font-black tracking-tight text-slate-100">BistroQR</span>
        </div>
        <button
          onClick={() => setLanguage(language === 'en' ? 'am' : 'en')}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-300 px-3.5 py-1.5 rounded-xl border border-slate-800 transition text-xs font-bold"
        >
          <Languages className="w-4 h-4 text-amber-500" />
          <span>{language === 'en' ? 'አማርኛ' : 'English'}</span>
        </button>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 flex flex-col justify-center relative z-10">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300 font-black tracking-wider uppercase mb-4">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            {t('Restaurant Interactive Demo', 'በይነተገናኝ የምግብ ቤት ማሳያ')}
          </span>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-none bg-gradient-to-r from-slate-100 via-slate-200 to-amber-500 bg-clip-text text-transparent">
            {t('Restaurant QR Code Ordering System', 'የጠረጴዛ በኪውአር ኮድ ማዘዣ ሲስተም')}
          </h1>
          <p className="mt-4 text-sm md:text-base text-slate-400 max-w-xl mx-auto">
            {t(
              'A complete, real-time, bilingual solution for restaurant tables, kitchen display systems, and admin operations.',
              'ለየጠረጴዛዎች ማዘዣ፣ ለማእድ ቤት ማሳያ ሰሌዳ እና ለአስተዳዳሪው ስራዎች የተሟላ የሪል-ታይም ባህላዊና ዘመናዊ ሲስተም'
            )}
          </p>
        </div>

        {/* Section 1: Customer Simulation */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <QrCode className="w-5 h-5 text-amber-500" />
            <h2 className="font-extrabold text-sm text-slate-200 uppercase tracking-wider flex items-center justify-between w-full">
              <span>{t('Customer Side (Simulate Table QR Scan)', 'የደንበኛ ክፍል (የጠረጴዛ ኪውአር ስካን መሞከሪያ)')}</span>
              <span className="text-[10px] text-slate-500 normal-case font-normal hidden sm:inline">
                {t('Click "QR Code" to scan with phone', 'ስልክ ላይ ለመሞከር "QR Code" ይጫኑ')}
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {tables.map((tableNum) => (
              <div
                key={tableNum}
                className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center hover:border-amber-500/30 hover:bg-slate-850/60 transition duration-150 shadow-md flex flex-col items-center justify-between group relative"
              >
                <div className="w-9 h-9 bg-slate-950 rounded-xl flex items-center justify-center border border-slate-850 font-black text-amber-500 text-base">
                  {tableNum}
                </div>
                
                <div className="mt-3 w-full">
                  <p className="text-xs font-black text-slate-200">{t(`Table ${tableNum}`, `ጠረጴዛ ${tableNum}`)}</p>
                  
                  {/* Action Link directly */}
                  <Link
                    href={`/table/${tableNum}`}
                    className="mt-2 w-full bg-slate-950 border border-slate-800 hover:border-amber-500/20 text-slate-300 hover:text-amber-400 py-1 px-2.5 rounded-lg text-[10px] font-bold flex items-center gap-1 justify-center transition"
                  >
                    <span>{t('Go to Menu', 'ምናሌ ክፈት')}</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                  </Link>

                  {/* QR Code Trigger */}
                  <button
                    onClick={() => setSelectedTableForQr(tableNum)}
                    className="mt-1 w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 py-1 px-2.5 rounded-lg text-[9px] font-black tracking-wider uppercase flex items-center gap-1 justify-center transition border border-amber-500/10"
                  >
                    <QrCode className="w-2.5 h-2.5" />
                    <span>QR Code</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Staff Operations */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-amber-500" />
            <h2 className="font-extrabold text-sm text-slate-200 uppercase tracking-wider">
              {t('Staff Operations & Panels', 'የስራተኞች መቆጣጠሪያ ሰሌዳዎች')}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Kitchen */}
            <Link
              href="/kitchen"
              className="bg-slate-900 border border-slate-850 hover:border-amber-500/40 p-6 rounded-2xl flex items-start gap-4 transition duration-150 group shadow-md"
            >
              <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20 group-hover:bg-amber-500 group-hover:text-slate-950 transition">
                <ChefHat className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-extrabold text-sm text-slate-200 group-hover:text-amber-400 transition flex items-center gap-1.5">
                  <span>{t('Kitchen Display Board', 'የማእድ ቤት ማሳያ ሰሌዳ')}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {t(
                    'Real-time order board for the kitchen team. Track, prepare, and organize incoming orders.',
                    'በማእድ ቤት ውስጥ ትዕዛዞችን በሪል-ታይም መከታተያ፣ ማዘጋጃ እና ማስተናገጃ ሰሌዳ።'
                  )}
                </p>
              </div>
            </Link>

            {/* Admin */}
            <Link
              href="/admin"
              className="bg-slate-900 border border-slate-855 hover:border-amber-500/40 p-6 rounded-2xl flex items-start gap-4 transition duration-150 group shadow-md"
            >
              <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl border border-purple-500/20 group-hover:bg-amber-500 group-hover:text-slate-950 transition">
                <Users className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-extrabold text-sm text-slate-200 group-hover:text-amber-400 transition flex items-center gap-1.5">
                  <span>{t('Admin Control Panel', 'የአስተዳዳሪ ሰሌዳ')}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {t(
                    'Manage menus, update translations, invite employees, and monitor live inventory stock levels.',
                    'የምግብ ዝርዝርን በሁለቱም ቋንቋ ማስተካከያ፣ ሰራተኞች መመዝገቢያ እና የግብዓት ክምችት መከታተያ።'
                  )}
                </p>
              </div>
            </Link>
          </div>
        </section>
      </main>

      {/* QR CODE GENERATOR MODAL */}
      {selectedTableForQr !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="absolute inset-0" onClick={() => setSelectedTableForQr(null)} />
          
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 relative z-10 shadow-2xl text-center">
            {/* Close Button */}
            <button
              onClick={() => setSelectedTableForQr(null)}
              className="absolute top-4 right-4 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-xl transition border border-slate-700"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-black text-slate-100 flex items-center gap-1.5 justify-center mb-1">
              <QrCode className="w-5 h-5 text-amber-500" />
              <span>{t(`Table ${selectedTableForQr} QR Code`, `ጠረጴዛ ${selectedTableForQr} ኪውአር ኮድ`)}</span>
            </h3>
            <p className="text-[10px] text-slate-400 leading-normal max-w-[240px] mx-auto mb-6">
              {t('Scan this QR code with your phone camera to open the menu for this table!', 'ይህን ኪውአር ኮድ በስልክዎ ካሜራ በመቅረጽ የዚህን ጠረጴዛ የምግብ ዝርዝር መክፈት ይችላሉ!')}
            </p>

            {/* QR Image Box */}
            <div className="w-48 h-48 bg-white rounded-2xl flex items-center justify-center p-3 mx-auto shadow-lg shadow-black/30 border border-slate-800">
              <img
                src={getQrImageUrl(selectedTableForQr)}
                alt={`Table ${selectedTableForQr} QR Code`}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Simulated URL display */}
            <div className="mt-4 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-850 max-w-xs mx-auto text-[10px] font-mono text-amber-500/80 truncate">
              {getQrUrl(selectedTableForQr)}
            </div>

            {/* IP configuration helper for Mobile scanning */}
            <div className="mt-6 pt-5 border-t border-slate-800/80 text-left text-xs">
              <div className="flex items-start gap-1.5 mb-2 text-slate-400">
                <Laptop className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[10px] leading-snug">
                  {t(
                    'To scan with your real phone, replace "localhost" with your PC\'s Local Wi-Fi IP address below:',
                    'በስልክዎ ለመሞከር "localhost" በሚለው ምትክ የኮምፒውተርዎን ዋይፋይ IP አድራሻ ያስገቡ፡'
                  )}
                </p>
              </div>

              <input
                type="text"
                placeholder="e.g. 192.168.1.15"
                value={localIp}
                onChange={(e) => setLocalIp(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-slate-900 text-center text-[10px] text-slate-500 relative z-10">
        <p>&copy; 2026 BistroQR Systems. {t('All rights reserved.', 'መብቱ በህግ የተጠበቀ ነው።')}</p>
      </footer>
    </div>
  );
}
