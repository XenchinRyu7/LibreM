import React, { useEffect, useState } from 'react';
import { AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import { apiRequest } from '@/lib/api';

export const OverduesPage: React.FC = () => {
  const [overdues, setOverdues] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchOverdues = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<any>('/circulation/overdues');
      setOverdues(res.data || []);
      setTotal(res.meta?.total_records || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverdues();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            Daftar Keterlambatan Sirkulasi
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Monitoring buku yang melewati batas tanggal jatuh tempo dan estimasi akumulasi denda.
          </p>
        </div>

        <button
          onClick={fetchOverdues}
          className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          title="Segarkan Data"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-3">Barcode</th>
              <th className="p-3">Judul Koleksi</th>
              <th className="p-3">Peminjam</th>
              <th className="p-3">Tgl Pinjam</th>
              <th className="p-3">Jatuh Tempo</th>
              <th className="p-3">Keterlambatan</th>
              <th className="p-3">Estimasi Denda</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {overdues.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-slate-400 italic">
                  Tidak ada transaksi peminjaman yang sedang terlambat saat ini.
                </td>
              </tr>
            ) : (
              overdues.map((loan) => (
                <tr key={loan.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="p-3 font-mono font-bold text-zinc-950 dark:text-zinc-50">{loan.item_barcode}</td>
                  <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">{loan.biblio_title}</td>
                  <td className="p-3">
                    <div className="font-medium">{loan.member_name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{loan.member_id}</div>
                  </td>
                  <td className="p-3 text-slate-500">{loan.loan_date}</td>
                  <td className="p-3 font-medium text-slate-700 dark:text-slate-300">{loan.due_date}</td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold text-[10px]">
                      <Clock className="w-3 h-3" /> {loan.overdue_days} Hari
                    </span>
                  </td>
                  <td className="p-3 font-bold text-red-600">
                    Rp {loan.estimated_fine.toLocaleString('id-ID')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
