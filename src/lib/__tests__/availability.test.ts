import { describe, it, expect } from 'vitest';
import { computeAvailableSlots } from '../availability';
import { DEFAULT_BUSINESS_HOURS, DEFAULT_SALON_SETTINGS } from '../../config/site';
import type { Service, Stylist, BlockedDate, BusySlot } from '../../types/database';

const MOCK_SERVICE_60: Service = {
  id: 'srv-haircut',
  name: "Women's Haircut",
  description: 'Cut and blow-dry.',
  duration_minutes: 60,
  price: 1200,
  category: 'Hair',
  audience: 'women',
  is_featured: true,
  sort_order: 1,
  is_active: true,
  is_sample: true,
  created_at: '2026-01-01T00:00:00Z',
};

const MOCK_STYLISTS: Stylist[] = [
  {
    id: 'st-1',
    name: 'Riya',
    title: 'Senior Stylist',
    bio: 'Bio',
    photo_url: null,
    specialties: ['Hair'],
    is_active: true,
    sort_order: 1,
    is_sample: true,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'st-2',
    name: 'Imran',
    title: 'Colour Specialist',
    bio: 'Bio',
    photo_url: null,
    specialties: ['Hair Colour'],
    is_active: true,
    sort_order: 2,
    is_sample: true,
    created_at: '2026-01-01T00:00:00Z',
  },
];

describe('computeAvailableSlots (availability engine)', () => {
  // Reference time: Tuesday 2026-10-13 08:00:00 IST
  const nowKolkata = new Date(2026, 9, 13, 8, 0, 0, 0);
  // Target open day: Wednesday 2026-10-14
  const openWednesday = new Date(2026, 9, 14, 0, 0, 0, 0);
  // Target closed Monday: Monday 2026-10-19
  const closedMonday = new Date(2026, 9, 19, 0, 0, 0, 0);

  it('returns no slots on a closed weekday (Monday)', () => {
    const res = computeAvailableSlots({
      date: closedMonday,
      service: MOCK_SERVICE_60,
      stylistChoice: 'any',
      businessHours: DEFAULT_BUSINESS_HOURS,
      blockedDates: [],
      salonSettings: DEFAULT_SALON_SETTINGS,
      busySlots: [],
      activeStylists: MOCK_STYLISTS,
      nowKolkata,
    });

    expect(res.isClosed).toBe(true);
    expect(res.slots).toHaveLength(0);
    expect(res.reason).toContain('Closed on Mondays');
  });

  it('returns no slots and shows reason on a blocked date', () => {
    const blocked: BlockedDate[] = [
      {
        id: 'blk-1',
        blocked_date: '2026-10-14',
        reason: 'Diwali Studio Holiday',
        created_at: '2026-01-01T00:00:00Z',
      },
    ];

    const res = computeAvailableSlots({
      date: openWednesday,
      service: MOCK_SERVICE_60,
      stylistChoice: 'any',
      businessHours: DEFAULT_BUSINESS_HOURS,
      blockedDates: blocked,
      salonSettings: DEFAULT_SALON_SETTINGS,
      busySlots: [],
      activeStylists: MOCK_STYLISTS,
      nowKolkata,
    });

    expect(res.isBlocked).toBe(true);
    expect(res.slots).toHaveLength(0);
    expect(res.reason).toBe('Diwali Studio Holiday');
  });

  it('enforces the booking_notice_hours window in Asia/Kolkata', () => {
    // Same day (Tuesday 2026-10-13) at 11:10 AM with 2h notice -> earliest slot >= 1:15 PM (13:15:00)
    const sameDayNow = new Date(2026, 9, 13, 11, 10, 0, 0);
    const sameDayDate = new Date(2026, 9, 13, 0, 0, 0, 0);

    const res = computeAvailableSlots({
      date: sameDayDate,
      service: MOCK_SERVICE_60,
      stylistChoice: 'any',
      businessHours: DEFAULT_BUSINESS_HOURS,
      blockedDates: [],
      salonSettings: DEFAULT_SALON_SETTINGS, // 15m interval, 2h notice
      busySlots: [],
      activeStylists: MOCK_STYLISTS,
      nowKolkata: sameDayNow,
    });

    expect(res.slots.length).toBeGreaterThan(0);
    expect(res.slots[0].startTimeStr).toBe('13:15:00');
  });

  it('enforces overlap rule for a specific stylist and keeps other stylists free', () => {
    // Stylist 1 is busy 10:30 to 11:30
    const busySlots: BusySlot[] = [
      {
        stylist_id: 'st-1',
        start_time: '10:30:00',
        end_time: '11:30:00',
      },
    ];

    // For st-1, a 60m service cannot start at 10:00 (ends 11:00 -> overlaps), 10:30, or 11:00,
    // but CAN start at 11:30
    const st1Res = computeAvailableSlots({
      date: openWednesday,
      service: MOCK_SERVICE_60,
      stylistChoice: 'st-1',
      businessHours: DEFAULT_BUSINESS_HOURS,
      blockedDates: [],
      salonSettings: DEFAULT_SALON_SETTINGS,
      busySlots,
      activeStylists: MOCK_STYLISTS,
      nowKolkata,
    });

    const st1Starts = st1Res.slots.map((s) => s.startTimeStr);
    expect(st1Starts).not.toContain('10:00:00');
    expect(st1Starts).not.toContain('10:30:00');
    expect(st1Starts).not.toContain('11:00:00');
    expect(st1Starts).toContain('11:30:00');

    // For "any", 10:30 is still available via st-2
    const anyRes = computeAvailableSlots({
      date: openWednesday,
      service: MOCK_SERVICE_60,
      stylistChoice: 'any',
      businessHours: DEFAULT_BUSINESS_HOURS,
      blockedDates: [],
      salonSettings: DEFAULT_SALON_SETTINGS,
      busySlots,
      activeStylists: MOCK_STYLISTS,
      nowKolkata,
    });

    const slot1030 = anyRes.slots.find((s) => s.startTimeStr === '10:30:00');
    expect(slot1030).toBeDefined();
    expect(slot1030?.stylistIds).toEqual(['st-2']);
  });

  it('blocks "any" stylist when all active stylists or null-stylist rows exhaust capacity', () => {
    const busySlots: BusySlot[] = [
      { stylist_id: 'st-1', start_time: '14:00:00', end_time: '15:00:00' },
      { stylist_id: null, start_time: '14:00:00', end_time: '15:00:00' }, // takes remaining 1 capacity
    ];

    const anyRes = computeAvailableSlots({
      date: openWednesday,
      service: MOCK_SERVICE_60,
      stylistChoice: 'any',
      businessHours: DEFAULT_BUSINESS_HOURS,
      blockedDates: [],
      salonSettings: DEFAULT_SALON_SETTINGS,
      busySlots,
      activeStylists: MOCK_STYLISTS,
      nowKolkata,
    });

    const starts = anyRes.slots.map((s) => s.startTimeStr);
    expect(starts).not.toContain('14:00:00');
    expect(starts).toContain('15:00:00');
  });

  it('rejects inactive services and ensures last slot + duration does not exceed closing time', () => {
    const inactiveService: Service = { ...MOCK_SERVICE_60, is_active: false };
    const inactiveRes = computeAvailableSlots({
      date: openWednesday,
      service: inactiveService,
      stylistChoice: 'any',
      businessHours: DEFAULT_BUSINESS_HOURS,
      blockedDates: [],
      salonSettings: DEFAULT_SALON_SETTINGS,
      busySlots: [],
      activeStylists: MOCK_STYLISTS,
      nowKolkata,
    });
    expect(inactiveRes.slots).toHaveLength(0);

    // For a 60m service with 20:00 closing time, last valid start is 19:00:00
    const activeRes = computeAvailableSlots({
      date: openWednesday,
      service: MOCK_SERVICE_60,
      stylistChoice: 'any',
      businessHours: DEFAULT_BUSINESS_HOURS,
      blockedDates: [],
      salonSettings: DEFAULT_SALON_SETTINGS,
      busySlots: [],
      activeStylists: MOCK_STYLISTS,
      nowKolkata,
    });
    const lastSlot = activeRes.slots[activeRes.slots.length - 1];
    expect(lastSlot.startTimeStr).toBe('19:00:00');
    expect(lastSlot.endTimeStr).toBe('20:00:00');
  });
});
