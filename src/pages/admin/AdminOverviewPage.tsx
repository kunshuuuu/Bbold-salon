import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { addDays, format, startOfDay, startOfMonth } from 'date-fns';
import {
  CheckCircle2,
  Circle,
  Plus,
  Calendar,
  Scissors,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import {
  adminGetAppointments,
  adminGetServices,
  adminGetStylists,
  adminUpdateAppointmentStatus,
} from '../../lib/adminApi';
import {
  getSampleContentCounts,
  removeAllSampleContent,
} from '../../lib/content';
import {
  formatDateYMD,
  formatTimeStringLabel,
  getKolkataNow,
} from '../../lib/availability';
import { useSiteData } from '../../context/SiteDataContext';
import {
  PageHeader,
  StatusBadge,
  ConfirmDialog,
  ToastContainer,
  AdminSkeleton,
  type ToastMessage,
} from '../../components/admin/AdminUI';
import type {
  Appointment,
  SampleContentCounts,
  Service,
  Stylist,
} from '../../types/database';

export const AdminOverviewPage: React.FC = () => {
  const { salonSettings, businessHours, siteImages, refreshSiteData } = useSiteData();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [sampleCounts, setSampleCounts] = useState<SampleContentCounts>({
    services: 0,
    stylists: 0,
    courses: 0,
    testimonials: 0,
    gallery_items: 0,
    faqs: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [confirmRemoveSample, setConfirmRemoveSample] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const [appts, srvs, stys, counts] = await Promise.all([
        adminGetAppointments(),
        adminGetServices(),
        adminGetStylists(),
        getSampleContentCounts(),
      ]);
      setAppointments(appts);
      setServices(srvs);
      setStylists(stys);
      setSampleCounts(counts);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
    const onApptUpdate = () => void loadOverview();
    window.addEventListener('bbold-appointments-updated', onApptUpdate);
    return () => window.removeEventListener('bbold-appointments-updated', onApptUpdate);
  }, [loadOverview]);

  const nowKolkata = useMemo(() => getKolkataNow(), []);
  const todayStr = useMemo(() => formatDateYMD(nowKolkata), [nowKolkata]);
  const next7Str = useMemo(() => formatDateYMD(addDays(nowKolkata, 7)), [nowKolkata]);
  const monthStartStr = useMemo(
    () => formatDateYMD(startOfMonth(nowKolkata)),
    [nowKolkata]
  );

  // Metric cards
  const metrics = useMemo(() => {
    const todaysAppts = appointments.filter(
      (a) => a.appointment_date === todayStr && a.status !== 'cancelled'
    ).length;
    const pendingToConfirm = appointments.filter((a) => a.status === 'pending').length;
    const next7Days = appointments.filter(
      (a) =>
        a.appointment_date >= todayStr &&
        a.appointment_date <= next7Str &&
        a.status !== 'cancelled'
    ).length;
    const completedThisMonth = appointments.filter(
      (a) => a.appointment_date >= monthStartStr && a.status === 'completed'
    ).length;
    const activeServices = services.filter((s) => s.is_active).length;

    return {
      todaysAppts,
      pendingToConfirm,
      next7Days,
      completedThisMonth,
      activeServices,
    };
  }, [appointments, services, todayStr, next7Str, monthStartStr]);

  // Next up list (today & future confirmed/pending)
  const nextUpList = useMemo(() => {
    return appointments
      .filter((a) => a.appointment_date >= todayStr && a.status !== 'cancelled')
      .sort((a, b) =>
        `${a.appointment_date} ${a.start_time}`.localeCompare(
          `${b.appointment_date} ${b.start_time}`
        )
      )
      .slice(0, 5);
  }, [appointments, todayStr]);

  // Pending queue
  const pendingQueue = useMemo(() => {
    return appointments
      .filter((a) => a.status === 'pending')
      .sort((a, b) =>
        `${a.appointment_date} ${a.start_time}`.localeCompare(
          `${b.appointment_date} ${b.start_time}`
        )
      )
      .slice(0, 6);
  }, [appointments]);

  // 14-day appointments bar chart data (last 7 days + next 7 days)
  const chartDays = useMemo(() => {
    const start = addDays(startOfDay(nowKolkata), -6);
    const bars: Array<{ dateStr: string; label: string; count: number }> = [];
    for (let i = 0; i < 14; i++) {
      const d = addDays(start, i);
      const dStr = formatDateYMD(d);
      const count = appointments.filter(
        (a) => a.appointment_date === dStr && a.status !== 'cancelled'
      ).length;
      bars.push({
        dateStr: dStr,
        label: format(d, 'd MMM'),
        count,
      });
    }
    return bars;
  }, [appointments, nowKolkata]);

  const maxChartCount = Math.max(1, ...chartDays.map((b) => b.count));

  // Website setup checklist
  const checklist = useMemo(() => {
    const addressSet = Boolean(
      salonSettings.salon_address &&
        !salonSettings.salon_address.toUpperCase().includes('TODO')
    );
    const hoursSet = businessHours.some((b) => b.is_open);
    const realServicesAdded = services.some((s) => !s.is_sample && s.is_active);
    const realStylistsAdded = stylists.some((s) => !s.is_sample && s.is_active);
    const photosFilled = Object.keys(siteImages).some((k) => Boolean(siteImages[k]?.image_url));
    const sampleRemoved = sampleCounts.total === 0;

    return [
      {
        label: 'Salon address and email confirmed',
        done: addressSet,
        link: '/admin/settings',
        actionText: 'Edit settings',
      },
      {
        label: 'Weekly business hours set',
        done: hoursSet,
        link: '/admin/hours',
        actionText: 'Review hours',
      },
      {
        label: 'Real services published',
        done: realServicesAdded,
        link: '/admin/services',
        actionText: 'Manage services',
      },
      {
        label: 'Real stylists published',
        done: realStylistsAdded,
        link: '/admin/stylists',
        actionText: 'Manage stylists',
      },
      {
        label: 'Website photos uploaded',
        done: photosFilled,
        link: '/admin/photos',
        actionText: 'Upload photos',
      },
      {
        label: 'Sample content removed before launch',
        done: sampleRemoved,
        link: '/admin/data-tools',
        actionText: 'Clean sample data',
      },
    ];
  }, [salonSettings, businessHours, services, stylists, siteImages, sampleCounts.total]);

  const handleQuickStatus = async (id: string, status: 'confirmed' | 'cancelled') => {
    await adminUpdateAppointmentStatus(id, status);
    await loadOverview();
    setToast({
      id: String(Date.now()),
      text: `Appointment marked as ${status}.`,
    });
  };

  const handleRemoveAllSample = async () => {
    setConfirmRemoveSample(false);
    const res = await removeAllSampleContent();
    await refreshSiteData();
    await loadOverview();
    const deactivatedNote =
      res.deactivatedServicesCount > 0
        ? ` (${res.deactivatedServicesCount} sample service referenced by appointments was hidden instead of deleted.)`
        : '';
    setToast({
      id: String(Date.now()),
      text: `Removed all sample content.${deactivatedNote}`,
    });
  };

  const getServiceName = (id: string) =>
    services.find((s) => s.id === id)?.name || 'Service';
  const getStylistName = (id: string | null) =>
    stylists.find((s) => s.id === id)?.name || 'First available';

  return (
    <div className="space-y-6 min-w-0">
      <PageHeader
        title="Overview"
        description="See today's salon schedule, confirm pending appointment requests, and track website readiness."
        helpText="This page summarizes your upcoming appointments, pending requests that need a confirmation call or WhatsApp, and your launch checklist."
        primaryActionLabel="New appointment"
        onPrimaryAction={() => {
          window.location.href = '/admin/appointments?new=1';
        }}
      />

      {loading ? (
        <AdminSkeleton rows={5} />
      ) : (
        <>
          {/* 5 Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="p-4 rounded-[12px] bg-[#FFFFFF] border border-[#E6E2DB]">
              <div className="text-[12px] leading-[16px] font-medium text-[#6B6560]">
                Today&apos;s appointments
              </div>
              <div className="font-mono text-2xl font-semibold text-[#15110F] mt-1">
                {metrics.todaysAppts}
              </div>
            </div>
            <div className="p-4 rounded-[12px] bg-[#FFFFFF] border border-[#E6E2DB]">
              <div className="text-[12px] leading-[16px] font-medium text-[#6B6560]">
                Pending to confirm
              </div>
              <div className="font-mono text-2xl font-semibold text-[#B7791F] mt-1">
                {metrics.pendingToConfirm}
              </div>
            </div>
            <div className="p-4 rounded-[12px] bg-[#FFFFFF] border border-[#E6E2DB]">
              <div className="text-[12px] leading-[16px] font-medium text-[#6B6560]">
                Next 7 days
              </div>
              <div className="font-mono text-2xl font-semibold text-[#15110F] mt-1">
                {metrics.next7Days}
              </div>
            </div>
            <div className="p-4 rounded-[12px] bg-[#FFFFFF] border border-[#E6E2DB]">
              <div className="text-[12px] leading-[16px] font-medium text-[#6B6560]">
                Completed this month
              </div>
              <div className="font-mono text-2xl font-semibold text-[#1E7B4F] mt-1">
                {metrics.completedThisMonth}
              </div>
            </div>
            <div className="p-4 rounded-[12px] bg-[#FFFFFF] border border-[#E6E2DB]">
              <div className="text-[12px] leading-[16px] font-medium text-[#6B6560]">
                Published services
              </div>
              <div className="font-mono text-2xl font-semibold text-[#15110F] mt-1">
                {metrics.activeServices}
              </div>
            </div>
          </div>

          {/* Pending Queue + Next Up */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pending Queue with One-Click Confirm / Cancel */}
            <div className="p-6 rounded-[12px] bg-[#FFFFFF] border border-[#E6E2DB] min-w-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[16px] leading-[24px] font-semibold text-[#15110F]">
                  Pending requests to confirm
                </h2>
                <Link
                  to="/admin/appointments"
                  className="text-[12px] font-medium text-[#C4262E] hover:underline"
                >
                  View all
                </Link>
              </div>

              {pendingQueue.length === 0 ? (
                <p className="text-[14px] text-[#6B6560] py-6 text-center">
                  All caught up — no pending appointment requests waiting.
                </p>
              ) : (
                <div className="space-y-3">
                  {pendingQueue.map((appt) => (
                    <div
                      key={appt.id}
                      className="p-3.5 rounded-[8px] bg-[#F6F4F0] border border-[#E6E2DB] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-[14px] font-semibold text-[#15110F] truncate">
                          {appt.full_name} ·{' '}
                          <span className="font-mono font-normal text-[12px]">{appt.phone}</span>
                        </div>
                        <div className="text-[12px] text-[#6B6560] truncate">
                          {getServiceName(appt.service_id)} ({getStylistName(appt.stylist_id)})
                        </div>
                        <div className="font-mono text-[12px] text-[#15110F] mt-0.5">
                          {appt.appointment_date} · {formatTimeStringLabel(appt.start_time)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => void handleQuickStatus(appt.id, 'confirmed')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[8px] bg-[#1E7B4F] text-white text-[12px] font-medium cursor-pointer"
                        >
                          <Check size={14} />
                          <span>Confirm</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleQuickStatus(appt.id, 'cancelled')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] text-[#B3261E] text-[12px] font-medium cursor-pointer"
                        >
                          <X size={14} />
                          <span>Cancel</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Next Up List */}
            <div className="p-6 rounded-[12px] bg-[#FFFFFF] border border-[#E6E2DB] min-w-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[16px] leading-[24px] font-semibold text-[#15110F]">
                  Next up on the floor
                </h2>
                <Link
                  to="/admin/appointments"
                  className="text-[12px] font-medium text-[#C4262E] hover:underline"
                >
                  Open schedule
                </Link>
              </div>

              {nextUpList.length === 0 ? (
                <p className="text-[14px] text-[#6B6560] py-6 text-center">
                  No upcoming appointments scheduled yet.
                </p>
              ) : (
                <div className="divide-y divide-[#E6E2DB]">
                  {nextUpList.map((appt) => (
                    <div
                      key={appt.id}
                      className="py-3 flex items-center justify-between gap-3 min-w-0"
                    >
                      <div className="min-w-0">
                        <div className="text-[14px] font-medium text-[#15110F] truncate">
                          {appt.full_name} — {getServiceName(appt.service_id)}
                        </div>
                        <div className="text-[12px] text-[#6B6560] font-mono">
                          {appt.appointment_date} at {formatTimeStringLabel(appt.start_time)} ·{' '}
                          {getStylistName(appt.stylist_id)}
                        </div>
                      </div>
                      <StatusBadge variant={appt.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 14-Day Appointments Bar Chart in Plain SVG */}
          <div className="p-6 rounded-[12px] bg-[#FFFFFF] border border-[#E6E2DB] min-w-0">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[16px] leading-[24px] font-semibold text-[#15110F]">
                  14-day appointments activity
                </h2>
                <p className="text-[12px] text-[#6B6560]">
                  Past 7 days and upcoming 7 days (excluding cancelled)
                </p>
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <svg
                viewBox="0 0 700 180"
                className="w-full h-44 min-w-[520px]"
                role="img"
                aria-label="14-day appointments bar chart"
              >
                {chartDays.map((bar, idx) => {
                  const x = 20 + idx * 48;
                  const maxBarH = 110;
                  const barH = Math.max(4, Math.round((bar.count / maxChartCount) * maxBarH));
                  const y = 135 - barH;
                  const isToday = bar.dateStr === todayStr;

                  return (
                    <g key={bar.dateStr}>
                      <rect
                        x={x}
                        y={y}
                        width={28}
                        height={barH}
                        rx={4}
                        fill={isToday ? '#C4262E' : '#2F5D8A'}
                        opacity={bar.count === 0 ? 0.2 : 0.9}
                      />
                      <text
                        x={x + 14}
                        y={y - 6}
                        textAnchor="middle"
                        className="font-mono text-[10px] fill-[#15110F]"
                      >
                        {bar.count}
                      </text>
                      <text
                        x={x + 14}
                        y={156}
                        textAnchor="middle"
                        className="font-mono text-[9px] fill-[#6B6560]"
                      >
                        {bar.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Website Setup Checklist + Sample Content Card + Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Website Setup Checklist (7 cols) */}
            <div className="lg:col-span-7 p-6 rounded-[12px] bg-[#FFFFFF] border border-[#E6E2DB]">
              <h2 className="text-[16px] leading-[24px] font-semibold text-[#15110F] mb-1">
                Website setup checklist
              </h2>
              <p className="text-[12px] text-[#6B6560] mb-4">
                Complete these items before sharing your website publicly.
              </p>

              <div className="divide-y divide-[#E6E2DB]">
                {checklist.map((item, idx) => (
                  <div
                    key={idx}
                    className="py-3 flex items-center justify-between gap-3 text-[14px]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {item.done ? (
                        <CheckCircle2 size={18} className="text-[#1E7B4F] shrink-0" />
                      ) : (
                        <Circle size={18} className="text-[#B7791F] shrink-0" />
                      )}
                      <span
                        className={
                          item.done ? 'text-[#6B6560] line-through truncate' : 'text-[#15110F] truncate'
                        }
                      >
                        {item.label}
                      </span>
                    </div>
                    <Link
                      to={item.link}
                      className="text-[12px] font-medium text-[#C4262E] hover:underline whitespace-nowrap shrink-0"
                    >
                      {item.actionText} →
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Sample Content Card & Quick Actions (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="p-6 rounded-[12px] bg-[#FFFFFF] border border-[#E6E2DB]">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-[16px] leading-[24px] font-semibold text-[#15110F]">
                    Sample content
                  </h2>
                  <StatusBadge
                    variant={sampleCounts.total > 0 ? 'sample' : 'published'}
                    label={`${sampleCounts.total} sample rows`}
                  />
                </div>
                <p className="text-[12px] leading-[16px] text-[#6B6560] mb-4">
                  Sample rows let you preview the full design right away. Edit them to make them
                  real, or remove all sample rows at once.
                </p>

                <div className="grid grid-cols-3 gap-2 text-center mb-4">
                  <div className="p-2 rounded-[8px] bg-[#F6F4F0]">
                    <div className="font-mono text-sm font-semibold">{sampleCounts.services}</div>
                    <div className="text-[11px] text-[#6B6560]">Services</div>
                  </div>
                  <div className="p-2 rounded-[8px] bg-[#F6F4F0]">
                    <div className="font-mono text-sm font-semibold">{sampleCounts.stylists}</div>
                    <div className="text-[11px] text-[#6B6560]">Stylists</div>
                  </div>
                  <div className="p-2 rounded-[8px] bg-[#F6F4F0]">
                    <div className="font-mono text-sm font-semibold">{sampleCounts.courses}</div>
                    <div className="text-[11px] text-[#6B6560]">Courses</div>
                  </div>
                  <div className="p-2 rounded-[8px] bg-[#F6F4F0]">
                    <div className="font-mono text-sm font-semibold">
                      {sampleCounts.testimonials}
                    </div>
                    <div className="text-[11px] text-[#6B6560]">Quotes</div>
                  </div>
                  <div className="p-2 rounded-[8px] bg-[#F6F4F0]">
                    <div className="font-mono text-sm font-semibold">
                      {sampleCounts.gallery_items}
                    </div>
                    <div className="text-[11px] text-[#6B6560]">Gallery</div>
                  </div>
                  <div className="p-2 rounded-[8px] bg-[#F6F4F0]">
                    <div className="font-mono text-sm font-semibold">{sampleCounts.faqs}</div>
                    <div className="text-[11px] text-[#6B6560]">FAQs</div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={sampleCounts.total === 0}
                  onClick={() => setConfirmRemoveSample(true)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-[8px] border border-[#B3261E]/40 text-[#B3261E] text-[14px] font-medium hover:bg-[#B3261E]/10 disabled:opacity-40 cursor-pointer"
                >
                  <Trash2 size={16} />
                  <span>Remove all sample content</span>
                </button>
              </div>

              {/* Quick Actions */}
              <div className="p-6 rounded-[12px] bg-[#FFFFFF] border border-[#E6E2DB]">
                <h2 className="text-[16px] leading-[24px] font-semibold text-[#15110F] mb-3">
                  Quick actions
                </h2>
                <div className="grid grid-cols-2 gap-2.5 text-[12px] font-medium">
                  <Link
                    to="/admin/services"
                    className="p-3 rounded-[8px] bg-[#F6F4F0] hover:bg-[#E6E2DB]/60 flex items-center gap-2 text-[#15110F]"
                  >
                    <Plus size={16} className="text-[#C4262E]" />
                    <span>Add a service</span>
                  </Link>
                  <Link
                    to="/admin/blocked-dates"
                    className="p-3 rounded-[8px] bg-[#F6F4F0] hover:bg-[#E6E2DB]/60 flex items-center gap-2 text-[#15110F]"
                  >
                    <Calendar size={16} className="text-[#C4262E]" />
                    <span>Block a date</span>
                  </Link>
                  <Link
                    to="/admin/hours"
                    className="p-3 rounded-[8px] bg-[#F6F4F0] hover:bg-[#E6E2DB]/60 flex items-center gap-2 text-[#15110F]"
                  >
                    <Scissors size={16} className="text-[#C4262E]" />
                    <span>Edit hours</span>
                  </Link>
                  <Link
                    to="/admin/photos"
                    className="p-3 rounded-[8px] bg-[#F6F4F0] hover:bg-[#E6E2DB]/60 flex items-center gap-2 text-[#15110F]"
                  >
                    <Plus size={16} className="text-[#C4262E]" />
                    <span>Upload photos</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmRemoveSample}
        title="Remove all sample content?"
        description="This deletes all sample services, stylists, courses, testimonials, gallery items, and FAQs. Any sample service linked to an existing appointment will be hidden instead of deleted."
        confirmLabel="Remove sample content"
        onConfirm={() => void handleRemoveAllSample()}
        onCancel={() => setConfirmRemoveSample(false)}
      />

      <ToastContainer toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
};
