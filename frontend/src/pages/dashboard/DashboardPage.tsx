import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Barcode,
  Archive,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  UserCheck,
  PlusCircle,
  ArrowRightLeft,
  Users,
  Search,
  ArrowUpRight,
  Library,
} from 'lucide-react';
import { apiRequest } from '@/lib/api';

interface DashboardStats {
  total_biblios: number;
  total_items: number;
  active_loans: number;
  available_items: number;
  overdue_loans_count: number;
  total_members: number;
  today_visitors: number;
  unpaid_fines_total: number;
  trends: {
    day: string;
    date: string;
    pinjam: number;
    kembali: number;
    perpanjang: number;
  }[];
}

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<DashboardStats>('/stats/dashboard');
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Cockpit Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 font-sans">
              Dashboard Operasional
            </h1>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-500 uppercase">
              Real-time
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Monitoring sirkulasi buku, katalog bibliografi, dan lalu lintas pengunjung perpustakaan.
          </p>
        </div>

        {/* Action Triggers */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/admin/circulation"
            className="px-3.5 py-1.5 bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 rounded-md text-xs font-semibold shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sirkulasi [F2]</span>
          </Link>
          <Link
            to="/admin/circulation/quick-return"
            className="px-3.5 py-1.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Return Kilat [F3]</span>
          </Link>
          <button
            onClick={fetchStats}
            disabled={loading}
            className="p-1.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors shadow-2xs"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Overdue Warning Strip (Minimalist Monochrome with subtle alert badge) */}
      {stats && stats.overdue_loans_count > 0 && (
        <div className="p-3.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950">
              ALERT
            </span>
            <span className="text-zinc-700 dark:text-zinc-300">
              Terdapat <strong className="text-zinc-950 dark:text-zinc-50 font-mono">{stats.overdue_loans_count}</strong> pinjaman melewati batas tempo pengembalian.
            </span>
          </div>
          <Link
            to="/admin/circulation/overdues"
            className="font-medium underline hover:text-zinc-600 dark:hover:text-zinc-300 flex items-center gap-1 shrink-0"
          >
            <span>Daftar Jatuh Tempo</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* QUICK WORKSTATION LAUNCHER TILES */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link
          to="/admin/circulation"
          className="group p-3 rounded-lg border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 hover:border-zinc-400 dark:hover:border-zinc-700 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500">
              F2
            </span>
            <RefreshCw className="w-4 h-4 text-zinc-400 group-hover:text-zinc-950 dark:group-hover:text-zinc-100 transition-colors" />
          </div>
          <div>
            <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              Peminjaman Baru
            </div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Input barcode anggota & buku
            </div>
          </div>
        </Link>

        <Link
          to="/admin/circulation/quick-return"
          className="group p-3 rounded-lg border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 hover:border-zinc-400 dark:hover:border-zinc-700 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500">
              F3
            </span>
            <ArrowRightLeft className="w-4 h-4 text-zinc-400 group-hover:text-zinc-950 dark:group-hover:text-zinc-100 transition-colors" />
          </div>
          <div>
            <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              Pengembalian Kilat
            </div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Cukup scan barcode buku
            </div>
          </div>
        </Link>

        <Link
          to="/admin/catalog"
          className="group p-3 rounded-lg border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 hover:border-zinc-400 dark:hover:border-zinc-700 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500">
              F4
            </span>
            <BookOpen className="w-4 h-4 text-zinc-400 group-hover:text-zinc-950 dark:group-hover:text-zinc-100 transition-colors" />
          </div>
          <div>
            <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              Katalog & Bibliografi
            </div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Entri judul & eksemplar fisik
            </div>
          </div>
        </Link>

        <Link
          to="/admin/members"
          className="group p-3 rounded-lg border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 hover:border-zinc-400 dark:hover:border-zinc-700 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500">
              F5
            </span>
            <Users className="w-4 h-4 text-zinc-400 group-hover:text-zinc-950 dark:group-hover:text-zinc-100 transition-colors" />
          </div>
          <div>
            <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              Keanggotaan
            </div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Registrasi & cetak kartu
            </div>
          </div>
        </Link>
      </div>

      {/* 4 PURE MONOCHROME HUD METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Judul */}
        <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-[#0c0c0e] shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Total Judul
            </span>
            <BookOpen className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-3xl font-mono font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            {stats ? stats.total_biblios.toLocaleString() : '-'}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1 font-mono">
            Koleksi Judul Buku
          </div>
        </div>

        {/* Total Eksemplar */}
        <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-[#0c0c0e] shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Total Eksemplar
            </span>
            <Barcode className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-3xl font-mono font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            {stats ? stats.total_items.toLocaleString() : '-'}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1 font-mono">
            Buku Fisik di Rak
          </div>
        </div>

        {/* Sedang Dipinjam */}
        <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-[#0c0c0e] shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Sedang Dipinjam
            </span>
            <Archive className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-3xl font-mono font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            {stats ? stats.active_loans.toLocaleString() : '-'}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1 font-mono">
            Beredar di Peminjam
          </div>
        </div>

        {/* Tersedia di Rak */}
        <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-[#0c0c0e] shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Tersedia di Rak
            </span>
            <CheckCircle2 className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-3xl font-mono font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            {stats ? stats.available_items.toLocaleString() : '-'}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1 font-mono">
            Siap Dipinjamkan
          </div>
        </div>
      </div>

      {/* MAIN OPERATIONAL GRID: 7-DAY VELOCITY & TELEMETRY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Circulation Velocity Bar Chart (2 cols) */}
        <div className="lg:col-span-2 p-5 rounded-lg border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-[#0c0c0e] shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                  Kecepatan Sirkulasi (7 Hari Terakhir)
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Volume transaksi peminjaman dan pengembalian harian
                </p>
              </div>

              {/* Monochrome Legend */}
              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                  <span className="w-2.5 h-2.5 rounded-xs bg-zinc-950 dark:bg-zinc-100" /> Pinjam
                </span>
                <span className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                  <span className="w-2.5 h-2.5 rounded-xs bg-zinc-300 dark:bg-zinc-700" /> Kembali
                </span>
              </div>
            </div>

            {/* Bars */}
            <div className="h-52 flex items-end justify-between gap-3 pt-6 border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
              {stats?.trends?.map((item, idx) => {
                const maxVal = Math.max(
                  ...stats.trends.map((t) => Math.max(t.pinjam, t.kembali)),
                  20
                );
                const pHeight = Math.max(6, (item.pinjam / maxVal) * 140);
                const kHeight = Math.max(6, (item.kembali / maxVal) * 140);

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex items-end justify-center gap-1.5 h-36">
                      {/* Pinjam Bar (Solid Black in Light / Solid White in Dark) */}
                      <div
                        style={{ height: `${pHeight}px` }}
                        className="w-1/2 max-w-[16px] bg-zinc-950 dark:bg-zinc-100 rounded-t-xs transition-all hover:opacity-80"
                        title={`Pinjam: ${item.pinjam}`}
                      />
                      {/* Kembali Bar (Gray tone) */}
                      <div
                        style={{ height: `${kHeight}px` }}
                        className="w-1/2 max-w-[16px] bg-zinc-300 dark:bg-zinc-700 rounded-t-xs transition-all hover:opacity-80"
                        title={`Kembali: ${item.kembali}`}
                      />
                    </div>
                    <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 uppercase">
                      {item.day}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span className="font-mono text-[11px]">Semua data tersinkronisasi otomatis</span>
            <Link
              to="/admin/circulation"
              className="text-zinc-950 dark:text-zinc-50 font-semibold hover:underline flex items-center gap-1"
            >
              <span>Buka Sirkulasi Penuh</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Visitor & Library Health Telemetry Panel (1 col) */}
        <div className="p-5 rounded-lg border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-[#0c0c0e] shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-100 dark:border-zinc-800/80">
              <h2 className="text-sm font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                Lalu Lintas Pengunjung
              </h2>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 text-zinc-500">
                Hari Ini
              </span>
            </div>

            {/* Visitor Counter */}
            <div className="text-center py-6 bg-zinc-50 dark:bg-zinc-900/40 rounded-md border border-zinc-100 dark:border-zinc-800/60 my-2">
              <div className="text-5xl font-mono font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
                {stats ? stats.today_visitors : '0'}
              </div>
              <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mt-1 uppercase tracking-wider">
                Pengunjung Presensi
              </p>
            </div>

            {/* Compact Breakdown */}
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-zinc-100 dark:border-zinc-800/60">
                <span className="text-zinc-500">Total Anggota Terdaftar</span>
                <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                  {stats?.total_members || 0}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-zinc-100 dark:border-zinc-800/60">
                <span className="text-zinc-500">Tunggakan Kas Denda</span>
                <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                  Rp {stats ? stats.unpaid_fines_total.toLocaleString('id-ID') : '0'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-zinc-500">Database Engine</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                  Port 5432 • Online
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/80 mt-4">
            <Link
              to="/visitor-kiosk"
              target="_blank"
              className="w-full py-2 px-3 rounded-md bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-semibold text-center block transition-colors shadow-2xs"
            >
              Luncurkan Kiosk Buku Tamu [F6]
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
