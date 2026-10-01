import React, { useState, useRef } from 'react';
import { RefreshCw, Barcode, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { apiRequest } from '@/lib/api';

interface ReturnHistoryItem {
  loan_id: number;
  item_barcode: string;
  title: string;
  member_id: string;
  member_name: string;
  return_date: string;
  due_date: string;
  overdue_days: number;
  fine_amount: number;
}

export const QuickReturn: React.FC = () => {
  const [barcode, setBarcode] = useState('');
  const [returnHistory, setReturnHistory] = useState<ReturnHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastReturn, setLastReturn] = useState<ReturnHistoryItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<ReturnHistoryItem>('/circulation/checkin', {
        method: 'POST',
        body: JSON.stringify({ barcode: barcode.trim() }),
      });

      setLastReturn(res);
      setReturnHistory((prev) => [res, ...prev]);
      setBarcode('');
      inputRef.current?.focus();
    } catch (err: any) {
      setError(err.message || 'Gagal memproses pengembalian buku');
      setBarcode('');
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-zinc-950 dark:text-zinc-50" />
          Pengembalian Cepat (Quick Return)
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Pindai barcode buku yang dikembalikan secara berturut-turut tanpa memilih anggota terlebih dahulu.
        </p>
      </div>

      {/* Barcode Scanner Box */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-2xl">
        <form onSubmit={handleReturn} className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Barcode className="w-5 h-5" />
            </span>
            <input
              ref={inputRef}
              type="text"
              autoFocus
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Scan / Masukkan Barcode Buku (contoh: B000101)..."
              className="w-full pl-11 pr-4 py-3 text-base bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:focus:ring-zinc-100 font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm shrink-0"
          >
            {loading ? 'Memproses...' : 'Kembalikan Buku'}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-700 dark:text-red-300 text-xs rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Latest Processed Return Alert */}
        {lastReturn && !error && (
          <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 text-emerald-900 dark:text-emerald-200 rounded-xl space-y-1.5 animate-in fade-in">
            <div className="flex items-center gap-2 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Pengembalian Berhasil Diproses!</span>
            </div>
            <div className="text-xs">
              Buku: <strong>{lastReturn.title}</strong> (Barcode: {lastReturn.item_barcode})
            </div>
            <div className="text-xs">
              Peminjam: <strong>{lastReturn.member_name}</strong> ({lastReturn.member_id})
            </div>
            {lastReturn.overdue_days > 0 ? (
              <div className="text-xs text-red-600 font-semibold pt-1">
                Terlambat {lastReturn.overdue_days} hari. Denda diterbitkan: Rp {lastReturn.fine_amount.toLocaleString('id-ID')}
              </div>
            ) : (
              <div className="text-xs text-emerald-700 font-medium pt-1">
                Tepat waktu &bull; Tidak ada denda.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sesi Riwayat Pengembalian Cepat */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">
          Riwayat Pengembalian Sesi Ini ({returnHistory.length} Buku)
        </h2>

        <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">Barcode</th>
                <th className="p-3">Judul Buku</th>
                <th className="p-3">Nama Peminjam</th>
                <th className="p-3">Jatuh Tempo</th>
                <th className="p-3">Tgl Kembali</th>
                <th className="p-3">Keterlambatan / Denda</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {returnHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-slate-400 italic">
                    Belum ada buku yang dikembalikan pada sesi ini.
                  </td>
                </tr>
              ) : (
                returnHistory.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="p-3 font-mono font-bold text-zinc-950 dark:text-zinc-50">{item.item_barcode}</td>
                    <td className="p-3 font-semibold">{item.title}</td>
                    <td className="p-3">{item.member_name}</td>
                    <td className="p-3 text-slate-500">{item.due_date}</td>
                    <td className="p-3 font-medium text-emerald-600">{item.return_date}</td>
                    <td className="p-3">
                      {item.overdue_days > 0 ? (
                        <span className="text-red-600 font-bold">
                          +{item.overdue_days} hari (Rp {item.fine_amount.toLocaleString('id-ID')})
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-semibold">Tepat Waktu</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
