import React, { useEffect, useState } from 'react';
import { Coins, PlusCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { apiRequest } from '@/lib/api';

export const FinesPage: React.FC = () => {
  const [fines, setFines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPayModal, setShowPayModal] = useState(false);
  const [memberId, setMemberId] = useState('');
  const [amount, setAmount] = useState(5000);
  const [description, setDescription] = useState('');

  const fetchFines = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<any>('/circulation/fines');
      setFines(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFines();
  }, []);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/circulation/pay-fine', {
        method: 'POST',
        body: JSON.stringify({
          member_id: memberId,
          amount: Number(amount),
          description: description || `Pelunasan denda kasir Rp ${amount}`,
        }),
      });

      setShowPayModal(false);
      setMemberId('');
      setAmount(5000);
      setDescription('');
      fetchFines();
    } catch (err: any) {
      alert(err.message || 'Gagal mencatat pembayaran denda');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Coins className="w-6 h-6 text-amber-500" />
            Buku Kas Denda Perpustakaan
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pencatatan mutasi piutang (Debit) dan pembayaran tunai denda (Kredit) oleh pemustaka.
          </p>
        </div>

        <button
          onClick={() => setShowPayModal(true)}
          className="px-3.5 py-1.5 bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 rounded-md text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Terima Pembayaran Denda (F9)</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-3">Tgl Mutasi</th>
              <th className="p-3">Nama Anggota</th>
              <th className="p-3">Keterangan Transaksi</th>
              <th className="p-3 text-right">Debit (Tagihan)</th>
              <th className="p-3 text-right">Kredit (Dibayar)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {fines.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-slate-400 italic">
                  Belum ada catatan mutasi kas denda.
                </td>
              </tr>
            ) : (
              fines.map((f) => (
                <tr key={f.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="p-3 text-slate-500 font-mono">{f.transaction_date}</td>
                  <td className="p-3">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{f.member_name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{f.member_id}</div>
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-300">{f.description}</td>
                  <td className="p-3 text-right font-mono font-bold text-red-600">
                    {f.debit > 0 ? `Rp ${f.debit.toLocaleString('id-ID')}` : '-'}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-emerald-600">
                    {f.credit > 0 ? `Rp ${f.credit.toLocaleString('id-ID')}` : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pay Modal */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-500" />
              Penerimaan Kas Pembayaran Denda
            </h3>

            <form onSubmit={handlePay} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nomor Anggota (NISN / NIP)
                </label>
                <input
                  type="text"
                  required
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  placeholder="NISN-202409001..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nominal Dibayarkan (Rp)
                </label>
                <input
                  type="number"
                  required
                  min={500}
                  step={500}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan / Kuitansi
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Pembayaran lunas denda keterlambatan..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
                />
              </div>

              <div className="flex gap-2 pt-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold"
                >
                  Simpan Penerimaan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
