import React, { useEffect, useState } from 'react';
import { UserCheck, CheckCircle2, ArrowLeft, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiRequest } from '@/lib/api';

export const VisitorKiosk: React.FC = () => {
  const [memberId, setMemberId] = useState('');
  const [visitorName, setVisitorName] = useState('');
  const [institution, setInstitution] = useState('');
  const [purpose, setPurpose] = useState('Membaca & Meminjam Buku');
  const [todayVisitors, setTodayVisitors] = useState<any[]>([]);
  const [lastCheckin, setLastCheckin] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchToday = async () => {
    try {
      const data = await apiRequest<any[]>('/visitors/today');
      setTodayVisitors(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchToday();
  }, []);

  const handleCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName.trim() && !memberId.trim()) return;

    setLoading(true);
    try {
      const res = await apiRequest('/visitors/checkin', {
        method: 'POST',
        body: JSON.stringify({
          member_id: memberId.trim() || undefined,
          visitor_name: visitorName.trim() || memberId.trim(),
          institution: institution.trim(),
          purpose: purpose,
          gender: 'M',
        }),
      });

      setLastCheckin(res);
      setMemberId('');
      setVisitorName('');
      setInstitution('');
      fetchToday();

      setTimeout(() => setLastCheckin(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan kehadiran');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans p-6 sm:p-10 flex flex-col justify-between">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link
          to="/opac"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke OPAC</span>
        </Link>
        <div className="text-right text-xs text-slate-500">
          <div className="font-semibold text-slate-700 dark:text-slate-300">Buku Tamu</div>
          <div>{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>
      </div>

      {/* Main Box */}
      <div className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
        {/* Form Isi Presensi */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-md bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">Presensi Kunjungan</h1>
                <p className="text-xs text-slate-400">Silakan scan nomor anggota atau isi nama</p>
              </div>
            </div>

            {lastCheckin && (
              <div className="my-3 p-3 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>Kehadiran tercatat: <strong>{lastCheckin.visitor_name}</strong></div>
              </div>
            )}

            <form onSubmit={handleCheckin} className="space-y-3 mt-4 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                  Nomor Anggota (NISN / NIP)
                </label>
                <input
                  type="text"
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  placeholder="Ketik atau scan barcode..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                  Atau Nama Lengkap
                </label>
                <input
                  type="text"
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  placeholder="Nama pemustaka..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                  Kelas / Unit Asal
                </label>
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="Contoh: Kelas X-1..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                  Keperluan
                </label>
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs"
                >
                  <option value="Membaca & Meminjam Buku">Membaca & Meminjam Buku</option>
                  <option value="Tugas Belajar / Kelompok">Tugas Belajar / Kelompok</option>
                  <option value="Mengakses Internet / Komputer">Mengakses Internet / Komputer</option>
                  <option value="Mengembalikan Buku">Mengembalikan Buku</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 rounded-md text-xs font-semibold shadow-xs transition-colors cursor-pointer mt-2"
              >
                {loading ? 'Menyimpan...' : 'Catat Kehadiran'}
              </button>
            </form>
          </div>
        </div>

        {/* Tabel Pengunjung Hari Ini */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <h2 className="font-semibold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Hari Ini ({todayVisitors.length})
              </h2>
            </div>

            <div className="overflow-y-auto max-h-[340px] space-y-1.5 pr-1">
              {todayVisitors.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-xs italic">
                  Belum ada presensi yang tercatat hari ini.
                </div>
              ) : (
                todayVisitors.map((v) => (
                  <div
                    key={v.id}
                    className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-medium text-slate-900 dark:text-slate-100">{v.visitor_name}</div>
                      <div className="text-slate-400 text-[11px]">{v.institution || 'Umum'} &bull; {v.purpose}</div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">
                      {new Date(v.checkin_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-slate-400">
        LibreM
      </div>
    </div>
  );
};
