import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Library, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(username, password);
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'Nama pengguna atau kata sandi salah. Silakan coba lagi.');
    }
  };

  return (
    <div className="h-full w-full bg-[#0b0c10] text-white flex flex-col justify-between items-center p-4 font-sans select-none relative overflow-y-auto">
      {/* Top spacing */}
      <div className="h-2" />

      {/* Epic Games-Style Auth Card */}
      <div className="w-full max-w-[450px] bg-[#181920] rounded-md px-8 py-10 shadow-2xl flex flex-col my-auto border border-zinc-800/80">
        {/* Emblem Logo - Consistent with Sidebar Neoclassical Library */}
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-lg bg-white text-zinc-950 flex items-center justify-center shadow-lg">
            <Library className="w-7 h-7 stroke-[2]" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold text-white text-center mb-6 tracking-tight">
          Masuk dengan akun LibreM
        </h1>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off" data-lpignore="true">
          {/* Username Input Container */}
          <div className="border border-zinc-700/80 rounded bg-[#121212] px-3.5 py-2 transition-all focus-within:border-white focus-within:ring-1 focus-within:ring-white">
            <label className="block text-[11px] font-medium text-zinc-400 leading-tight">
              Nama Pengguna
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              autoComplete="off"
              data-lpignore="true"
              className="w-full text-white text-sm outline-none pt-0.5 placeholder:text-zinc-600 font-sans"
            />
          </div>

          {/* Password Input Container */}
          <div className="border border-zinc-700/80 rounded bg-[#121212] px-3.5 py-2 transition-all focus-within:border-white focus-within:ring-1 focus-within:ring-white">
            <label className="block text-[11px] font-medium text-zinc-400 leading-tight">
              Kata Sandi
            </label>
            <div className="flex items-center justify-between">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                data-lpignore="true"
                className="w-full text-white text-sm outline-none pt-0.5 placeholder:text-zinc-600 font-sans"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer pl-2"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Action Button: Pure Monochrome Minimalist */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 bg-white hover:bg-zinc-200 active:bg-zinc-300 text-zinc-950 font-bold text-xs tracking-wider rounded uppercase transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-5 shadow-xs"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                <span>MEMVERIFIKASI...</span>
              </>
            ) : (
              <span>MASUK SEKARANG</span>
            )}
          </button>
        </form>

        {/* Footer Sub-Links */}
        <div className="mt-8 pt-6 border-t border-zinc-800/80 flex flex-col items-center gap-3 text-xs text-zinc-400">
          <Link
            to="/opac"
            className="text-zinc-300 hover:text-white hover:underline"
          >
            Akses Publik: Katalog OPAC
          </Link>
          <div className="flex items-center gap-4 text-[11px] text-zinc-500">
            <Link to="/visitor-kiosk" className="hover:text-zinc-300 transition-colors">
              Buku Tamu Pengunjung
            </Link>
            <span>&bull;</span>
            <span>Versi 1.0.0</span>
          </div>
        </div>
      </div>

      {/* Bottom spacer */}
      <div className="h-4" />
    </div>
  );
};
