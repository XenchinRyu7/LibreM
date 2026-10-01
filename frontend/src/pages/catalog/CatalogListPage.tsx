import React, { useEffect, useState } from 'react';
import { BookCopy, Search, PlusCircle, Trash2, ExternalLink, Image, Tag, BookOpen } from 'lucide-react';
import { apiRequest } from '@/lib/api';

export const CatalogListPage: React.FC = () => {
  const [biblios, setBiblios] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [masters, setMasters] = useState<any>({});

  // New biblio form state
  const [newTitle, setNewTitle] = useState('');
  const [newSOR, setNewSOR] = useState('');
  const [newISBN, setNewISBN] = useState('');
  const [newPublisherID, setNewPublisherID] = useState<number | ''>('');
  const [newYear, setNewYear] = useState('2024');
  const [newCallNumber, setNewCallNumber] = useState('');
  const [newClassification, setNewClassification] = useState('800');
  const [newCover, setNewCover] = useState('https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&auto=format&fit=crop&q=80');

  const fetchBiblios = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<any>(`/catalog/biblios?q=${encodeURIComponent(search)}`);
      setBiblios(res.data || []);
      setTotal(res.meta?.total_records || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMasters = async () => {
    try {
      const data = await apiRequest<any>('/catalog/masters');
      setMasters(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBiblios();
    fetchMasters();
  }, [search]);

  const handleAddBiblio = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/catalog/biblios', {
        method: 'POST',
        body: JSON.stringify({
          title: newTitle,
          sor: newSOR,
          isbn_issn: newISBN,
          publisher_id: newPublisherID ? Number(newPublisherID) : null,
          publish_year: newYear,
          call_number: newCallNumber,
          classification: newClassification,
          cover_image: newCover,
          language_code: 'id',
          gmd_id: 1,
        }),
      });

      setShowAddModal(false);
      setNewTitle('');
      setNewSOR('');
      setNewISBN('');
      fetchBiblios();
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan judul baru');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data induk bibliografi ini?')) return;
    try {
      await apiRequest(`/catalog/biblios/${id}`, { method: 'DELETE' });
      fetchBiblios();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus bibliografi (pastikan fisik item sudah kosong)');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
            <BookCopy className="w-5 h-5 text-zinc-950 dark:text-zinc-50" />
            Daftar Bibliografi (Katalog Buku)
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Koleksi induk bahan pustaka dengan dukungan metadata MARC & pencarian teks FTS.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-1.5 bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 rounded-md text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Tambah Judul Baru</span>
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
            placeholder="Cari judul buku, pengarang, nomor panggil, atau ISBN..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:focus:ring-zinc-100"
          />
        </div>
        <span className="text-xs text-slate-400 whitespace-nowrap">
          Total: <strong>{total} Judul</strong>
        </span>
      </div>

      {/* Biblios Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-3 w-14">Cover</th>
              <th className="p-3">Judul Koleksi & Pengarang</th>
              <th className="p-3">ISBN / ISSN</th>
              <th className="p-3">Penerbit & Tahun</th>
              <th className="p-3">Nomor Panggil</th>
              <th className="p-3">Eksemplar</th>
              <th className="p-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {biblios.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-slate-400 italic">
                  Belum ada koleksi bibliografi yang cocok dengan pencarian.
                </td>
              </tr>
            ) : (
              biblios.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="p-3">
                    <img
                      src={b.cover_image || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&auto=format&fit=crop&q=80'}
                      alt={b.title}
                      className="w-10 h-14 object-cover rounded shadow-xs border border-slate-200"
                    />
                  </td>
                  <td className="p-3">
                    <div className="font-bold text-zinc-900 dark:text-zinc-100 text-sm hover:underline transition-colors">
                      {b.title}
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      {b.sor || (b.authors?.map((a: any) => a.name).join(', ') || '-')}
                    </div>
                  </td>
                  <td className="p-3 font-mono text-zinc-600 dark:text-zinc-400">{b.isbn_issn || '-'}</td>
                  <td className="p-3 text-zinc-600 dark:text-zinc-400">
                    <div>{b.publisher_name || '-'}</div>
                    <div className="text-[10px] text-zinc-400">{b.publish_year}</div>
                  </td>
                  <td className="p-3 font-mono font-medium text-zinc-800 dark:text-zinc-200">
                    {b.call_number || '-'}
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono font-medium text-[11px]">
                      {b.available_items} / {b.total_items} Ada
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-1.5">
                    <button
                      onClick={() => handleDelete(b.id)}
                      className="p-1.5 text-red-500 hover:text-red-700 rounded hover:bg-red-50 dark:hover:bg-red-950/40"
                      title="Hapus Bibliografi"
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

      {/* Modal Tambah Bibliografi Baru */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-2xl w-full p-6 border border-slate-200 dark:border-slate-800 my-8">
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
              Tambah Data Induk Bibliografi Baru
            </h3>

            <form onSubmit={handleAddBiblio} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Judul Buku / Koleksi *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Contoh: Laskar Pelangi..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Pernyataan Tanggung Jawab (Pengarang)
                  </label>
                  <input
                    type="text"
                    value={newSOR}
                    onChange={(e) => setNewSOR(e.target.value)}
                    placeholder="Contoh: Andrea Hirata..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ISBN / ISSN
                  </label>
                  <input
                    type="text"
                    value={newISBN}
                    onChange={(e) => setNewISBN(e.target.value)}
                    placeholder="978-979-1227-34-6..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Penerbit
                  </label>
                  <select
                    value={newPublisherID}
                    onChange={(e) => setNewPublisherID(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                  >
                    <option value="">Pilih Penerbit...</option>
                    {masters.publishers?.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tahun Terbit
                  </label>
                  <input
                    type="text"
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Klasifikasi DDC
                  </label>
                  <input
                    type="text"
                    value={newClassification}
                    onChange={(e) => setNewClassification(e.target.value)}
                    placeholder="Contoh: 813..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nomor Panggil (Call Number)
                  </label>
                  <input
                    type="text"
                    value={newCallNumber}
                    onChange={(e) => setNewCallNumber(e.target.value)}
                    placeholder="813 HIR l..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    URL Sampul Buku (Cover Image)
                  </label>
                  <input
                    type="text"
                    value={newCover}
                    onChange={(e) => setNewCover(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4 justify-end border-t border-slate-200 dark:border-slate-800">
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
                  Simpan Bibliografi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
