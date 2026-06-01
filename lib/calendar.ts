// Calendar helpers for the booking confirmation page.
// We generate (a) an "Add to Google Calendar" link and (b) a downloadable
// .ics file (Apple Calendar / Outlook). No external API or credentials needed.
//
// All booking times are India Standard Time (IST, UTC+05:30) wall-clock values.
// - Google's template URL takes floating local times + ctz=Asia/Kolkata.
// - .ics uses absolute UTC timestamps (……Z) so it needs no VTIMEZONE block.

export type CalendarEvent = {
  title: string;
  description: string;
  location: string;
  date: string; // 'YYYY-MM-DD' (IST)
  time: string; // 'HH:MM' or 'HH:MM:SS' (IST)
  durationHours: number;
};

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

function parts(date: string, time: string) {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return { y, m, d, hh, mm: mm || 0 };
}

const pad = (n: number) => String(n).padStart(2, '0');

// Floating wall-clock stamp 'YYYYMMDDTHHMMSS' (used with ctz=Asia/Kolkata).
// Built via Date.UTC so adding hours rolls dates over correctly.
function floatingStamp(date: string, time: string, addHours: number): string {
  const { y, m, d, hh, mm } = parts(date, time);
  const dt = new Date(Date.UTC(y, m - 1, d, hh + addHours, mm));
  return (
    `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}` +
    `T${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}00`
  );
}

// Absolute UTC stamp 'YYYYMMDDTHHMMSSZ' for the given IST wall time.
function utcStamp(date: string, time: string, addHours: number): string {
  const { y, m, d, hh, mm } = parts(date, time);
  const dt = new Date(Date.UTC(y, m - 1, d, hh + addHours, mm) - IST_OFFSET_MS);
  return (
    `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}` +
    `T${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}00Z`
  );
}

function nowUtcStamp(): string {
  const dt = new Date();
  return (
    `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}` +
    `T${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}${pad(dt.getUTCSeconds())}Z`
  );
}

export function googleCalendarUrl(e: CalendarEvent): string {
  const start = floatingStamp(e.date, e.time, 0);
  const end = floatingStamp(e.date, e.time, e.durationHours);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates: `${start}/${end}`,
    details: e.description,
    location: e.location,
    ctz: 'Asia/Kolkata',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Escape per RFC 5545 text rules.
function esc(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

export function buildIcs(e: CalendarEvent): string {
  const uid = `${utcStamp(e.date, e.time, 0)}-${Math.random().toString(36).slice(2)}@easyshiftx`;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EasyShiftX//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${nowUtcStamp()}`,
    `DTSTART:${utcStamp(e.date, e.time, 0)}`,
    `DTEND:${utcStamp(e.date, e.time, e.durationHours)}`,
    `SUMMARY:${esc(e.title)}`,
    `DESCRIPTION:${esc(e.description)}`,
    `LOCATION:${esc(e.location)}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
