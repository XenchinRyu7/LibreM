import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Search, LogIn, X } from 'lucide-react';
import { apiRequest } from '@/lib/api';

export const OpacPage: React.FC = () => {
  const [biblios, setBiblios] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedBiblio, setSelectedBiblio] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchBiblios = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<any>(`/catalog/biblios?q=${encodeURIComponent(search)}`);
      setBiblios(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBiblios();
  }, [search]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight leading-none block">LibreM</span>
              <span className="text-[10px] text-slate-400 leading-none">Katalog OPAC</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/visitor-kiosk"
              className="text-xs px-2.5 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium transition-colors"
            >
              Buku Tamu
            </Link>
            <Link
              to="/login"
              className="text-xs px-3 py-1.5 rounded-md bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Masuk Petugas</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Search Header */}
      <section className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-10 px-4 text-center">
        <div className="max-w-2xl mx-auto space-y-3">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Katalog Perpustakaan
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cari buku teks, novel, literatur, dan bahan pustaka
          </p>

          <div className="pt-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ketik judul buku, pengarang, penerbit, atau nomor panggil..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-100"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Book Grid */}
      <main className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Koleksi ({biblios.length})
          </h2>
        </div>

        {biblios.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="text-xs text-slate-500">Tidak ada koleksi yang sesuai dengan pencarian.</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {biblios.map((book) => (
              <div
                key={book.id}
                onClick={() => setSelectedBiblio(book)}
                className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs hover:border-slate-400 dark:hover:border-slate-600 transition-all cursor-pointer flex flex-col"
              >
                <div className="h-48 bg-slate-100 dark:bg-slate-800 relative">
                  <img
                    src={book.cover_image || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&auto=format&fit=crop&q=80'}
                    alt={book.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    {book.available_items > 0 ? (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-medium shadow-xs">
                        Tersedia ({book.available_items})
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-slate-600 text-white text-[10px] font-medium shadow-xs">
                        Dipinjam
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono block mb-1">
                      {book.call_number || '800 DDC'}
                    </span>
                    <h3 className="font-semibold text-xs text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug">
                      {book.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                      {book.sor || (book.authors?.map((a: any) => a.name).join(', ') || '-')}
                    </p>
                  </div>

                  <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex justify-between items-center">
                    <span>{book.publish_year || '2024'}</span>
                    <span>{book.total_items} Eksemplar</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Detail Modal */}
      {selectedBiblio && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-lg w-full p-5 border border-slate-200 dark:border-slate-800 relative">
            <button
              onClick={() => setSelectedBiblio(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex gap-4 flex-col sm:flex-row">
              <img
                src={selectedBiblio.cover_image || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&auto=format&fit=crop&q=80'}
                alt={selectedBiblio.title}
                className="w-28 h-40 object-cover rounded-md shadow-xs shrink-0 border border-slate-200 dark:border-slate-700"
              />
              <div className="space-y-1.5 text-xs">
                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px]">
                  {selectedBiblio.call_number || 'Koleksi'}
                </span>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-snug">
                  {selectedBiblio.title}
                </h3>
                <div className="text-slate-600 dark:text-slate-400">
                  Pengarang: <span className="font-medium text-slate-900 dark:text-slate-200">{selectedBiblio.sor || '-'}</span>
                </div>
                <div className="text-slate-600 dark:text-slate-400">
                  Penerbit: {selectedBiblio.publisher_name} ({selectedBiblio.publish_year})
                </div>
                <div className="text-slate-600 dark:text-slate-400 font-mono">
                  ISBN: {selectedBiblio.isbn_issn || '-'}
                </div>
                <div className="text-slate-600 dark:text-slate-400">
                  Ketersediaan:{' '}
                  <strong className="text-emerald-600">
                    {selectedBiblio.available_items} dari {selectedBiblio.total_items} tersedia di rak
                  </strong>
                </div>
                {selectedBiblio.notes && (
                  <p className="text-slate-500 text-[11px] pt-2 border-t border-slate-100 dark:border-slate-800">
                    {selectedBiblio.notes}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedBiblio(null)}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md text-xs font-medium"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-4 text-center text-xs text-slate-400">
        LibreM
      </footer>
    </div>
  );
};
