import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  BookCopy,
  RefreshCw,
  Users,
  UserCheck,
  ExternalLink,
  Moon,
  Sun,
  LogOut,
  Library,
  CornerDownRight,
  Database,
  ArrowRightLeft,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';

export const MODULE_NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard', shortcut: 'F1' },
  { id: 'circulation', label: 'Sirkulasi', icon: RefreshCw, path: '/admin/circulation', shortcut: 'F2' },
  { id: 'quick-return', label: 'Return Kilat', icon: ArrowRightLeft, path: '/admin/circulation/quick-return', shortcut: 'F3' },
  { id: 'catalog', label: 'Bibliografi', icon: BookCopy, path: '/admin/catalog', shortcut: 'F4' },
  { id: 'members', label: 'Keanggotaan', icon: Users, path: '/admin/members', shortcut: 'F5' },
  { id: 'visitor', label: 'Buku Tamu', icon: UserCheck, path: '/visitor-kiosk', shortcut: 'F6', external: true },
];

export const SUB_MENUS: Record<string, { label: string; path: string; shortcut?: string }[]> = {
  circulation: [
    { label: 'Transaksi Peminjaman', path: '/admin/circulation' },
    { label: 'Pengembalian Cepat', path: '/admin/circulation/quick-return' },
    { label: 'Keterlambatan (Overdue)', path: '/admin/circulation/overdues' },
    { label: 'Kas & Riwayat Denda', path: '/admin/circulation/fines' },
  ],
  catalog: [
    { label: 'Katalog Bibliografi', path: '/admin/catalog' },
    { label: 'Eksemplar Fisik', path: '/admin/catalog/items' },
  ],
  members: [
    { label: 'Daftar Anggota', path: '/admin/members' },
  ],
};

export const SlimsLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString('id-ID', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Global hotkeys (F1 - F6)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['F1', 'F2', 'F3', 'F4', 'F5', 'F6'].includes(e.key)) {
        e.preventDefault();
        switch (e.key) {
          case 'F1':
            navigate('/admin/dashboard');
            break;
          case 'F2':
            navigate('/admin/circulation');
            break;
          case 'F3':
            navigate('/admin/circulation/quick-return');
            break;
          case 'F4':
            navigate('/admin/catalog');
            break;
          case 'F5':
            navigate('/admin/members');
            break;
          case 'F6':
            window.open('/visitor-kiosk', '_blank');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  let activeModule = 'dashboard';
  if (location.pathname === '/admin/circulation/quick-return') activeModule = 'quick-return';
  else if (location.pathname.startsWith('/admin/circulation')) activeModule = 'circulation';
  else if (location.pathname.startsWith('/admin/catalog')) activeModule = 'catalog';
  else if (location.pathname.startsWith('/admin/members')) activeModule = 'members';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const currentSubMenus = SUB_MENUS[activeModule === 'quick-return' ? 'circulation' : activeModule] || [];

  return (
    <div className="h-screen w-screen flex bg-white dark:bg-[#09090b] text-zinc-950 dark:text-zinc-50 font-sans overflow-hidden select-none">
      {/* MONOCHROME MINIMALIST WORKSTATION SIDEBAR */}
      <aside className="w-64 flex flex-col shrink-0 border-r border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-[#0c0c0e] justify-between">
        {/* Brand Header */}
        <div>
          <div className="h-14 px-4 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80">
            <Link to="/admin/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-md bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 flex items-center justify-center font-bold text-sm tracking-tight transition-transform group-hover:scale-95">
                <Library className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold tracking-tight leading-none text-zinc-950 dark:text-zinc-50">
                  LibreM
                </span>
                <span className="text-[10px] tracking-widest font-mono text-zinc-500 uppercase mt-0.5">
                  WORKSTATION
                </span>
              </div>
            </Link>

            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500">
              v1.0
            </span>
          </div>

          {/* Module Navigation List */}
          <div className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-210px)]">
            <div className="px-2 pb-1.5 pt-1 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono">
              Operasional
            </div>

            {MODULE_NAV.map((mod) => {
              const Icon = mod.icon;
              const isActive =
                mod.id === 'quick-return'
                  ? location.pathname === '/admin/circulation/quick-return'
                  : mod.id === 'circulation'
                    ? location.pathname.startsWith('/admin/circulation') && location.pathname !== '/admin/circulation/quick-return'
                    : location.pathname.startsWith(mod.path);

              if (mod.external) {
                return (
                  <a
                    key={mod.id}
                    href={mod.path}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-950 dark:group-hover:text-zinc-100" />
                      <span>{mod.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ExternalLink className="w-3 h-3 text-zinc-400 opacity-60" />
                      <span className="text-[10px] font-mono px-1 py-0.2 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500">
                        {mod.shortcut}
                      </span>
                    </div>
                  </a>
                );
              }

              return (
                <div key={mod.id} className="space-y-0.5">
                  <Link
                    to={mod.path}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-medium transition-all ${isActive
                        ? 'bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'
                      }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white dark:text-zinc-950' : 'text-zinc-400 dark:text-zinc-500'}`} />
                      <span>{mod.label}</span>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${isActive
                          ? 'border border-zinc-700 dark:border-zinc-300 text-zinc-300 dark:text-zinc-700 bg-zinc-900 dark:bg-zinc-200'
                          : 'border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500'
                        }`}
                    >
                      {mod.shortcut}
                    </span>
                  </Link>

                  {/* Submenu expansion if module active */}
                  {isActive && currentSubMenus.length > 1 && mod.id !== 'quick-return' && (
                    <div className="pl-4 pr-1 py-1 space-y-0.5 border-l border-zinc-200 dark:border-zinc-800 ml-3.5 my-1">
                      {currentSubMenus.map((sub, sIdx) => {
                        const isSubActive = location.pathname === sub.path;
                        return (
                          <Link
                            key={sIdx}
                            to={sub.path}
                            className={`flex items-center gap-2 px-2 py-1 rounded text-[11px] font-medium transition-colors ${isSubActive
                                ? 'text-zinc-950 dark:text-zinc-100 font-semibold'
                                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
                              }`}
                          >
                            <CornerDownRight className="w-3 h-3 text-zinc-400 shrink-0" />
                            <span className="truncate">{sub.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Hardware / User Status Dock */}
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800/80 space-y-2">
          {/* User Profile Bar */}
          <div className="flex items-center justify-between px-2 py-1">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 flex items-center justify-center text-xs font-bold uppercase shrink-0">
                {user?.username ? user.username.charAt(0) : 'A'}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate leading-none text-zinc-900 dark:text-zinc-100">
                  {user?.full_name || user?.username || 'Petugas'}
                </div>
                <div className="text-[10px] font-mono text-zinc-400 mt-0.5 truncate uppercase">
                  {user?.role || 'SUPERADMIN'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Pure Swap Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors"
                title={`Ganti ke mode ${theme === 'dark' ? 'terang' : 'gelap'}`}
              >
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </button>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-md text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                title="Keluar"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-[#09090b]">
        {/* Top Minimalist Header */}
        <header className="h-14 shrink-0 px-6 border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between bg-white dark:bg-[#09090b]">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              {MODULE_NAV.find((m) => m.id === activeModule)?.label || 'LibreM'}
            </span>
            <span className="text-zinc-300 dark:text-zinc-700">/</span>
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              Perpustakaan Terpadu
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Real-time Clock */}
            <div className="hidden md:flex items-center font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
              {currentTime}
            </div>

            {/* OPAC External Link */}
            <Link
              to="/opac"
              target="_blank"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-2xs"
            >
              <span>Katalog OPAC</span>
              <ExternalLink className="w-3 h-3 text-zinc-400" />
            </Link>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-white dark:bg-[#09090b]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
