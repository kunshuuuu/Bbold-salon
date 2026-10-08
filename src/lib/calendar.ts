import { format } from 'date-fns';
import { combineDateAndTime, parseDateYMD, parseTimeStr } from './availability';

export interface CalendarEventInput {
  id: string;
  serviceName: string;
  stylistName: string;
  dateStr: string;      // 'yyyy-MM-dd'
  startTimeStr: string; // 'HH:mm:ss'
  endTimeStr: string;   // 'HH:mm:ss'
  salonName: string;
  salonAddress: string;
  salonPhone: string;
}

/**
 * Generates and downloads a valid .ics calendar file for the appointment request.
 */
export function downloadAppointmentIcs(input: CalendarEventInput): void {
  const calendarDate = parseDateYMD(input.dateStr) || new Date();
  const startParts = parseTimeStr(input.startTimeStr) || { hours: 10, minutes: 0, seconds: 0 };
  const endParts = parseTimeStr(input.endTimeStr) || { hours: 11, minutes: 0, seconds: 0 };

  const startLocal = combineDateAndTime(calendarDate, startParts);
  const endLocal = combineDateAndTime(calendarDate, endParts);

  const dtStart = format(startLocal, "yyyyMMdd'T'HHmmss");
  const dtEnd = format(endLocal, "yyyyMMdd'T'HHmmss");
  const dtStamp = format(new Date(), "yyyyMMdd'T'HHmmss'Z'");

  const description = [
    `Service: ${input.serviceName}`,
    `Stylist: ${input.stylistName}`,
    `Status: Request received (the salon will confirm shortly)`,
    `Salon Phone: ${input.salonPhone}`,
  ].join('\\n');

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Bbold Salon & Academy//Mumbai//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:bbold-${input.id}@bboldmumbai.com`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART;TZID=Asia/Kolkata:${dtStart}`,
    `DTEND;TZID=Asia/Kolkata:${dtEnd}`,
    `SUMMARY:${input.serviceName} at ${input.salonName}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${(input.salonAddress || 'Mumbai').replace(/,/g, '\\,')}`,
    'STATUS:TENTATIVE',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  const blob = new Blob([icsLines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bbold-appointment-${input.dateStr}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
