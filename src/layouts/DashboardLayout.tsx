import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FilePlus2,
  Upload,
  FolderOpen,
  Stamp,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { WolfLogo } from '@/components/WolfLogo';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/create', label: 'Create Certificate', icon: FilePlus2 },
  { to: '/bulk', label: 'Bulk Generator', icon: Upload },
  { to: '/records', label: 'Certificate Records', icon: FolderOpen },
  { to: '/seals', label: 'Seal Management', icon: Stamp },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  const nav = (
    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          onClick={() => setSidebarOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
              isActive
                ? 'bg-neutral-800 text-amber-200 font-medium'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`
          }
        >
          <Icon className="w-[18px] h-[18px] shrink-0" />
          {label}
        </NavLink>
      ))}
    </nav>
  );

  const footer = (
    <div className="border-t border-neutral-800 p-3">
      <button
        onClick={handleSignOut}
        className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
      >
        <LogOut className="w-[18px] h-[18px]" />
        Sign Out
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between bg-neutral-950/95 border-b border-neutral-800 px-4 py-3 backdrop-blur">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 -ml-2 text-neutral-300 hover:text-white"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <WolfLogo className="h-6" />
        <div className="w-9" />
      </header>

      {/* Mobile drawer */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative z-10 w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col">
            <div className="flex items-center justify-between px-4 py-4 border-b border-neutral-800">
              <WolfLogo className="h-7" />
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 text-neutral-400 hover:text-white"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {nav}
            {footer}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-64 flex-col bg-neutral-900 border-r border-neutral-800">
        <div className="px-5 py-5 border-b border-neutral-800">
          <WolfLogo className="h-8" />
          <p className="mt-2 text-[10px] tracking-[0.3em] uppercase text-neutral-500">
            Certificate Generator
          </p>
        </div>
        {nav}
        {footer}
      </aside>

      <main className="lg:pl-64 min-h-screen">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
