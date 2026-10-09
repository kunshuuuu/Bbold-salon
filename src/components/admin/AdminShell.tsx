import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  LayoutDashboard,
  Calendar,
  Scissors,
  Users,
  GraduationCap,
  MessageSquareQuote,
  HelpCircle,
  Image as ImageIcon,
  Inbox,
  Clock,
  CalendarOff,
  Settings,
  Type,
  Database,
  ExternalLink,
  Bell,
  LogOut,
  Menu,
  X,
  RefreshCw,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { adminGetAppointments } from '../../lib/adminApi';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import {
  checkSupabaseConnectionProgress,
  type SupabaseConnectionReport,
} from '../../lib/supabaseSetup';

interface NavGroup {
  groupLabel: string;
  items: Array<{
    to: string;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    end?: boolean;
  }>;
}

const SIDEBAR_GROUPS: NavGroup[] = [
  {
    groupLabel: 'TODAY',
    items: [
      { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
      { to: '/admin/appointments', label: 'Appointments', icon: Calendar },
    ],
  },
  {
    groupLabel: 'WEBSITE CONTENT',
    items: [
      { to: '/admin/stations', label: '02 / Six Stations', icon: Layers },
      { to: '/admin/transformations', label: '04 / Transformations', icon: Sparkles },
      { to: '/admin/photos', label: 'Photos & gallery', icon: ImageIcon },
      { to: '/admin/services', label: 'Services', icon: Scissors },
      { to: '/admin/stylists', label: 'Stylists', icon: Users },
      { to: '/admin/courses', label: 'Courses', icon: GraduationCap },
      { to: '/admin/testimonials', label: 'Testimonials', icon: MessageSquareQuote },
      { to: '/admin/faq', label: 'FAQ', icon: HelpCircle },
    ],
  },
  {
    groupLabel: 'ENQUIRIES',
    items: [{ to: '/admin/enquiries', label: 'Academy enquiries', icon: Inbox }],
  },
  {
    groupLabel: 'SITE SETTINGS',
    items: [
      { to: '/admin/hours', label: 'Business hours', icon: Clock },
      { to: '/admin/blocked-dates', label: 'Blocked dates', icon: CalendarOff },
      { to: '/admin/settings', label: 'Salon settings', icon: Settings },
      { to: '/admin/homepage-text', label: 'Homepage text', icon: Type },
      { to: '/admin/data-tools', label: 'Data tools', icon: Database },
    ],
  },
];

export const AdminShell: React.FC = () => {
  const { user, isAdmin, isLoading, signOut, inactivitySecondsLeft, resetInactivityTimer } =
    useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [realtimeToast, setRealtimeToast] = useState<string | null>(null);
  const [connStatus, setConnStatus] = useState<SupabaseConnectionReport | null>(null);
  const [refreshingConn, setRefreshingConn] = useState(false);

  const handleRefreshConn = async () => {
    setRefreshingConn(true);
    try {
      const report = await checkSupabaseConnectionProgress();
      setConnStatus(report);
    } finally {
      setRefreshingConn(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      void handleRefreshConn();
    }
  }, [isAdmin]);

  // Close off-canvas sidebar on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // Redirect to /admin/login ONLY after auth + admin_users check finishes
  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      navigate('/admin/login', { replace: true });
    }
  }, [isLoading, user, isAdmin, navigate]);

  // Poll pending appointments count every 30s + subscribe to realtime inserts
  useEffect(() => {
    if (!isAdmin) return;
    let mounted = true;

    const loadPending = async () => {
      try {
        const list = await adminGetAppointments();
        if (mounted) {
          setPendingCount(list.filter((a) => a.status === 'pending').length);
        }
      } catch {
        // ignore
      }
    };

    void loadPending();
    const pollId = window.setInterval(loadPending, 30000);
    const onLocalUpdate = () => void loadPending();
    window.addEventListener('bbold-appointments-updated', onLocalUpdate);

    let channel: ReturnType<typeof supabase.channel> | null = null;
    if (isSupabaseConfigured()) {
      channel = supabase
        .channel('admin-appointments-feed')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'appointments' },
          (payload) => {
            void loadPending();
            const newRow = payload.new as { full_name?: string; appointment_date?: string };
            setRealtimeToast(
              `New booking request from ${newRow.full_name || 'a client'} (${
                newRow.appointment_date || 'upcoming'
              })`
            );
          }
        )
        .subscribe();
    }

    return () => {
      mounted = false;
      window.clearInterval(pollId);
      window.removeEventListener('bbold-appointments-updated', onLocalUpdate);
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [isAdmin]);

  if (isLoading) {
    return (
      <div className="h-[100dvh] w-full dot-bg bg-[#F6F4F0] text-[#15110F] flex items-center justify-center font-sans text-sm">
        Checking administrator access...
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  // Active page title for Topbar
  const activeItem = SIDEBAR_GROUPS.flatMap((g) => g.items).find((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  );
  const topbarTitle = activeItem?.label || 'Dashboard';

  const renderSidebarLinks = () => (
    <div className="flex flex-col h-full justify-between p-4">
      <div className="space-y-6">
        <div className="px-2 pt-1 flex items-center justify-between">
          <div>
            <div className="font-display font-bold text-lg text-[#15110F]">Bbold Admin</div>
            <div className="text-[12px] leading-[16px] text-[#6B6560]">Salon &amp; Academy</div>
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="lg:hidden p-1.5 rounded-[8px] text-[#6B6560] hover:text-[#15110F]"
            aria-label="Close navigation menu"
          >
            <X size={18} />
          </button>
        </div>

        {SIDEBAR_GROUPS.map((group) => (
          <div key={group.groupLabel} className="space-y-1">
            <div className="px-2 text-[12px] leading-[16px] font-medium text-[#6B6560] uppercase tracking-wider">
              {group.groupLabel}
            </div>
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center justify-between gap-2 px-3 py-2 rounded-[8px] text-[14px] leading-[20px] font-medium transition-colors duration-150 ${
                      isActive
                        ? 'bg-[#C4262E] text-white'
                        : 'text-[#15110F] hover:bg-[#E6E2DB]/60'
                    }`
                  }
                >
                  <span className="flex items-center gap-2.5 min-w-0 truncate">
                    <Icon size={18} className="shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.to === '/admin/appointments' && pendingCount > 0 && (
                    <span className="font-mono text-[11px] px-1.5 py-0.5 rounded-full bg-[#15110F] text-white">
                      {pendingCount}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </div>

      {/* View Website pinned at bottom */}
      <div className="pt-4 border-t border-[#E6E2DB] mt-6">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between px-3 py-2 rounded-[8px] text-[14px] leading-[20px] font-medium text-[#15110F] hover:bg-[#E6E2DB]/60 transition-colors"
        >
          <span>View website</span>
          <ExternalLink size={16} className="text-[#6B6560]" />
        </a>
      </div>
    </div>
  );

  return (
    <div className="h-[100dvh] w-full overflow-hidden dot-bg bg-[#F6F4F0] text-[#15110F] font-sans grid grid-cols-1 lg:grid-cols-[264px_minmax(0,1fr)]">
      <Helmet>
        <title>{topbarTitle} — Bbold Admin</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      {/* Desktop Sidebar (264px, own vertical scroll) */}
      <aside className="hidden lg:block h-[100dvh] overflow-y-auto bg-[#FFFFFF] border-r border-[#E6E2DB] min-w-0">
        {renderSidebarLinks()}
      </aside>

      {/* Tablet / Mobile Off-Canvas Sidebar Drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-[200] flex bg-[#15110F]/40">
          <aside className="w-[264px] max-w-[85%] h-full overflow-y-auto bg-[#FFFFFF] border-r border-[#E6E2DB] shadow-xl">
            {renderSidebarLinks()}
          </aside>
          <div className="flex-1" onClick={() => setDrawerOpen(false)} />
        </div>
      )}

      {/* Main Column (Single vertical scrollbar for page content) */}
      <div className="h-[100dvh] overflow-y-auto min-w-0 flex flex-col pb-16 md:pb-0">
        {/* 64px Sticky Top Bar */}
        <header className="sticky top-0 z-30 h-[64px] bg-[#FFFFFF] border-b border-[#E6E2DB] px-4 md:px-6 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] border border-[#E6E2DB] text-[12px] font-medium text-[#15110F]"
              aria-label="Open menu"
            >
              <Menu size={18} />
              <span>Menu</span>
            </button>
            <span className="text-[16px] leading-[24px] font-semibold text-[#15110F] truncate">
              {topbarTitle}
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {connStatus && (
              <div className="hidden md:inline-flex items-center gap-1 rounded-[8px] border border-[#E6E2DB] bg-[#F6F4F0] px-2.5 py-1 text-[12px]">
                <Link
                  to="/admin/data-tools"
                  className="inline-flex items-center gap-1.5 font-medium text-[#15110F] hover:text-[#C4262E]"
                  title="View Supabase connection progress & SQL setup"
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      connStatus.overallState === 'connected'
                        ? 'bg-[#1E7B4F]'
                        : connStatus.overallState === 'partial'
                        ? 'bg-[#B7791F]'
                        : 'bg-[#B3261E]'
                    }`}
                  />
                  <span>Supabase: {connStatus.statusLabel}</span>
                  <span className="font-mono text-[11px] text-[#6B6560]">
                    ({connStatus.progressPercent}%)
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => void handleRefreshConn()}
                  disabled={refreshingConn}
                  title="Refresh Supabase connection status"
                  className="ml-1 p-1 rounded hover:bg-[#E6E2DB] text-[#15110F] cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={13} className={refreshingConn ? 'animate-spin' : ''} />
                </button>
              </div>
            )}

            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-[#E6E2DB] bg-[#FFFFFF] text-[12px] leading-[16px] font-medium text-[#15110F] hover:bg-[#F6F4F0]"
            >
              <ExternalLink size={16} />
              <span>View website</span>
            </a>

            <Link
              to="/admin/appointments"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-[#E6E2DB] bg-[#FFFFFF] text-[12px] leading-[16px] font-medium text-[#15110F] hover:bg-[#F6F4F0]"
              title="Pending appointment requests"
            >
              <Bell size={16} className={pendingCount > 0 ? 'text-[#C4262E]' : 'text-[#6B6560]'} />
              <span>Pending</span>
              <span className="font-mono font-semibold text-[#C4262E]">{pendingCount}</span>
            </Link>

            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-[#E6E2DB] bg-[#FFFFFF] text-[12px] leading-[16px] font-medium text-[#15110F] hover:bg-[#F6F4F0] cursor-pointer"
            >
              <LogOut size={16} />
              <span>Sign out</span>
            </button>
          </div>
        </header>

        {/* 60-second inactivity warning banner */}
        {inactivitySecondsLeft !== null && (
          <div className="bg-[#B7791F] text-white px-6 py-2.5 flex items-center justify-between gap-4 text-[14px]">
            <span>
              You will be signed out in{' '}
              <strong className="font-mono">{inactivitySecondsLeft}s</strong> due to inactivity.
            </span>
            <button
              type="button"
              onClick={resetInactivityTimer}
              className="px-3 py-1 rounded-[8px] bg-white text-[#15110F] text-[12px] font-medium cursor-pointer"
            >
              Stay signed in
            </button>
          </div>
        )}

        {/* Realtime New Booking Toast */}
        {realtimeToast && (
          <div className="mx-4 md:mx-6 mt-4 p-3 rounded-[8px] bg-[#2F5D8A] text-white flex items-center justify-between gap-3 text-[14px]">
            <span>{realtimeToast}</span>
            <div className="flex items-center gap-2">
              <Link
                to="/admin/appointments"
                onClick={() => setRealtimeToast(null)}
                className="underline font-medium text-[12px]"
              >
                View appointments
              </Link>
              <button
                type="button"
                onClick={() => setRealtimeToast(null)}
                className="p-1 hover:opacity-80 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Centred Max-1200px Page Container */}
        <main className="w-full max-w-[1200px] mx-auto px-4 md:px-6 py-8 min-w-0 flex-1">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Tab Bar (<768px) */}
      <nav
        aria-label="Mobile admin navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 h-16 bg-[#FFFFFF] border-t border-[#E6E2DB] grid grid-cols-4"
      >
        <NavLink
          to="/admin"
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center text-[11px] font-medium ${
              isActive ? 'text-[#C4262E]' : 'text-[#6B6560]'
            }`
          }
        >
          <LayoutDashboard size={18} />
          <span className="mt-0.5">Overview</span>
        </NavLink>
        <NavLink
          to="/admin/appointments"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center text-[11px] font-medium ${
              isActive ? 'text-[#C4262E]' : 'text-[#6B6560]'
            }`
          }
        >
          <Calendar size={18} />
          <span className="mt-0.5">Appointments</span>
        </NavLink>
        <NavLink
          to="/admin/services"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center text-[11px] font-medium ${
              isActive ? 'text-[#C4262E]' : 'text-[#6B6560]'
            }`
          }
        >
          <Scissors size={18} />
          <span className="mt-0.5">Website</span>
        </NavLink>
        <NavLink
          to="/admin/settings"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center text-[11px] font-medium ${
              isActive ? 'text-[#C4262E]' : 'text-[#6B6560]'
            }`
          }
        >
          <Settings size={18} />
          <span className="mt-0.5">Settings</span>
        </NavLink>
      </nav>
    </div>
  );
};
