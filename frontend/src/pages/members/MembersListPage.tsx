import React, { useEffect, useState } from 'react';
import { Users, PlusCircle, Search, Trash2, Mail, Phone, Calendar, UserCheck } from 'lucide-react';
import { apiRequest } from '@/lib/api';

export const MembersListPage: React.FC = () => {
  const [members, setMembers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [memberTypes, setMemberTypes] = useState<any[]>([]);

  // Form state
  const [id, setId] = useState('');
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('M');
  const [memberTypeID, setMemberTypeID] = useState(1);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [institution, setInstitution] = useState('');
  const [address, setAddress] = useState('');

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<any>(`/members?q=${encodeURIComponent(search)}`);
      setMembers(res.data || []);
      setTotal(res.meta?.total_records || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTypes = async () => {
    try {
      const data = await apiRequest<any>('/members/types');
      setMemberTypes(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [search]);

  useEffect(() => {
    fetchTypes();
  }, []);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/members', {
        method: 'POST',
        body: JSON.stringify({
          id,
          full_name: fullName,
          gender,
          member_type_id: memberTypeID,
          email,
          phone,
          institution,
          address,
        }),
      });

      setShowAddModal(false);
      setId('');
      setFullName('');
      setEmail('');
      setPhone('');
      fetchMembers();
    } catch (err: any) {
      alert(err.message || 'Gagal mendaftarkan anggota baru');
    }
  };

  const handleDelete = async (memberId: string) => {
    if (!confirm(`Hapus anggota ${memberId}?`)) return;
    try {
      await apiRequest(`/members/${encodeURIComponent(memberId)}`, { method: 'DELETE' });
      fetchMembers();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus anggota');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
            <Users className="w-5 h-5 text-zinc-950 dark:text-zinc-50" />
            Daftar Anggota Perpustakaan
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Manajemen direktori pemustaka (Siswa, Guru, Karyawan, Umum).
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-1.5 bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 rounded-md text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Tambah Anggota Baru</span>
        </button>
      </div>

      {/* Search Input Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nomor ID/NISN, nama lengkap, atau unit kerja..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:focus:ring-zinc-100"
          />
        </div>
        <span className="text-xs text-slate-400 whitespace-nowrap">
          Total: <strong>{total} Anggota</strong>
        </span>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-3">ID Anggota / NISN</th>
              <th className="p-3">Nama Lengkap</th>
              <th className="p-3">Tipe Anggota</th>
              <th className="p-3">Unit / Institusi</th>
              <th className="p-3">Masa Berlaku</th>
              <th className="p-3">Pinjaman Aktif</th>
              <th className="p-3">Tunggakan Denda</th>
              <th className="p-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {members.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-10 text-slate-400 italic">
                  Belum ada data anggota yang ditemukan.
                </td>
              </tr>
            ) : (
              members.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="p-3 font-mono font-bold text-zinc-950 dark:text-zinc-50">{m.id}</td>
                  <td className="p-3 font-semibold text-zinc-900 dark:text-zinc-100">
                    <div>{m.full_name}</div>
                    <div className="text-[10px] text-zinc-400 font-normal">{m.email || m.phone || '-'}</div>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono text-[11px] font-medium">
                      {m.member_type_name}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-400">{m.institution || '-'}</td>
                  <td className="p-3 font-mono">
                    {m.is_expired ? (
                      <span className="text-red-600 font-bold">{m.expire_date} (Expired)</span>
                    ) : (
                      <span className="text-slate-600 dark:text-slate-400">{m.expire_date}</span>
                    )}
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold">
                      {m.active_loans_count} Buku
                    </span>
                  </td>
                  <td className="p-3 font-mono">
                    {m.unpaid_fine_balance > 0 ? (
                      <span className="text-red-600 font-bold">Rp {m.unpaid_fine_balance.toLocaleString('id-ID')}</span>
                    ) : (
                      <span className="text-emerald-600 font-medium">Bebas</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="p-1.5 text-red-500 hover:text-red-700 rounded hover:bg-red-50"
                      title="Hapus Anggota"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Add Member */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
              Pendaftaran Anggota Baru
            </h3>

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nomor Anggota / NISN / NIP *
                </label>
                <input
                  type="text"
                  required
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  placeholder="Contoh: NISN-202409099..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nama pemustaka..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                  >
                    <option value="M">Laki-laki (M)</option>
                    <option value="F">Perempuan (F)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tipe Keanggotaan
                  </label>
                  <select
                    value={memberTypeID}
                    onChange={(e) => setMemberTypeID(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                  >
                    {memberTypes.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} (Max {t.loan_limit} buku / {t.loan_periode_days} hari)</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@sekolah.sch.id..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    No Telepon / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="081234567890..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kelas / Unit Kerja
                </label>
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="Contoh: Kelas X-MIPA 1 / Guru Matematika..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                />
              </div>

              <div className="flex gap-2 pt-3 justify-end border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 rounded-md text-xs font-semibold cursor-pointer"
                >
                  Daftarkan Anggota
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
