import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { addMinutes, format } from 'date-fns';
import { Download, MessageCircle, Phone } from 'lucide-react';
import {
  adminCreateManualAppointment,
  adminGetAppointments,
  adminGetServices,
  adminGetStylists,
  adminUpdateAppointmentStatus,
} from '../../lib/adminApi';
import {
  getPublicBlockedDates,
  getPublicBusinessHours,
  getPublicSalonSettings,
} from '../../lib/content';
import {
  combineDateAndTime,
  computeAvailableSlots,
  formatDateYMD,
  formatTimeStringLabel,
  getKolkataNow,
  parseDateYMD,
  parseTimeStr,
} from '../../lib/availability';
import { buildWhatsAppUrl } from '../../config/site';
import {
  PageHeader,
  Toolbar,
  Drawer,
  FormField,
  StatusBadge,
  KebabMenu,
  EmptyState,
  AdminSkeleton,
  ToastContainer,
  type ToastMessage,
} from '../../components/admin/AdminUI';
import type {
  Appointment,
  AppointmentStatus,
  BlockedDate,
  BusinessHour,
  SalonSettings,
  Service,
  Stylist,
} from '../../types/database';

export const AdminAppointmentsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [salonSettings, setSalonSettings] = useState<SalonSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState<'list' | 'day'>('list');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AppointmentStatus>('all');
  const [stylistFilter, setStylistFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [dayViewDate, setDayViewDate] = useState<string>(() => formatDateYMD(getKolkataNow()));

  // Manual phone / walk-in booking drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mFullName, setMFullName] = useState('');
  const [mPhone, setMPhone] = useState('');
  const [mEmail, setMEmail] = useState('');
  const [mServiceId, setMServiceId] = useState('');
  const [mStylistId, setMStylistId] = useState('any');
  const [mDateStr, setMDateStr] = useState(() => formatDateYMD(getKolkataNow()));
  const [mStartTime, setMStartTime] = useState('11:00:00');
  const [mStatus, setMStatus] = useState<AppointmentStatus>('confirmed');
  const [mNotes, setMNotes] = useState('');
  const [mOverrideSchedule, setMOverrideSchedule] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [appts, srvs, stys, bh, blk, set] = await Promise.all([
        adminGetAppointments(),
        adminGetServices(),
        adminGetStylists(),
        getPublicBusinessHours(),
        getPublicBlockedDates(),
        getPublicSalonSettings(),
      ]);
      setAppointments(appts);
      setServices(srvs);
      setStylists(stys);
      setBusinessHours(bh);
      setBlockedDates(blk);
      setSalonSettings(set);
      if (!mServiceId && srvs.length > 0) {
        setMServiceId(srvs[0].id);
      }
    } finally {
      setLoading(false);
    }
  }, [mServiceId]);

  useEffect(() => {
    void loadData();
    if (searchParams.get('new') === '1') {
      setDrawerOpen(true);
      searchParams.delete('new');
      setSearchParams(searchParams, { replace: true });
    }
  }, [loadData, searchParams, setSearchParams]);

  const serviceMap = useMemo(() => {
    const m: Record<string, Service> = {};
    for (const s of services) m[s.id] = s;
    return m;
  }, [services]);

  const stylistMap = useMemo(() => {
    const m: Record<string, Stylist> = {};
    for (const s of stylists) m[s.id] = s;
    return m;
  }, [stylists]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (stylistFilter !== 'all' && (a.stylist_id || 'any') !== stylistFilter) return false;
      if (dateFrom && a.appointment_date < dateFrom) return false;
      if (dateTo && a.appointment_date > dateTo) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchName = a.full_name.toLowerCase().includes(q);
        const matchPhone = a.phone.toLowerCase().includes(q);
        if (!matchName && !matchPhone) return false;
      }
      return true;
    });
  }, [appointments, statusFilter, stylistFilter, dateFrom, dateTo, search]);

  // Available slots for the manual booking drawer (uses the shared availability module)
  const manualAvailableSlots = useMemo(() => {
    if (!salonSettings) return [];
    const srv = services.find((s) => s.id === mServiceId);
    if (!srv) return [];
    const d = parseDateYMD(mDateStr) || getKolkataNow();
    const busyForDay = appointments
      .filter((a) => a.appointment_date === mDateStr && a.status !== 'cancelled')
      .map((a) => ({
        stylist_id: a.stylist_id,
        start_time: a.start_time,
        end_time: a.end_time,
      }));

    const res = computeAvailableSlots({
      date: d,
      service: srv,
      stylistChoice: mStylistId,
      businessHours,
      blockedDates,
      salonSettings,
      busySlots: busyForDay,
      activeStylists: stylists.filter((s) => s.is_active),
    });
    return res.slots;
  }, [salonSettings, services, mServiceId, mDateStr, appointments, mStylistId, businessHours, blockedDates, stylists]);

  const handleStatusChange = async (id: string, nextStatus: AppointmentStatus) => {
    await adminUpdateAppointmentStatus(id, nextStatus);
    await loadData();
    setToast({
      id: String(Date.now()),
      text: 'Saved. This is now live on your website.',
    });
  };

  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    const srv = services.find((s) => s.id === mServiceId);
    if (!srv || !mFullName.trim() || !mPhone.trim()) return;

    setSaving(true);
    try {
      const d = parseDateYMD(mDateStr) || getKolkataNow();
      const startParts = parseTimeStr(mStartTime) || { hours: 11, minutes: 0, seconds: 0 };
      const startDate = combineDateAndTime(d, startParts);
      const endDate = addMinutes(startDate, srv.duration_minutes);

      await adminCreateManualAppointment({
        full_name: mFullName.trim(),
        phone: mPhone.replace(/\s+/g, ''),
        email: mEmail.trim() || 'walkin@bboldmumbai.com',
        service_id: srv.id,
        stylist_id: mStylistId === 'any' ? stylists[0]?.id || null : mStylistId,
        appointment_date: mDateStr,
        start_time: format(startDate, 'HH:mm:ss'),
        end_time: format(endDate, 'HH:mm:ss'),
        status: mStatus,
        notes: mNotes.trim() || null,
      });

      setDrawerOpen(false);
      setMFullName('');
      setMPhone('');
      setMEmail('');
      setMNotes('');
      await loadData();
      setToast({
        id: String(Date.now()),
        text: 'Saved. This is now live on your website.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'Date',
      'Start Time',
      'End Time',
      'Client Name',
      'Phone',
      'Email',
      'Service',
      'Stylist',
      'Status',
      'Notes',
    ];
    const rows = filteredAppointments.map((a) => [
      a.appointment_date,
      a.start_time,
      a.end_time,
      `"${a.full_name.replace(/"/g, '""')}"`,
      a.phone,
      a.email,
      `"${(serviceMap[a.service_id]?.name || '').replace(/"/g, '""')}"`,
      `"${(a.stylist_id ? stylistMap[a.stylist_id]?.name || '' : 'Unassigned').replace(/"/g, '""')}"`,
      a.status,
      `"${(a.notes || '').replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bbold-appointments-${formatDateYMD(getKolkataNow())}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 min-w-0">
      <PageHeader
        title="Appointments"
        description="Manage client bookings, confirm pending requests, or add phone and walk-in appointments."
        helpText="Online bookings arrive here as Pending. Confirm them once you have spoken with the client, or switch to Day view to see each stylist's column."
        primaryActionLabel="New appointment"
        onPrimaryAction={() => setDrawerOpen(true)}
        secondaryActions={
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] text-[14px] font-medium text-[#15110F] hover:bg-[#F6F4F0] cursor-pointer"
          >
            <Download size={16} />
            <span>Export CSV</span>
          </button>
        }
      />

      <Toolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by client name or phone..."
      >
        {/* View Switcher: List vs Day View by Stylist */}
        <div className="inline-flex rounded-[8px] bg-[#E6E2DB]/60 p-1">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-3 py-1 rounded-[6px] text-[12px] font-medium cursor-pointer ${
              viewMode === 'list' ? 'bg-[#FFFFFF] text-[#15110F] shadow-sm' : 'text-[#6B6560]'
            }`}
          >
            List view
          </button>
          <button
            type="button"
            onClick={() => setViewMode('day')}
            className={`px-3 py-1 rounded-[6px] text-[12px] font-medium cursor-pointer ${
              viewMode === 'day' ? 'bg-[#FFFFFF] text-[#15110F] shadow-sm' : 'text-[#6B6560]'
            }`}
          >
            Day view by stylist
          </button>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | AppointmentStatus)}
          aria-label="Filter by status"
          className="px-3 py-2 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] text-[14px]"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select
          value={stylistFilter}
          onChange={(e) => setStylistFilter(e.target.value)}
          aria-label="Filter by stylist"
          className="px-3 py-2 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] text-[14px]"
        >
          <option value="all">All stylists</option>
          {stylists.map((st) => (
            <option key={st.id} value={st.id}>
              {st.name}
            </option>
          ))}
        </select>

        {viewMode === 'list' && (
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              aria-label="From date"
              className="px-2.5 py-1.5 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] font-mono text-[12px]"
            />
            <span className="text-[#6B6560] text-xs">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              aria-label="To date"
              className="px-2.5 py-1.5 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] font-mono text-[12px]"
            />
          </div>
        )}
      </Toolbar>

      {loading ? (
        <AdminSkeleton rows={5} />
      ) : viewMode === 'day' ? (
        /* DAY VIEW BY STYLIST */
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-[12px] font-medium text-[#6B6560]">Schedule date:</label>
            <input
              type="date"
              value={dayViewDate}
              onChange={(e) => setDayViewDate(e.target.value)}
              className="px-3 py-1.5 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] font-mono text-[14px]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stylists
              .filter((s) => s.is_active)
              .map((st) => {
                const stAppts = appointments
                  .filter(
                    (a) =>
                      a.appointment_date === dayViewDate &&
                      a.stylist_id === st.id &&
                      a.status !== 'cancelled'
                  )
                  .sort((a, b) => a.start_time.localeCompare(b.start_time));

                return (
                  <div
                    key={st.id}
                    className="p-4 rounded-[12px] bg-[#FFFFFF] border border-[#E6E2DB] min-w-0"
                  >
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E6E2DB]">
                      <div>
                        <h3 className="text-[16px] font-semibold text-[#15110F]">{st.name}</h3>
                        <p className="text-[12px] text-[#6B6560]">{st.title}</p>
                      </div>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#F6F4F0]">
                        {stAppts.length} booked
                      </span>
                    </div>

                    {stAppts.length === 0 ? (
                      <p className="text-[12px] text-[#6B6560] py-4 text-center">
                        No bookings on {dayViewDate}
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        {stAppts.map((a) => (
                          <div
                            key={a.id}
                            className="p-3 rounded-[8px] bg-[#F6F4F0] border border-[#E6E2DB] space-y-1"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-[12px] font-semibold">
                                {formatTimeStringLabel(a.start_time)} –{' '}
                                {formatTimeStringLabel(a.end_time)}
                              </span>
                              <StatusBadge variant={a.status} />
                            </div>
                            <div className="text-[14px] font-medium">{a.full_name}</div>
                            <div className="text-[12px] text-[#6B6560]">
                              {serviceMap[a.service_id]?.name || 'Service'} · {a.phone}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <EmptyState
          description="Add your first phone or walk-in booking, or share your /book link with clients."
          actionLabel="New appointment"
          onAction={() => setDrawerOpen(true)}
        />
      ) : (
        /* RESPONSIVE TABLE (Desktop/Tablet) & STACKED CARDS (Mobile) */
        <>
          {/* Tablet & Desktop Table (scrolls horizontally only inside its own card) */}
          <div className="hidden md:block rounded-[12px] bg-[#FFFFFF] border border-[#E6E2DB] overflow-x-auto min-w-0">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E6E2DB] bg-[#F6F4F0]/60 text-[12px] leading-[16px] font-medium text-[#6B6560]">
                  <th className="py-3 px-4">Date &amp; Time</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Service &amp; Stylist</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E2DB] text-[14px] leading-[20px]">
                {filteredAppointments.map((a) => {
                  const srvName = serviceMap[a.service_id]?.name || 'Service';
                  const styName = a.stylist_id
                    ? stylistMap[a.stylist_id]?.name || 'Stylist'
                    : 'First available';
                  const waMessage = `Hi ${a.full_name}, this is Bbold Salon & Academy regarding your ${srvName} appointment on ${a.appointment_date} at ${formatTimeStringLabel(a.start_time)}.`;

                  return (
                    <tr key={a.id} className="h-[56px] hover:bg-[#F6F4F0]/40">
                      <td className="py-3 px-4 font-mono text-[13px] whitespace-nowrap">
                        <div className="font-medium text-[#15110F]">{a.appointment_date}</div>
                        <div className="text-[12px] text-[#6B6560]">
                          {formatTimeStringLabel(a.start_time)} –{' '}
                          {formatTimeStringLabel(a.end_time)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-[#15110F]">{a.full_name}</div>
                        <div className="flex items-center gap-2 text-[12px] text-[#6B6560]">
                          <a
                            href={`tel:${a.phone}`}
                            className="font-mono hover:underline inline-flex items-center gap-1"
                          >
                            <Phone size={12} />
                            <span>{a.phone}</span>
                          </a>
                          <span>·</span>
                          <span className="truncate max-w-[160px]">{a.email}</span>
                        </div>
                        {a.notes && (
                          <div className="text-[12px] text-[#6B6560] italic mt-0.5">
                            “{a.notes}”
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-[#15110F]">{srvName}</div>
                        <div className="text-[12px] text-[#6B6560]">{styName}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusBadge variant={a.status} />
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <a
                            href={buildWhatsAppUrl(waMessage, a.phone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] border border-[#E6E2DB] text-[12px] font-medium text-[#15110F] hover:bg-[#F6F4F0]"
                          >
                            <MessageCircle size={14} className="text-[#1E7B4F]" />
                            <span>WhatsApp</span>
                          </a>

                          <KebabMenu
                            actions={[
                              {
                                label: 'Mark as Confirmed',
                                onClick: () => void handleStatusChange(a.id, 'confirmed'),
                              },
                              {
                                label: 'Mark as Completed',
                                onClick: () => void handleStatusChange(a.id, 'completed'),
                              },
                              {
                                label: 'Mark as Pending',
                                onClick: () => void handleStatusChange(a.id, 'pending'),
                              },
                              {
                                label: 'Cancel appointment',
                                danger: true,
                                onClick: () => void handleStatusChange(a.id, 'cancelled'),
                              },
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Cards (<768px) */}
          <div className="md:hidden space-y-3">
            {filteredAppointments.map((a) => {
              const srvName = serviceMap[a.service_id]?.name || 'Service';
              const styName = a.stylist_id
                ? stylistMap[a.stylist_id]?.name || 'Stylist'
                : 'First available';
              const waMessage = `Hi ${a.full_name}, this is Bbold Salon & Academy regarding your ${srvName} appointment on ${a.appointment_date} at ${formatTimeStringLabel(a.start_time)}.`;

              return (
                <div
                  key={a.id}
                  className="p-4 rounded-[12px] bg-[#FFFFFF] border border-[#E6E2DB] space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-[15px]">{a.full_name}</div>
                      <a
                        href={`tel:${a.phone}`}
                        className="font-mono text-[12px] text-[#C4262E] underline"
                      >
                        {a.phone}
                      </a>
                    </div>
                    <StatusBadge variant={a.status} />
                  </div>

                  <div className="text-[13px] text-[#15110F]">
                    <div>
                      <strong>{srvName}</strong> with {styName}
                    </div>
                    <div className="font-mono text-[12px] text-[#6B6560] mt-0.5">
                      {a.appointment_date} · {formatTimeStringLabel(a.start_time)}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#E6E2DB] flex items-center justify-between gap-2">
                    <a
                      href={buildWhatsAppUrl(waMessage, a.phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[8px] border border-[#E6E2DB] text-[12px] font-medium"
                    >
                      <MessageCircle size={14} className="text-[#1E7B4F]" />
                      <span>Message on WhatsApp</span>
                    </a>

                    <KebabMenu
                      actions={[
                        {
                          label: 'Mark as Confirmed',
                          onClick: () => void handleStatusChange(a.id, 'confirmed'),
                        },
                        {
                          label: 'Mark as Completed',
                          onClick: () => void handleStatusChange(a.id, 'completed'),
                        },
                        {
                          label: 'Cancel appointment',
                          danger: true,
                          onClick: () => void handleStatusChange(a.id, 'cancelled'),
                        },
                      ]}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Manual Phone / Walk-In Appointment Drawer */}
      <Drawer
        open={drawerOpen}
        title="New appointment (Phone or Walk-in)"
        onClose={() => setDrawerOpen(false)}
        onSave={(e) => void handleSaveManual(e)}
        isDirty={Boolean(mFullName || mPhone)}
        isSaving={saving}
        saveLabel="Save appointment"
      >
        <FormField label="Client full name" required>
          <input
            type="text"
            required
            value={mFullName}
            onChange={(e) => setMFullName(e.target.value)}
            className="w-full px-3 py-2 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] text-[14px]"
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="10-digit mobile number" required>
            <input
              type="tel"
              required
              maxLength={10}
              value={mPhone}
              onChange={(e) => setMPhone(e.target.value.replace(/\D+/g, '').slice(0, 10))}
              className="w-full px-3 py-2 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] font-mono text-[14px]"
            />
          </FormField>

          <FormField label="Email (optional for walk-ins)">
            <input
              type="email"
              value={mEmail}
              onChange={(e) => setMEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] text-[14px]"
            />
          </FormField>
        </div>

        <FormField label="Service" required>
          <select
            value={mServiceId}
            onChange={(e) => setMServiceId(e.target.value)}
            className="w-full px-3 py-2 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] text-[14px]"
          >
            {services
              .filter((s) => s.is_active)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.duration_minutes}m · ₹{s.price})
                </option>
              ))}
          </select>
        </FormField>

        <FormField label="Stylist" required>
          <select
            value={mStylistId}
            onChange={(e) => setMStylistId(e.target.value)}
            className="w-full px-3 py-2 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] text-[14px]"
          >
            <option value="any">First available stylist</option>
            {stylists
              .filter((s) => s.is_active)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Date" required>
            <input
              type="date"
              required
              value={mDateStr}
              onChange={(e) => setMDateStr(e.target.value)}
              className="w-full px-3 py-2 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] font-mono text-[14px]"
            />
          </FormField>

          <FormField label="Initial status" required>
            <select
              value={mStatus}
              onChange={(e) => setMStatus(e.target.value as AppointmentStatus)}
              className="w-full px-3 py-2 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] text-[14px]"
            >
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </FormField>
        </div>

        {/* Clearly Labelled Schedule Override Toggle */}
        <div className="p-3 rounded-[8px] bg-[#F6F4F0] border border-[#E6E2DB] flex items-center justify-between gap-3">
          <div>
            <div className="text-[12px] font-medium text-[#15110F]">
              Override availability rules (walk-in / after-hours)
            </div>
            <div className="text-[12px] text-[#6B6560]">
              When off, only free slots from the availability module are selectable.
            </div>
          </div>
          <input
            type="checkbox"
            checked={mOverrideSchedule}
            onChange={(e) => setMOverrideSchedule(e.target.checked)}
            className="w-4 h-4 accent-[#C4262E] cursor-pointer"
          />
        </div>

        {mOverrideSchedule ? (
          <FormField label="Custom start time (HH:mm)" required>
            <input
              type="time"
              required
              value={mStartTime.slice(0, 5)}
              onChange={(e) => setMStartTime(`${e.target.value}:00`)}
              className="w-full px-3 py-2 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] font-mono text-[14px]"
            />
          </FormField>
        ) : (
          <FormField
            label="Available slot"
            hint={
              manualAvailableSlots.length === 0
                ? 'No standard slots open on this date. Enable Override above for walk-ins.'
                : undefined
            }
          >
            <select
              value={mStartTime}
              onChange={(e) => setMStartTime(e.target.value)}
              className="w-full px-3 py-2 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] font-mono text-[14px]"
            >
              {manualAvailableSlots.map((s) => (
                <option key={s.startTimeStr} value={s.startTimeStr}>
                  {s.label} ({s.period})
                </option>
              ))}
            </select>
          </FormField>
        )}

        <FormField label="Notes">
          <textarea
            rows={2}
            value={mNotes}
            onChange={(e) => setMNotes(e.target.value)}
            className="w-full px-3 py-2 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] text-[14px]"
          />
        </FormField>
      </Drawer>

      <ToastContainer toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
};
