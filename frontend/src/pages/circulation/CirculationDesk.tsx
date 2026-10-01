import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Barcode,
  Trash2,
  Printer,
  CheckCircle2,
  AlertTriangle,
  X,
  CreditCard,
  Calendar,
} from 'lucide-react';
import { apiRequest } from '@/lib/api';

interface Member {
  id: string;
  full_name: string;
  member_type_name: string;
  expire_date: string;
  is_expired: boolean;
  is_pending: boolean;
  unpaid_fine_balance: number;
}

interface CartItem {
  id: number;
  barcode: string;
  title: string;
  loanDate: string;
  dueDate: string;
}

interface ActiveLoan {
  id: number;
  item_id: number;
  item_barcode: string;
  biblio_title: string;
  loan_date: string;
  due_date: string;
  renewed_count: number;
  is_overdue: boolean;
  overdue_days: number;
  estimated_fine: number;
}

export const CirculationDesk: React.FC = () => {
  const [memberIdInput, setMemberIdInput] = useState('');
  const [activeMember, setActiveMember] = useState<Member | null>(null);
  const [bookBarcodeInput, setBookBarcodeInput] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [memberActiveLoans, setMemberActiveLoans] = useState<ActiveLoan[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastFinishedLoans, setLastFinishedLoans] = useState<CartItem[]>([]);

  const memberInputRef = useRef<HTMLInputElement>(null);
  const bookInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Keyboard shortcut listener (F2, F3, F9, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        memberInputRef.current?.focus();
      } else if (e.key === 'F3') {
        e.preventDefault();
        navigate('/admin/circulation/quick-return');
      } else if (e.key === 'F9') {
        e.preventDefault();
        navigate('/admin/circulation/fines');
      } else if (e.key === 'Escape' && activeMember) {
        e.preventDefault();
        handleFinishTransaction();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeMember, cartItems]);

  const loadMemberData = async (targetId: string) => {
    if (!targetId.trim()) return;

    setLoading(true);
    setMessage(null);
    try {
      const member = await apiRequest<Member>(`/members/${encodeURIComponent(targetId.trim())}`);
      setActiveMember(member);
      setCartItems([]);

      const loans = await apiRequest<ActiveLoan[]>(`/circulation/loans/member/${encodeURIComponent(member.id)}`);
      setMemberActiveLoans(Array.isArray(loans) ? loans : []);

      setTimeout(() => {
        bookInputRef.current?.focus();
      }, 150);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Anggota tidak ditemukan' });
    } finally {
      setLoading(false);
    }
  };

  const handleScanMember = (e: React.FormEvent) => {
    e.preventDefault();
    loadMemberData(memberIdInput);
  };

  const handleScanBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookBarcodeInput.trim() || !activeMember) return;

    const barcode = bookBarcodeInput.trim();
    setLoading(true);
    setMessage(null);

    try {
      const loan = await apiRequest<any>('/circulation/checkout', {
        method: 'POST',
        body: JSON.stringify({
          member_id: activeMember.id,
          barcode: barcode,
        }),
      });

      setCartItems((prev) => [
        ...prev,
        {
          id: loan.id,
          barcode: loan.item_barcode,
          title: loan.biblio_title,
          loanDate: loan.loan_date,
          dueDate: loan.due_date,
        },
      ]);

      setMessage({ type: 'success', text: `Buku "${loan.biblio_title}" berhasil dicatat.` });
      setBookBarcodeInput('');
      bookInputRef.current?.focus();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
      setBookBarcodeInput('');
      bookInputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleReturnItem = async (barcode: string) => {
    setLoading(true);
    try {
      const res = await apiRequest<any>('/circulation/checkin', {
        method: 'POST',
        body: JSON.stringify({ barcode }),
      });

      setMessage({
        type: 'success',
        text: `Buku "${res.title}" berhasil dikembalikan.`,
      });

      if (activeMember) {
        const loans = await apiRequest<ActiveLoan[]>(`/circulation/loans/member/${encodeURIComponent(activeMember.id)}`);
        setMemberActiveLoans(Array.isArray(loans) ? loans : []);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleRenewLoan = async (loanID: number) => {
    setLoading(true);
    try {
      const res = await apiRequest<any>(`/circulation/renew/${loanID}`, {
        method: 'POST',
      });

      setMessage({
        type: 'success',
        text: `Buku "${res.biblio_title}" diperpanjang s.d. ${res.due_date}.`,
      });

      if (activeMember) {
        const loans = await apiRequest<ActiveLoan[]>(`/circulation/loans/member/${encodeURIComponent(activeMember.id)}`);
        setMemberActiveLoans(Array.isArray(loans) ? loans : []);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleFinishTransaction = () => {
    if (cartItems.length > 0) {
      setLastFinishedLoans([...cartItems]);
      setShowReceiptModal(true);
    } else {
      setActiveMember(null);
      setMemberIdInput('');
      setCartItems([]);
      setMemberActiveLoans([]);
      setTimeout(() => memberInputRef.current?.focus(), 100);
    }
  };

  const handleCloseReceiptAndReset = () => {
    setShowReceiptModal(false);
    setActiveMember(null);
    setMemberIdInput('');
    setCartItems([]);
    setMemberActiveLoans([]);
    setTimeout(() => memberInputRef.current?.focus(), 100);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Sirkulasi
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Transaksi peminjaman dan pengembalian koleksi
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {activeMember && (
            <button
              onClick={handleFinishTransaction}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Selesaikan (Esc)</span>
            </button>
          )}

          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded-md bg-white dark:bg-slate-900">
            <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[10px]">F2: Pinjam</kbd>
            <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[10px]">F3: Kembali</kbd>
            <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[10px]">F9: Denda</kbd>
            <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[10px]">Esc: Selesai</kbd>
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      {message && (
        <div
          className={`p-3 rounded-md border text-xs flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-800 dark:text-emerald-300'
              : 'bg-red-50 dark:bg-red-950/40 border-red-200 text-red-800 dark:text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* STEP 1: SCAN MEMBER CARD */}
      {!activeMember ? (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs text-center max-w-xl mx-auto">
          <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg flex items-center justify-center mx-auto mb-3">
            <User className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
            Pindai Nomor Anggota
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
            Ketik atau scan barcode kartu pemustaka untuk memulai transaksi.
          </p>

          <form onSubmit={handleScanMember} className="flex gap-2 max-w-md mx-auto">
            <input
              ref={memberInputRef}
              type="text"
              autoFocus
              value={memberIdInput}
              onChange={(e) => setMemberIdInput(e.target.value)}
              placeholder="Nomor anggota / NISN..."
              className="flex-1 px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-100 font-mono"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-md text-xs font-semibold hover:bg-slate-800 dark:hover:bg-white transition-colors shrink-0"
            >
              Cari
            </button>
          </form>

          {/* Quick sample buttons */}
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
            <span>Contoh:</span>
            <button
              type="button"
              onClick={() => {
                setMemberIdInput('NISN-202409001');
                loadMemberData('NISN-202409001');
              }}
              className="text-zinc-950 dark:text-zinc-100 hover:underline font-mono"
            >
              NISN-202409001
            </button>
            <span>&bull;</span>
            <button
              type="button"
              onClick={() => {
                setMemberIdInput('NIP-1985041501');
                loadMemberData('NIP-1985041501');
              }}
              className="text-zinc-950 dark:text-zinc-100 hover:underline font-mono"
            >
              NIP-1985041501
            </button>
          </div>
        </div>
      ) : (
        /* KARTU IDENTITAS ANGGOTA AKTIF */
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-sm shrink-0 border border-slate-200 dark:border-slate-700">
              {activeMember.full_name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {activeMember.full_name}
                </h2>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                  {activeMember.member_type_name}
                </span>
                {activeMember.is_expired && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">
                    Kadaluarsa
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                {activeMember.id} &bull; Masa aktif: {activeMember.expire_date}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-2 md:pt-0">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">Denda:</span>
              {activeMember.unpaid_fine_balance > 0 ? (
                <span className="text-xs font-bold text-red-600">
                  Rp {activeMember.unpaid_fine_balance.toLocaleString('id-ID')}
                </span>
              ) : (
                <span className="text-xs font-semibold text-emerald-600">Rp 0</span>
              )}
            </div>

            <button
              onClick={() => {
                setActiveMember(null);
                setCartItems([]);
                setMemberActiveLoans([]);
                setTimeout(() => memberInputRef.current?.focus(), 100);
              }}
              className="px-2.5 py-1 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md text-xs font-medium text-slate-600 dark:text-slate-300"
            >
              Ganti
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: SCAN BOOK BARCODE & CART */}
      {activeMember && (
        <div className="space-y-6">
          {/* Scan Barcode Buku Input */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Barcode className="w-4 h-4 text-slate-400" />
                Pindai Barcode Buku
              </h2>
              <span className="text-[11px] text-slate-400">
                Item Baru: <strong>{cartItems.length}</strong>
              </span>
            </div>

            <form onSubmit={handleScanBook} className="flex gap-2">
              <input
                ref={bookInputRef}
                type="text"
                autoFocus
                value={bookBarcodeInput}
                onChange={(e) => setBookBarcodeInput(e.target.value)}
                placeholder="Scan / ketik barcode buku fisik (contoh: B000101)..."
                className="flex-1 px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-100 font-mono"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 rounded-md text-xs font-semibold transition-colors shrink-0 shadow-xs cursor-pointer"
              >
                + Tambah
              </button>
            </form>

            {/* Quick helper barcodes */}
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
              <span>Sampel barcode:</span>
              {['B000101', 'B000103', 'B000201'].map((bc) => (
                <button
                  key={bc}
                  type="button"
                  onClick={() => setBookBarcodeInput(bc)}
                  className="text-zinc-950 dark:text-zinc-100 hover:underline font-mono"
                >
                  {bc}
                </button>
              ))}
            </div>

            {/* TABEL KERANJANG PINJAM BARU */}
            <div className="mt-4 border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-medium border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-2.5">Barcode</th>
                    <th className="p-2.5">Judul Buku</th>
                    <th className="p-2.5">Tgl Pinjam</th>
                    <th className="p-2.5">Jatuh Tempo</th>
                    <th className="p-2.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {cartItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-slate-400">
                        Belum ada buku dalam sesi peminjaman ini.
                      </td>
                    </tr>
                  ) : (
                    cartItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-2.5 font-mono font-medium">{item.barcode}</td>
                        <td className="p-2.5 font-medium text-slate-900 dark:text-slate-100">{item.title}</td>
                        <td className="p-2.5 text-slate-500">{item.loanDate}</td>
                        <td className="p-2.5 font-medium text-zinc-950 dark:text-zinc-100 font-mono">{item.dueDate}</td>
                        <td className="p-2.5 text-right">
                          <button
                            onClick={() => setCartItems(cartItems.filter((_, i) => i !== idx))}
                            className="p-1 text-slate-400 hover:text-red-600"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* TABEL BUKU YANG SEDANG MASIH DIPINJAM ANGGOTA INI */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Buku Sedang Dipinjam ({memberActiveLoans.length})
              </h2>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-medium border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-2.5">Barcode</th>
                    <th className="p-2.5">Judul Buku</th>
                    <th className="p-2.5">Tgl Pinjam</th>
                    <th className="p-2.5">Jatuh Tempo</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {memberActiveLoans.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-slate-400">
                        Tidak ada pinjaman berjalan lainnya.
                      </td>
                    </tr>
                  ) : (
                    memberActiveLoans.map((loan) => (
                      <tr key={loan.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-2.5 font-mono">{loan.item_barcode}</td>
                        <td className="p-2.5 font-medium text-slate-900 dark:text-slate-100">{loan.biblio_title}</td>
                        <td className="p-2.5 text-slate-500">{loan.loan_date}</td>
                        <td className="p-2.5 text-slate-700 dark:text-slate-300">{loan.due_date}</td>
                        <td className="p-2.5">
                          {loan.is_overdue ? (
                            <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-medium">
                              Terlambat ({loan.overdue_days}h)
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px]">
                              Aktif ({loan.renewed_count}x)
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-right space-x-1">
                          <button
                            onClick={() => handleReturnItem(loan.item_barcode)}
                            className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-[11px] font-medium text-slate-700 dark:text-slate-200 transition-colors"
                          >
                            Kembalikan
                          </button>
                          <button
                            onClick={() => handleRenewLoan(loan.id)}
                            className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-[11px] font-medium text-slate-700 dark:text-slate-200 transition-colors"
                          >
                            Perpanjang
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL */}
      {showReceiptModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-sm w-full p-5 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-slate-400" />
                Struk Peminjaman
              </h3>
              <button onClick={handleCloseReceiptAndReset} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Slip content */}
            <div
              id="thermal-receipt"
              className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-md font-mono text-xs text-slate-800 dark:text-slate-200 space-y-3"
            >
              <div className="text-center pb-2 border-b border-dashed border-slate-300 dark:border-slate-700">
                <div className="font-bold">LIBREM PERPUSTAKAAN</div>
                <div className="text-[10px] text-slate-500">Struk Transaksi Peminjaman</div>
              </div>

              <div className="space-y-0.5 text-[11px] pb-2 border-b border-dashed border-slate-300 dark:border-slate-700">
                <div className="flex justify-between">
                  <span>Anggota:</span>
                  <span className="font-semibold">{activeMember?.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>ID:</span>
                  <span>{activeMember?.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tgl:</span>
                  <span>{new Date().toLocaleDateString('id-ID')}</span>
                </div>
              </div>

              <div className="space-y-1.5 pb-2 border-b border-dashed border-slate-300 dark:border-slate-700">
                {lastFinishedLoans.map((item, i) => (
                  <div key={i} className="text-[11px]">
                    <div className="font-medium truncate">{item.title}</div>
                    <div className="flex justify-between text-slate-500 text-[10px]">
                      <span>{item.barcode}</span>
                      <span>Kembali: {item.dueDate}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center text-[10px] text-slate-500 pt-1">
                Harap kembalikan buku tepat waktu.
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 rounded-md text-xs font-semibold cursor-pointer"
              >
                Cetak Struk
              </button>
              <button
                onClick={handleCloseReceiptAndReset}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md text-xs font-medium"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
