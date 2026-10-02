import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Database, Palette, User, CheckCircle2, Loader2, Cpu, Library } from 'lucide-react';
import { apiRequest } from '@/lib/api';

export const SetupWizard: React.FC = () => {
  const [step, setStep] = useState(1);
  const [machineID, setMachineID] = useState('');
  const [licenseToken, setLicenseToken] = useState('LIBREM-2026-TRIAL-COMMERCIAL-UNLIMITED');
  const [licenseStatus, setLicenseStatus] = useState<any | null>(null);

  // DB Config
  const [dbHost, setDbHost] = useState('127.0.0.1');
  const [dbPort, setDbPort] = useState('5432');
  const [dbUser, setDbUser] = useState('postgres');
  const [dbPassword, setDbPassword] = useState('LibremDB92342');
  const [dbName, setDbName] = useState('librem_db');

  // Branding
  const [libName, setLibName] = useState('Perpustakaan LibreM');
  const [subName, setSubName] = useState('Sistem Otomasi Perpustakaan');
  const [themeColor, setThemeColor] = useState('#09090b');

  // Admin
  const [adminUser, setAdminUser] = useState('admin');
  const [adminFullName, setAdminFullName] = useState('Kepala Perpustakaan');
  const [adminEmail, setAdminEmail] = useState('admin@perpus.sch.id');
  const [adminPassword, setAdminPassword] = useState('admin123');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await apiRequest<any>('/setup/status');
        setMachineID(res.machine_id);
      } catch (err) {
        console.error(err);
      }
    };
    fetchStatus();
  }, []);

  const handleVerifyLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<any>('/setup/verify-license', {
        method: 'POST',
        body: JSON.stringify({ license_token: licenseToken }),
      });
      setLicenseStatus(res);
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Lisensi tidak valid');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigureDB = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiRequest('/setup/configure-db', {
        method: 'POST',
        body: JSON.stringify({
          host: dbHost,
          port: dbPort,
          user: dbUser,
          password: dbPassword,
          database: dbName,
          ssl_mode: 'disable',
        }),
      });
      setStep(3);
    } catch (err: any) {
      setError(err.message || 'Gagal menyambung ke database');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiRequest('/setup/branding', {
        method: 'POST',
        body: JSON.stringify({
          name: libName,
          sub_name: subName,
          theme_color: themeColor,
        }),
      });
      setStep(4);
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan identitas');
    } finally {
      setLoading(false);
    }
  };

  const handleInitAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiRequest('/setup/init-superadmin', {
        method: 'POST',
        body: JSON.stringify({
          username: adminUser,
          full_name: adminFullName,
          email: adminEmail,
          password: adminPassword,
        }),
      });
      alert('Setup selesai. Silakan masuk.');
      navigate('/login');
    } catch (err: any) {
      setError(err.message || 'Gagal membuat akun superadmin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans p-6 sm:p-12 flex flex-col justify-between">
      <div className="max-w-2xl mx-auto w-full">
        {/* Step Progress Indicators */}
        <div className="text-center mb-8">
          {/* Brand Emblem */}
          <div className="flex justify-center mb-4">
            <div className="w-11 h-11 rounded-lg bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 flex items-center justify-center shadow-md">
              <Library className="w-6 h-6 stroke-[2]" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Konfigurasi Awal LibreM</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Setup instalasi sistem perpustakaan modern
          </p>

          <div className="flex items-center justify-center gap-2 mt-5">
            {[
              { num: 1, label: 'Lisensi', icon: Cpu },
              { num: 2, label: 'Database', icon: Database },
              { num: 3, label: 'Identitas', icon: Palette },
              { num: 4, label: 'Admin', icon: User },
            ].map((s) => {
              const Icon = s.icon;
              const isActive = step === s.num;
              const isPast = step > s.num;
              return (
                <div
                  key={s.num}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                      : isPast
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-400'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-600 text-xs">
            {error}
          </div>
        )}

        {/* STEP 1: LICENSE & MACHINE ID */}
        {step === 1 && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
            <div className="space-y-0.5">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Cpu className="w-4 h-4 text-slate-500" />
                Langkah 1: Identifikasi Mesin & Lisensi
              </h2>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1 font-mono text-xs">
              <div className="text-slate-400 text-[11px]">Hardware ID:</div>
              <div className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-wide">
                {machineID || 'MEMUAT...'}
              </div>
            </div>

            <form onSubmit={handleVerifyLicense} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                  Kunci Lisensi
                </label>
                <input
                  type="text"
                  required
                  value={licenseToken}
                  onChange={(e) => setLicenseToken(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                <span>Verifikasi & Lanjut</span>
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: DATABASE CONFIG */}
        {step === 2 && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
            <div className="space-y-0.5">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Database className="w-4 h-4 text-slate-500" />
                Langkah 2: Konfigurasi Database PostgreSQL
              </h2>
            </div>

            <form onSubmit={handleConfigureDB} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Host</label>
                  <input
                    type="text"
                    required
                    value={dbHost}
                    onChange={(e) => setDbHost(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Port</label>
                  <input
                    type="text"
                    required
                    value={dbPort}
                    onChange={(e) => setDbPort(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">User</label>
                  <input
                    type="text"
                    required
                    value={dbUser}
                    onChange={(e) => setDbUser(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Password</label>
                  <input
                    type="password"
                    value={dbPassword}
                    onChange={(e) => setDbPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Nama Database</label>
                <input
                  type="text"
                  required
                  value={dbName}
                  onChange={(e) => setDbName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md font-mono"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Simpan & Lanjut</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 3: BRANDING */}
        {step === 3 && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
            <div className="space-y-0.5">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Palette className="w-4 h-4 text-slate-500" />
                Langkah 3: Identitas Perpustakaan
              </h2>
            </div>

            <form onSubmit={handleSaveBranding} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Nama Perpustakaan</label>
                <input
                  type="text"
                  required
                  value={libName}
                  onChange={(e) => setLibName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Sub-Header</label>
                <input
                  type="text"
                  required
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold"
                >
                  <span>Simpan</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 4: SUPERADMIN */}
        {step === 4 && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
            <div className="space-y-0.5">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <User className="w-4 h-4 text-slate-500" />
                Langkah 4: Akun Superadmin
              </h2>
            </div>

            <form onSubmit={handleInitAdmin} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={adminUser}
                    onChange={(e) => setAdminUser(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    value={adminFullName}
                    onChange={(e) => setAdminFullName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Kata Sandi</label>
                  <input
                    type="password"
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-xs"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Selesai & Luncurkan</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      <div className="text-center text-xs text-slate-400">
        LibreM
      </div>
    </div>
  );
};
