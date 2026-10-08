import React, { useCallback, useEffect, useState } from 'react';
import { Copy, Trash2 } from 'lucide-react';
import {
  adminAddBlockedDate,
  adminRemoveBlockedDate,
  adminSaveBusinessHours,
  adminSaveSalonSettings,
} from '../../lib/adminApi';
import {
  getPublicBlockedDates,
  getPublicBusinessHours,
  getPublicSalonSettings,
} from '../../lib/content';
import { WEEKDAY_NAMES } from '../../config/site';
import { useSiteData } from '../../context/SiteDataContext';
import {
  PageHeader,
  FormField,
  EmptyState,
  AdminSkeleton,
  ToastContainer,
  type ToastMessage,
} from '../../components/admin/AdminUI';
import type { BlockedDate, BusinessHour, SalonSettings } from '../../types/database';

// =============================================================================
// 1. BUSINESS HOURS PAGE (/admin/hours)
// =============================================================================

export const AdminBusinessHoursPage: React.FC = () => {
  const { refreshSiteData } = useSiteData();
  const [hours, setHours] = useState<BusinessHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    let mounted = true;
    getPublicBusinessHours().then((rows) => {
      if (mounted) {
        setHours(rows.slice().sort((a, b) => a.weekday - b.weekday));
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const updateRow = (weekday: number, patch: Partial<BusinessHour>) => {
    setHours((prev) =>
      prev.map((row) => (row.weekday === weekday ? { ...row, ...patch } : row))
    );
  };

  const handleCopyToAllDays = (sourceRow: BusinessHour) => {
    setHours((prev) =>
      prev.map((row) => ({
        ...row,
        is_open: sourceRow.is_open,
        start_time: sourceRow.start_time,
        end_time: sourceRow.end_time,
      }))
    );
    setToast({
      id: String(Date.now()),
      text: `Copied ${WEEKDAY_NAMES[sourceRow.weekday]} hours to all days. Click Save changes to publish.`,
    });
  };

  const handleSave = async () => {
    setError(null);
    for (const row of hours) {
      if (row.is_open && row.end_time <= row.start_time) {
        setError(
          `Closing time on ${WEEKDAY_NAMES[row.weekday]} must be later than opening time.`
        );
        return;
      }
    }
    setSaving(true);
    try {
      await adminSaveBusinessHours(hours);
      await refreshSiteData();
      setToast({
        id: String(Date.now()),
        text: 'Saved. This is now live on your website.',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save hours');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 min-w-0">
      <PageHeader
        title="Business hours"
        description="Set the salon's opening and closing times for each day of the week."
        helpText="Changes here immediately update available time slots on /book and the live open/closed status in the website footer."
        primaryActionLabel={saving ? 'Saving...' : 'Save changes'}
        onPrimaryAction={() => void handleSave()}
      />

      {error && (
        <div className="p-3.5 rounded-[8px] bg-[#B3261E]/10 border border-[#B3261E]/30 text-[#B3261E] text-[14px]">
          {error}
        </div>
      )}

      {loading ? (
        <AdminSkeleton rows={7} />
      ) : (
        <div className="rounded-[12px] bg-[#FFFFFF] border border-[#E6E2DB] divide-y divide-[#E6E2DB]">
          {hours.map((row) => (
            <div
              key={row.weekday}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 min-w-[160px]">
                <input
                  type="checkbox"
                  id={`open-${row.weekday}`}
                  checked={row.is_open}
                  onChange={(e) => updateRow(row.weekday, { is_open: e.target.checked })}
                  className="w-4 h-4 accent-[#C4262E] cursor-pointer"
                />
                <label
                  htmlFor={`open-${row.weekday}`}
                  className="text-[14px] font-semibold text-[#15110F] cursor-pointer"
                >
                  {WEEKDAY_NAMES[row.weekday]}
                </label>
                {!row.is_open && (
                  <span className="text-[12px] text-[#6B6560] font-mono uppercase">Closed</span>
                )}
              </div>

              {row.is_open ? (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] text-[#6B6560]">Opens</span>
                    <input
                      type="time"
                      value={row.start_time.slice(0, 5)}
                      onChange={(e) =>
                        updateRow(row.weekday, { start_time: `${e.target.value}:00` })
                      }
                      className="px-3 py-1.5 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] font-mono text-[14px]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] text-[#6B6560]">Closes</span>
                    <input
                      type="time"
                      value={row.end_time.slice(0, 5)}
                      onChange={(e) =>
                        updateRow(row.weekday, { end_time: `${e.target.value}:00` })
                      }
                      className="px-3 py-1.5 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] font-mono text-[14px]"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopyToAllDays(row)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] border border-[#E6E2DB] text-[12px] font-medium text-[#6B6560] hover:text-[#15110F] hover:bg-[#F6F4F0] cursor-pointer"
                  >
                    <Copy size={14} />
                    <span>Copy to all days</span>
                  </button>
                </div>
              ) : (
                <div className="text-[13px] text-[#6B6560]">
                  No online bookings accepted on {WEEKDAY_NAMES[row.weekday]}s
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ToastContainer toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
};

// =============================================================================
// 2. BLOCKED DATES PAGE (/admin/blocked-dates)
// =============================================================================

export const AdminBlockedDatesPage: React.FC = () => {
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDate, setNewDate] = useState('');
  const [newReason, setNewReason] = useState('');
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const loadDates = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getPublicBlockedDates();
      setBlockedDates(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDates();
  }, [loadDates]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate) return;
    setAdding(true);
    try {
      await adminAddBlockedDate(newDate, newReason);
      setNewDate('');
      setNewReason('');
      await loadDates();
      setToast({
        id: String(Date.now()),
        text: 'Saved. This is now live on your website.',
      });
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (row: BlockedDate) => {
    await adminRemoveBlockedDate(row.id);
    await loadDates();
    setToast({
      id: String(Date.now()),
      text: `Unblocked ${row.blocked_date}.`,
      onUndo: () => {
        void adminAddBlockedDate(row.blocked_date, row.reason || '').then(() => loadDates());
      },
    });
  };

  return (
    <div className="space-y-6 min-w-0">
      <PageHeader
        title="Blocked dates"
        description="Close the salon for festivals, public holidays, or team training days."
        helpText="Blocked dates are disabled on the booking calendar and show your custom reason as a tooltip."
      />

      {/* Add Blocked Date Card */}
      <form
        onSubmit={handleAdd}
        className="p-6 rounded-[12px] bg-[#FFFFFF] border border-[#E6E2DB] grid grid-cols-1 sm:grid-cols-12 gap-4 items-end"
      >
        <div className="sm:col-span-4">
          <FormField label="Date to close" required>
            <input
              type="date"
              required
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full px-3 py-2 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] font-mono text-[14px]"
            />
          </FormField>
        </div>
        <div className="sm:col-span-5">
          <FormField label="Reason shown to clients (e.g. Diwali Holiday)">
            <input
              type="text"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              placeholder="Closed for festival / staff training"
              className="w-full px-3 py-2 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] text-[14px]"
            />
          </FormField>
        </div>
        <div className="sm:col-span-3">
          <button
            type="submit"
            disabled={adding}
            className="w-full px-4 py-2 rounded-[8px] bg-[#C4262E] text-white text-[14px] font-medium hover:opacity-95 cursor-pointer"
          >
            {adding ? 'Adding...' : 'Block date'}
          </button>
        </div>
      </form>

      {loading ? (
        <AdminSkeleton rows={3} />
      ) : blockedDates.length === 0 ? (
        <EmptyState description="No upcoming dates are blocked. Use the form above to close specific dates." />
      ) : (
        <div className="rounded-[12px] bg-[#FFFFFF] border border-[#E6E2DB] divide-y divide-[#E6E2DB]">
          {blockedDates.map((b) => (
            <div
              key={b.id}
              className="p-4 flex items-center justify-between gap-4 text-[14px]"
            >
              <div>
                <span className="font-mono font-semibold text-[#15110F]">{b.blocked_date}</span>
                <span className="mx-2 text-[#6B6560]">·</span>
                <span className="text-[#6B6560]">{b.reason || 'Closed'}</span>
              </div>
              <button
                type="button"
                onClick={() => void handleRemove(b)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[8px] border border-[#E6E2DB] text-[12px] font-medium text-[#B3261E] hover:bg-[#B3261E]/10 cursor-pointer"
              >
                <Trash2 size={14} />
                <span>Remove</span>
              </button>
            </div>
          ))}
        </div>
      )}

      <ToastContainer toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
};

// =============================================================================
// 3. SALON SETTINGS PAGE (/admin/settings)
// =============================================================================

export const AdminSalonSettingsPage: React.FC = () => {
  const { refreshSiteData } = useSiteData();
  const [settings, setSettings] = useState<SalonSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    let mounted = true;
    getPublicSalonSettings().then((s) => {
      if (mounted) {
        setSettings(s);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setError(null);

    const cleanPhone = (settings.salon_phone || '').replace(/\D+/g, '');
    if (cleanPhone && !/^[6-9][0-9]{9}$/.test(cleanPhone)) {
      setError('Salon phone must be a 10-digit Indian mobile number.');
      return;
    }

    setSaving(true);
    try {
      await adminSaveSalonSettings({
        ...settings,
        salon_phone: cleanPhone || settings.salon_phone,
      });
      await refreshSiteData();
      setToast({
        id: String(Date.now()),
        text: 'Saved. This is now live on your website.',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 min-w-0">
      <PageHeader
        title="Salon settings"
        description="Update your studio contact details, address, and online booking slot rules."
        helpText="These details appear in the website footer, Contact page, Google Maps embed, and schema.org structured data."
        primaryActionLabel={saving ? 'Saving...' : 'Save changes'}
        onPrimaryAction={() => {
          const form = document.getElementById('salon-settings-form') as HTMLFormElement | null;
          form?.requestSubmit();
        }}
      />

      {error && (
        <div className="p-3.5 rounded-[8px] bg-[#B3261E]/10 border border-[#B3261E]/30 text-[#B3261E] text-[14px]">
          {error}
        </div>
      )}

      {loading || !settings ? (
        <AdminSkeleton rows={4} />
      ) : (
        <form
          id="salon-settings-form"
          onSubmit={handleSave}
          className="p-6 rounded-[12px] bg-[#FFFFFF] border border-[#E6E2DB] space-y-5 max-w-2xl"
        >
          <FormField label="Salon name" required>
            <input
              type="text"
              required
              value={settings.salon_name}
              onChange={(e) => setSettings({ ...settings, salon_name: e.target.value })}
              className="w-full px-3 py-2 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] text-[14px]"
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="10-digit salon phone (WhatsApp & calls)" required>
              <input
                type="tel"
                maxLength={10}
                required
                value={settings.salon_phone || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    salon_phone: e.target.value.replace(/\D+/g, '').slice(0, 10),
                  })
                }
                className="w-full px-3 py-2 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] font-mono text-[14px]"
              />
            </FormField>

            <FormField label="Salon email address">
              <input
                type="text"
                value={settings.salon_email || ''}
                onChange={(e) => setSettings({ ...settings, salon_email: e.target.value })}
                className="w-full px-3 py-2 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] text-[14px]"
              />
            </FormField>
          </div>

          <FormField
            label="Full studio address in Mumbai"
            hint="Used on the Contact page, footer ticket, and Google Maps embed."
          >
            <textarea
              rows={2}
              value={settings.salon_address || ''}
              onChange={(e) => setSettings({ ...settings, salon_address: e.target.value })}
              className="w-full px-3 py-2 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] text-[14px]"
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#E6E2DB]">
            <FormField
              label="Slot interval (minutes)"
              hint="How frequently appointment start times are spaced"
            >
              <select
                value={settings.slot_interval_minutes}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    slot_interval_minutes: Number(e.target.value) as 15 | 30 | 45 | 60,
                  })
                }
                className="w-full px-3 py-2 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] font-mono text-[14px]"
              >
                <option value={15}>Every 15 minutes</option>
                <option value={30}>Every 30 minutes</option>
                <option value={45}>Every 45 minutes</option>
                <option value={60}>Every 60 minutes</option>
              </select>
            </FormField>

            <FormField
              label="Minimum booking notice (hours)"
              hint="Clients cannot book slots closer than this many hours from now (IST)"
            >
              <input
                type="number"
                min={0}
                max={72}
                value={settings.booking_notice_hours}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    booking_notice_hours: Math.max(0, Number(e.target.value) || 0),
                  })
                }
                className="w-full px-3 py-2 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] font-mono text-[14px]"
              />
            </FormField>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-[8px] bg-[#C4262E] text-white text-[14px] font-medium hover:opacity-95 cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      )}

      <ToastContainer toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
};
