import React, { useEffect, useState } from 'react';
import { Barcode, PlusCircle, Trash2, Printer, Search, RefreshCw } from 'lucide-react';
import { apiRequest } from '@/lib/api';

export const ItemsListPage: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [masters, setMasters] = useState<any>({});
  const [biblios, setBiblios] = useState<any[]>([]);

  // Batch generation form
  const [biblioID, setBiblioID] = useState<number | ''>('');
  const [prefix, setPrefix] = useState('B');
  const [quantity, setQuantity] = useState(3);
  const [locationID, setLocationID] = useState('RAK-01');
  const [collTypeID, setCollTypeID] = useState(1);
  const [itemStatusID, setItemStatusID] = useState('AV');
  const [price, setPrice] = useState(85000);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<any>(`/catalog/items?q=${encodeURIComponent(search)}`);
      setItems(res.data || []);
      setTotal(res.meta?.total_records || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMastersAndBiblios = async () => {
    try {
      const m = await apiRequest<any>('/catalog/masters');
      setMasters(m);
      const b = await apiRequest<any>('/catalog/biblios?limit=100');
      setBiblios(b.data || []);
      if (b.data && b.data.length > 0) {
        setBiblioID(b.data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [search]);

  useEffect(() => {
    fetchMastersAndBiblios();
  }, []);

  const handleBatchCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!biblioID) return;

    try {
      await apiRequest('/catalog/items/batch', {
        method: 'POST',
        body: JSON.stringify({
          biblio_id: Number(biblioID),
          barcode_prefix: prefix,
          quantity: Number(quantity),
          location_id: locationID,
          coll_type_id: collTypeID,
          item_status_id: itemStatusID,
          price: Number(price),
        }),
      });

      setShowBatchModal(false);
      fetchItems();
    } catch (err: any) {
      alert(err.message || 'Gagal generate barcode eksemplar baru');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus eksemplar fisik ini?')) return;
    try {
      await apiRequest(`/catalog/items/${id}`, { method: 'DELETE' });
      fetchItems();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus item (mungkin sedang dipinjam)');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
            <Barcode className="w-5 h-5 text-zinc-950 dark:text-zinc-50" />
            Daftar Eksemplar Fisik & Barcode
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Aset fisik material inventaris buku di setiap rak perpustakaan.
          </p>
        </div>

        <button
          onClick={() => setShowBatchModal(true)}
          className="px-3.5 py-1.5 bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 rounded-md text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Generate Barcode Eksemplar (Batch)</span>
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
            placeholder="Cari kode barcode (B000...), nomor panggil, atau judul..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:focus:ring-zinc-100"
          />
        </div>
        <span className="text-xs text-slate-400 whitespace-nowrap">
          Total: <strong>{total} Eksemplar</strong>
        </span>
      </div>

      {/* Table Items */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-3">Barcode Fisik</th>
              <th className="p-3">Judul Koleksi Induk</th>
              <th className="p-3">Nomor Panggil Item</th>
              <th className="p-3">Lokasi Rak</th>
              <th className="p-3">Status Pinjam</th>
              <th className="p-3">Harga Aset</th>
              <th className="p-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-slate-400 italic">
                  Belum ada eksemplar fisik buku.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="p-3 font-mono font-bold text-zinc-950 dark:text-zinc-50 text-sm">
                    {item.barcode}
                  </td>
                  <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">
                    {item.biblio_title}
                  </td>
                  <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                    {item.call_number || '-'}
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-400">
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-medium">
                      {item.location_name || item.location_id || '-'}
                    </span>
                  </td>
                  <td className="p-3">
                    {item.is_lent ? (
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                        Sedang Dipinjam
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        Tersedia di Rak
                      </span>
                    )}
                  </td>
                  <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                    Rp {item.price ? item.price.toLocaleString('id-ID') : '0'}
                  </td>
                  <td className="p-3 text-right space-x-1.5">
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-red-500 hover:text-red-700 rounded hover:bg-red-50"
                      title="Hapus Eksemplar"
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

      {/* Modal Batch Barcode Generator */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Barcode className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
              Generate Barcode Eksemplar Otomatis
            </h3>

            <form onSubmit={handleBatchCreate} className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Pilih Judul Buku Koleksi *
                </label>
                <select
                  required
                  value={biblioID}
                  onChange={(e) => setBiblioID(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                >
                  {biblios.map((b) => (
                    <option key={b.id} value={b.id}>{b.title} ({b.isbn_issn || 'No ISBN'})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Prefix Barcode
                  </label>
                  <input
                    type="text"
                    required
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Jumlah Eksemplar
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Lokasi Rak
                  </label>
                  <select
                    value={locationID}
                    onChange={(e) => setLocationID(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                  >
                    {masters.locations?.map((l: any) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Harga Beli Satuan (Rp)
                  </label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3 justify-end border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 rounded-md text-xs font-semibold cursor-pointer"
                >
                  Generate {quantity} Barcode Sekarang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
