import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  endOfMonth,
  getDay,
  isBefore,
  startOfDay,
  setDate,
  getDaysInMonth,
  setMonth,
} from 'date-fns';
import { Priority } from '../types';

// ─── Public Types ────────────────────────────────────────────────────────────

export interface RecurrenceRule {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  /** every N units — e.g. interval 2 + weekly = "every 2 weeks" */
  interval: number;
  /** which weekdays (0=Sun … 6=Sat) — only for weekly recurrence */
  daysOfWeek?: number[];
}

export interface ParsedIntent {
  raw: string;
  text: string;
  date: Date;
  time: string | null;
  priority: Priority;
  tags: string[];
  isAdvanced: boolean;
  /** Structured recurrence rule, if detected */
  recurrence: RecurrenceRule | null;
  /** Estimated duration in minutes, if mentioned */
  duration: number | null;
  /** True for vague tasks like "someday" / "whenever" */
  isFloating: boolean;
}

// ─── Lookup Tables ────────────────────────────────────────────────────────────

const MONTHS: Record<string, number> = {
  january: 0, jan: 0,
  february: 1, feb: 1,
  march: 2, mar: 2,
  april: 3, apr: 3,
  may: 4,
  june: 5, jun: 5,
  july: 6, jul: 6,
  august: 7, aug: 7,
  september: 8, sept: 8, sep: 8,
  october: 9, oct: 9,
  november: 10, nov: 10,
  december: 11, dec: 11,
};

const WEEKDAYS: Record<string, number> = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4, thur: 4, thurs: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
};

const PART_OF_DAY_TIME: Record<string, string> = {
  morning: '09:00',
  afternoon: '14:00',
  evening: '18:00',
  night: '21:00',
  tonight: '21:00',
  midnight: '00:00',
  noon: '12:00',
  lunchtime: '12:30',
  lunch: '12:30',
};

// Quarter → [startMonth, endMonth] (0-indexed)
const QUARTERS: Record<number, [number, number]> = {
  1: [0, 2],
  2: [3, 5],
  3: [6, 8],
  4: [9, 11],
};

// ─── Priority Patterns ───────────────────────────────────────────────────────

const HIGH_PRIORITY_PATTERNS = [
  /\b(high[\s-]?priority|top[\s-]?priority|critical|urgent|asap|immediately|right away|very important|must do|can't wait|cannot wait)\b/i,
  /\b(p1|prio\s*1)\b/i,
  /!!+/,
  /🚨|🔴|‼/,
];

const LOW_PRIORITY_PATTERNS = [
  /\b(low[\s-]?priority|eventually|whenever|later on|not urgent|no rush|someday|if time|if i have time|nice to have|backlog)\b/i,
  /\b(p3|prio\s*3)\b/i,
  /🟢/,
];

// ─── Floating Task Patterns ───────────────────────────────────────────────────

const FLOATING_PATTERNS = [
  /\b(someday|sometime|some time|whenever|one day|at some point|eventually|when i have time|when possible|when i get a chance|no specific date)\b/i,
];

// ─── Recurring Patterns ───────────────────────────────────────────────────────

const ADVANCED_PATTERNS = [
  /\b(every|each|daily|weekly|monthly|yearly|annually|biweekly|bi-weekly|fortnightly|recurring|repeat(?:ing)?|weekdays|weekends)\b/i,
  /\b(someday|sometime|whenever)\b/i,
];

// ─── Tag Inference ────────────────────────────────────────────────────────────

const TAG_INFERENCE_RULES: Array<{ tag: string; pattern: RegExp }> = [
  { tag: 'work',     pattern: /\b(meeting|client|report|project|team|office|proposal|deck|email|presentation|deadline|sprint|standup|1on1|review|feedback|kpi|okr|stakeholder)\b/i },
  { tag: 'code',     pattern: /\b(code|debug|deploy|repo|commit|pull request|pr|bug|build|refactor|ship|merge|ci|cd|test|unit test|hotfix|release|api|backend|frontend|database|db|schema)\b/i },
  { tag: 'study',    pattern: /\b(study|revise|exam|assignment|course|lecture|practice|read chapter|homework|quiz|revision|flashcard|tutorial)\b/i },
  { tag: 'health',   pattern: /\b(workout|gym|run|jog|walk|doctor|therapy|meditat|stretch|sleep|water|yoga|exercise|steps|calories|nutrition|diet|physio|dentist|prescription|supplement)\b/i },
  { tag: 'finance',  pattern: /\b(rent|bill|budget|invoice|tax|bank|salary|payment|expense|insurance|subscription|refund|transfer|invest|stocks|crypto|receipt)\b/i },
  { tag: 'errands',  pattern: /\b(buy|pickup|pick up|grocery|groceries|store|pharmacy|cleaners|drop off|return|post office|mail|package|delivery|order|shop)\b/i },
  { tag: 'personal', pattern: /\b(call mom|call dad|family|birthday|anniversary|friend|home|personal|clean|laundry|dishes|cook|dinner|lunch|breakfast|meal prep)\b/i },
  { tag: 'travel',   pattern: /\b(flight|hotel|trip|travel|pack|luggage|passport|visa|book|reservation|airbnb|check.in|check.out|airport|train|bus)\b/i },
  { tag: 'reading',  pattern: /\b(read|book|article|blog|paper|newsletter|kindle|ebook|chapter)\b/i },
  { tag: 'creative', pattern: /\b(write|design|draw|sketch|paint|create|compose|record|edit|video|photo|illustrate|craft|music)\b/i },
];

// ─── Filler Removal ───────────────────────────────────────────────────────────

const LEADING_FILLERS = [
  /^(?:please\s+)?(?:remind me to|remember to|don't forget to|dont forget to|make sure to|be sure to|need to|i need to|i have to|i must|i should|i want to|want to|gotta|got to|have to|must|should|could you|can you|please|todo|to do|task|add|schedule|set|create|put|note)\s+/i,
];

// Words that commonly get left over as dangling prepositions at start/end
const TRAILING_GLUE = /\b(?:on|at|by|for|in|around|this|next|the)\s*$/i;
const LEADING_GLUE  = /^(?:on|at|by|for|in|around)\b\s*/i;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stripRange(source: string, start: number, end: number): string {
  return `${source.slice(0, start)} ${source.slice(end)}`;
}

function cleanupText(source: string): string {
  let value = source.trim();

  for (const pattern of LEADING_FILLERS) {
    value = value.replace(pattern, '');
  }

  // Remove priority markers that are purely symbols
  value = value.replace(/!!+/g, '').replace(/[🚨🔴🟢‼]/gu, '');

  value = value
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;!?])/g, '$1')
    .replace(/^[,.;:!?/\-–—]+\s*/, '')
    .replace(/\s*[,.;:!?/\-–—]+$/, '')
    .trim();

  let prev = '';
  while (prev !== value) {
    prev = value;
    if (TRAILING_GLUE.test(value)) value = value.replace(TRAILING_GLUE, '').trim();
    if (LEADING_GLUE.test(value)) value = value.replace(LEADING_GLUE, '').trim();
  }

  // Capitalise first letter
  if (value.length > 0) {
    value = value[0].toUpperCase() + value.slice(1);
  }

  return value;
}

function normalizeTime(hours: number, minutes = 0): string | null {
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function buildDate(baseDate: Date, month: number, day: number, year?: number): Date | null {
  const resolvedYear = year ?? baseDate.getFullYear();
  const candidate = new Date(resolvedYear, month, day);

  // Overflow guard (e.g. Feb 30)
  if (candidate.getMonth() !== month || candidate.getDate() !== day) return null;

  if (year === undefined && isBefore(startOfDay(candidate), startOfDay(baseDate))) {
    candidate.setFullYear(candidate.getFullYear() + 1);
  }

  return candidate;
}

function resolveWeekday(baseDate: Date, targetDay: number, modifier: 'this' | 'next' | null): Date {
  const currentDay = getDay(baseDate);
  let delta = (targetDay - currentDay + 7) % 7;

  if (modifier === 'next') {
    delta = (delta || 7) + 7;
  } else if (delta === 0 && modifier === null) {
    // "friday" with no modifier and today is friday → this friday (today)
    delta = 0;
  }

  return addDays(baseDate, delta);
}

/** Last occurrence of a weekday in a given month/year */
function lastWeekdayOfMonth(year: number, month: number, weekday: number): Date {
  const last = endOfMonth(new Date(year, month, 1));
  const diff = (getDay(last) - weekday + 7) % 7;
  return addDays(last, -diff);
}

/** Nth occurrence of a weekday in a given month/year */
function nthWeekdayOfMonth(year: number, month: number, weekday: number, nth: number): Date | null {
  const first = new Date(year, month, 1);
  const firstWd = getDay(first);
  let day = 1 + ((weekday - firstWd + 7) % 7) + (nth - 1) * 7;
  if (day > getDaysInMonth(first)) return null;
  return new Date(year, month, day);
}

// ─── Duration Extraction ──────────────────────────────────────────────────────

function takeDuration(source: string): { nextSource: string; duration: number | null } {
  // "for N hours/hour/hr/hrs"
  let m = /\bfor\s+(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/i.exec(source);
  if (m) {
    return {
      nextSource: stripRange(source, m.index, m.index + m[0].length),
      duration: Math.round(parseFloat(m[1]) * 60),
    };
  }

  // "for N minutes/minute/min/mins"
  m = /\bfor\s+(\d+)\s*(?:minutes?|mins?|m)\b/i.exec(source);
  if (m) {
    return {
      nextSource: stripRange(source, m.index, m.index + m[0].length),
      duration: parseInt(m[1]),
    };
  }

  // "for half an hour"
  m = /\bfor\s+(?:half\s+an?\s+hour|30\s*min(?:utes?)?)\b/i.exec(source);
  if (m) return { nextSource: stripRange(source, m.index, m.index + m[0].length), duration: 30 };

  // "for an hour"
  m = /\bfor\s+an?\s+hour\b/i.exec(source);
  if (m) return { nextSource: stripRange(source, m.index, m.index + m[0].length), duration: 60 };

  // "takes N hours/minutes"
  m = /\btakes?\s+(\d+(?:\.\d+)?)\s*(hours?|hrs?|minutes?|mins?)\b/i.exec(source);
  if (m) {
    const unit = m[2].toLowerCase();
    const val = parseFloat(m[1]);
    const mins = unit.startsWith('h') ? Math.round(val * 60) : Math.round(val);
    return { nextSource: stripRange(source, m.index, m.index + m[0].length), duration: mins };
  }

  // Qualitative hints — attach duration but keep word in text
  if (/\bquick(?:ly)?\b/i.test(source)) return { nextSource: source, duration: 15 };
  if (/\bbrief(?:ly)?\b/i.test(source)) return { nextSource: source, duration: 20 };

  return { nextSource: source, duration: null };
}

// ─── Recurrence Extraction ────────────────────────────────────────────────────

function takeRecurrence(source: string): { nextSource: string; recurrence: RecurrenceRule | null } {
  // "every N days/weeks/months/years"
  let m = /\bevery\s+(\d+)\s+(days?|weeks?|months?|years?)\b/i.exec(source);
  if (m) {
    const n = parseInt(m[1]);
    const unit = m[2].toLowerCase();
    const type = unit.startsWith('d') ? 'daily' : unit.startsWith('w') ? 'weekly' : unit.startsWith('m') ? 'monthly' : 'yearly';
    return {
      nextSource: stripRange(source, m.index, m.index + m[0].length),
      recurrence: { type, interval: n },
    };
  }

  // "every other day/week/month"
  m = /\bevery\s+other\s+(day|week|month|year)\b/i.exec(source);
  if (m) {
    const unit = m[1].toLowerCase();
    const type = unit === 'day' ? 'daily' : unit === 'week' ? 'weekly' : unit === 'month' ? 'monthly' : 'yearly';
    return {
      nextSource: stripRange(source, m.index, m.index + m[0].length),
      recurrence: { type, interval: 2 },
    };
  }

  // "every [weekday(s)]" — e.g. "every monday", "every tuesday and thursday"
  const weekdayList = Object.keys(WEEKDAYS).join('|');
  const everyWdPattern = new RegExp(
    `\\bevery\\s+((?:${weekdayList})(?:\\s+(?:and|&)\\s+(?:${weekdayList}))*)\\b`,
    'i'
  );
  m = everyWdPattern.exec(source);
  if (m) {
    const days = m[1].toLowerCase().split(/\s+(?:and|&)\s+/).map(d => WEEKDAYS[d]).filter(d => d !== undefined);
    if (days.length > 0) {
      return {
        nextSource: stripRange(source, m.index, m.index + m[0].length),
        recurrence: { type: 'weekly', interval: 1, daysOfWeek: days },
      };
    }
  }

  // Shorthand keywords
  const shorthands: Array<[RegExp, RecurrenceRule]> = [
    [/\bdaily\b/i,                              { type: 'daily',   interval: 1 }],
    [/\bevery\s+day\b/i,                        { type: 'daily',   interval: 1 }],
    [/\bweekly\b/i,                             { type: 'weekly',  interval: 1 }],
    [/\bevery\s+week\b/i,                       { type: 'weekly',  interval: 1 }],
    [/\bbiweekly\b|bi-weekly\b|fortnightly\b/i, { type: 'weekly',  interval: 2 }],
    [/\bmonthly\b/i,                            { type: 'monthly', interval: 1 }],
    [/\bevery\s+month\b/i,                      { type: 'monthly', interval: 1 }],
    [/\bbimonthly\b|bi-monthly\b/i,             { type: 'monthly', interval: 2 }],
    [/\byearly\b|annually\b|every\s+year\b/i,   { type: 'yearly',  interval: 1 }],
    [/\bweekdays\b/i,                           { type: 'weekly',  interval: 1, daysOfWeek: [1, 2, 3, 4, 5] }],
    [/\bweekends?\b/i,                          { type: 'weekly',  interval: 1, daysOfWeek: [0, 6] }],
  ];

  for (const [pattern, rule] of shorthands) {
    m = pattern.exec(source);
    if (m) {
      return {
        nextSource: stripRange(source, m.index, m.index + m[0].length),
        recurrence: rule,
      };
    }
  }

  return { nextSource: source, recurrence: null };
}

// ─── Date Extraction ──────────────────────────────────────────────────────────

function takeDate(source: string, baseDate: Date): { nextSource: string; date: Date; isFloating: boolean } {
  let isFloating = false;

  // ── Floating ─────────────────────────────────────────────────────────────
  for (const p of FLOATING_PATTERNS) {
    const m = p.exec(source);
    if (m) {
      return {
        nextSource: stripRange(source, m.index, m.index + m[0].length),
        date: addDays(baseDate, 180), // park 6 months out
        isFloating: true,
      };
    }
  }

  // ── EOD / EOW / EOM / EOY ─────────────────────────────────────────────────
  let m: RegExpExecArray | null;

  m = /\b(eod|end\s+of\s+(?:the\s+)?day|end\s+of\s+today)\b/i.exec(source);
  if (m) {
    return {
      nextSource: stripRange(source, m.index, m.index + m[0].length),
      date: baseDate, isFloating,
    };
    // Note: caller should set time to 17:00 if not already set
  }

  m = /\b(eow|end\s+of\s+(?:the\s+)?week|end\s+of\s+this\s+week)\b/i.exec(source);
  if (m) {
    return {
      nextSource: stripRange(source, m.index, m.index + m[0].length),
      date: resolveWeekday(baseDate, 5, 'this'), // Friday
      isFloating,
    };
  }

  m = /\b(eom|end\s+of\s+(?:the\s+)?month|end\s+of\s+this\s+month)\b/i.exec(source);
  if (m) {
    return {
      nextSource: stripRange(source, m.index, m.index + m[0].length),
      date: endOfMonth(baseDate),
      isFloating,
    };
  }

  m = /\b(eoy|end\s+of\s+(?:the\s+)?year|end\s+of\s+this\s+year)\b/i.exec(source);
  if (m) {
    return {
      nextSource: stripRange(source, m.index, m.index + m[0].length),
      date: new Date(baseDate.getFullYear(), 11, 31),
      isFloating,
    };
  }

  // ── Quarter dates ─────────────────────────────────────────────────────────

  m = /\bend\s+of\s+q([1-4])\b(?:\s+(\d{4}))?/i.exec(source);
  if (m) {
    const q = parseInt(m[1]) as 1 | 2 | 3 | 4;
    const year = m[2] ? parseInt(m[2]) : baseDate.getFullYear();
    const [, endMonth] = QUARTERS[q];
    return {
      nextSource: stripRange(source, m.index, m.index + m[0].length),
      date: endOfMonth(new Date(year, endMonth, 1)),
      isFloating,
    };
  }

  m = /\bq([1-4])\b(?:\s+(\d{4}))?/i.exec(source);
  if (m) {
    const q = parseInt(m[1]) as 1 | 2 | 3 | 4;
    const year = m[2] ? parseInt(m[2]) : baseDate.getFullYear();
    const [startMonth] = QUARTERS[q];
    const date = new Date(year, startMonth, 1);
    if (isBefore(startOfDay(date), startOfDay(baseDate))) date.setFullYear(year + 1);
    return { nextSource: stripRange(source, m.index, m.index + m[0].length), date, isFloating };
  }

  // ── Relative: today / tomorrow / day after tomorrow ────────────────────────

  m = /\b(day after tomorrow)\b/i.exec(source)
    ?? /\b(tomorrow)\b/i.exec(source)
    ?? /\b(today|tonight)\b/i.exec(source);

  if (m) {
    const label = m[1].toLowerCase();
    const offset = label === 'day after tomorrow' ? 2 : label === 'tomorrow' ? 1 : 0;
    return {
      nextSource: stripRange(source, m.index, m.index + m[0].length),
      date: addDays(baseDate, offset), isFloating,
    };
  }

  // ── Relative: in N days/weeks/months/years ────────────────────────────────

  m = /\bin\s+(\d+)\s+(days?|weeks?|months?|years?)\b/i.exec(source);
  if (m) {
    const n = parseInt(m[1]);
    const u = m[2].toLowerCase();
    const date = u.startsWith('d') ? addDays(baseDate, n)
               : u.startsWith('w') ? addWeeks(baseDate, n)
               : u.startsWith('m') ? addMonths(baseDate, n)
               : addYears(baseDate, n);
    return { nextSource: stripRange(source, m.index, m.index + m[0].length), date, isFloating };
  }

  // ── Vague relative: "in a couple of days", "in a few days" ────────────────

  m = /\bin\s+a\s+(?:couple(?:\s+of)?\s+days|few\s+days)\b/i.exec(source);
  if (m) return { nextSource: stripRange(source, m.index, m.index + m[0].length), date: addDays(baseDate, 3), isFloating };

  m = /\bin\s+a\s+(?:week|fortnight)\b/i.exec(source);
  if (m) {
    const isFortnight = /fortnight/i.test(m[0]);
    return { nextSource: stripRange(source, m.index, m.index + m[0].length), date: addDays(baseDate, isFortnight ? 14 : 7), isFloating };
  }

  // ── Weekend ───────────────────────────────────────────────────────────────

  m = /\b(?:(this|next)\s+)?weekend\b/i.exec(source);
  if (m) {
    const mod = (m[1]?.toLowerCase() as 'this' | 'next' | undefined) ?? null;
    return {
      nextSource: stripRange(source, m.index, m.index + m[0].length),
      date: resolveWeekday(baseDate, 6, mod), isFloating, // Saturday
    };
  }

  // ── Next week / next month ────────────────────────────────────────────────

  m = /\bnext\s+week\b/i.exec(source);
  if (m) return { nextSource: stripRange(source, m.index, m.index + m[0].length), date: addWeeks(baseDate, 1), isFloating };

  m = /\bnext\s+month\b/i.exec(source);
  if (m) return { nextSource: stripRange(source, m.index, m.index + m[0].length), date: addMonths(baseDate, 1), isFloating };

  m = /\bnext\s+year\b/i.exec(source);
  if (m) return { nextSource: stripRange(source, m.index, m.index + m[0].length), date: addYears(baseDate, 1), isFloating };

  // ── Next [month name] ─────────────────────────────────────────────────────

  const monthKeys = Object.keys(MONTHS).join('|');
  const nextMonthPattern = new RegExp(`\\bnext\\s+(${monthKeys})\\b`, 'i');
  m = nextMonthPattern.exec(source);
  if (m) {
    const targetMonth = MONTHS[m[1].toLowerCase()];
    let year = baseDate.getFullYear();
    if (targetMonth <= baseDate.getMonth()) year++;
    else year++;
    return {
      nextSource: stripRange(source, m.index, m.index + m[0].length),
      date: new Date(year, targetMonth, 1), isFloating,
    };
  }

  // ── This/next [weekday] ───────────────────────────────────────────────────

  const wdKeys = Object.keys(WEEKDAYS).join('|');
  const wdPattern = new RegExp(`\\b(?:(this|next)\\s+)?(${wdKeys})\\b`, 'i');
  m = wdPattern.exec(source);
  if (m) {
    const mod = (m[1]?.toLowerCase() as 'this' | 'next' | undefined) ?? null;
    const weekday = WEEKDAYS[m[2].toLowerCase()];
    return {
      nextSource: stripRange(source, m.index, m.index + m[0].length),
      date: resolveWeekday(baseDate, weekday, mod), isFloating,
    };
  }

  // ── First/last [weekday] of [month] ──────────────────────────────────────

  const ordinals: Record<string, number> = { first: 1, '1st': 1, second: 2, '2nd': 2, third: 3, '3rd': 3, fourth: 4, '4th': 4, fifth: 5, '5th': 5, last: -1 };
  const ordinalKeys = Object.keys(ordinals).join('|');
  const nthWdPattern = new RegExp(
    `\\b(${ordinalKeys})\\s+(${wdKeys})\\s+of\\s+(?:(next)\\s+)?(${monthKeys}|month)\\b`,
    'i'
  );
  m = nthWdPattern.exec(source);
  if (m) {
    const ordinalStr = m[1].toLowerCase();
    const nth = ordinals[ordinalStr];
    const weekday = WEEKDAYS[m[2].toLowerCase()];
    const isNext = !!m[3];
    const monthStr = m[4].toLowerCase();
    let month: number;
    let year = baseDate.getFullYear();

    if (monthStr === 'month') {
      month = baseDate.getMonth() + (isNext ? 1 : 0);
    } else {
      month = MONTHS[monthStr];
      if (month <= baseDate.getMonth() || isNext) year++;
    }

    const date = nth === -1
      ? lastWeekdayOfMonth(year, month, weekday)
      : nthWeekdayOfMonth(year, month, weekday, nth);

    if (date) {
      return { nextSource: stripRange(source, m.index, m.index + m[0].length), date, isFloating };
    }
  }

  // ── [Month] [Day] [Year?] — e.g. "January 15" / "Jan 15, 2025" ───────────

  const monthNamePattern = new RegExp(
    `\\b(${monthKeys})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(\\d{4}))?\\b`,
    'i'
  );
  m = monthNamePattern.exec(source);
  if (m) {
    const month = MONTHS[m[1].toLowerCase()];
    const day = parseInt(m[2]);
    const year = m[3] ? parseInt(m[3]) : undefined;
    const date = buildDate(baseDate, month, day, year);
    if (date) return { nextSource: stripRange(source, m.index, m.index + m[0].length), date, isFloating };
  }

  // ── [Day] [Month] [Year?] — e.g. "15th January" ──────────────────────────

  const dayMonthPattern = new RegExp(
    `\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthKeys})(?:,?\\s*(\\d{4}))?\\b`,
    'i'
  );
  m = dayMonthPattern.exec(source);
  if (m) {
    const day = parseInt(m[1]);
    const month = MONTHS[m[2].toLowerCase()];
    const year = m[3] ? parseInt(m[3]) : undefined;
    const date = buildDate(baseDate, month, day, year);
    if (date) return { nextSource: stripRange(source, m.index, m.index + m[0].length), date, isFloating };
  }

  // ── Numeric date: MM/DD or DD/MM with optional year ───────────────────────

  m = /\b(\d{1,2})[/\-.](\d{1,2})(?:[/\-.](\d{2,4}))?\b/.exec(source);
  if (m) {
    const first = parseInt(m[1]);
    const second = parseInt(m[2]);
    const rawYear = m[3] ? parseInt(m[3]) : undefined;
    const year = rawYear === undefined ? undefined : rawYear < 100 ? 2000 + rawYear : rawYear;
    // Ambiguous: if first > 12 it must be the day
    const month = first > 12 ? second - 1 : first - 1;
    const day = first > 12 ? first : second;
    const date = buildDate(baseDate, month, day, year);
    if (date) return { nextSource: stripRange(source, m.index, m.index + m[0].length), date, isFloating };
  }

  // ── Nth of the month — e.g. "the 15th" ───────────────────────────────────

  m = /\b(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)\b/i.exec(source);
  if (m) {
    const day = parseInt(m[1]);
    if (day >= 1 && day <= 31) {
      let candidate = setDate(baseDate, day);
      if (isBefore(startOfDay(candidate), startOfDay(baseDate))) {
        candidate = setDate(addMonths(baseDate, 1), day);
      }
      return { nextSource: stripRange(source, m.index, m.index + m[0].length), date: candidate, isFloating };
    }
  }

  return { nextSource: source, date: baseDate, isFloating };
}

// ─── Time Extraction ──────────────────────────────────────────────────────────

function takeTime(source: string): { nextSource: string; time: string | null } {
  // "half past N" / "quarter past N" / "quarter to N"
  let m = /\bhalf\s+past\s+(\d{1,2})\b/i.exec(source);
  if (m) {
    let h = parseInt(m[1]);
    if (h < 7) h += 12; // assume PM for ambiguous hours
    return { nextSource: stripRange(source, m.index, m.index + m[0].length), time: normalizeTime(h, 30) };
  }

  m = /\bquarter\s+past\s+(\d{1,2})\b/i.exec(source);
  if (m) {
    let h = parseInt(m[1]);
    if (h < 7) h += 12;
    return { nextSource: stripRange(source, m.index, m.index + m[0].length), time: normalizeTime(h, 15) };
  }

  m = /\bquarter\s+to\s+(\d{1,2})\b/i.exec(source);
  if (m) {
    let h = parseInt(m[1]);
    if (h < 7) h += 12;
    return { nextSource: stripRange(source, m.index, m.index + m[0].length), time: normalizeTime(h - 1, 45) };
  }

  // "3:30pm", "3pm", "3 pm", "at 3"
  m = /\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i.exec(source);
  if (m) {
    let hours = parseInt(m[1]);
    const minutes = m[2] ? parseInt(m[2]) : 0;
    const meridiem = m[3].toLowerCase();
    if (hours === 12) hours = meridiem === 'am' ? 0 : 12;
    else if (meridiem === 'pm') hours += 12;
    return { nextSource: stripRange(source, m.index, m.index + m[0].length), time: normalizeTime(hours, minutes) };
  }

  // 24-hour "14:30"
  m = /\b(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)\b/.exec(source);
  if (m) {
    return {
      nextSource: stripRange(source, m.index, m.index + m[0].length),
      time: normalizeTime(parseInt(m[1]), parseInt(m[2])),
    };
  }

  // Named times / parts of day
  const partPattern = new RegExp(
    `\\b(${Object.keys(PART_OF_DAY_TIME).join('|')})\\b`,
    'i'
  );
  m = partPattern.exec(source);
  if (m) {
    const key = m[1].toLowerCase() as keyof typeof PART_OF_DAY_TIME;
    return {
      nextSource: stripRange(source, m.index, m.index + m[0].length),
      time: PART_OF_DAY_TIME[key],
    };
  }

  return { nextSource: source, time: null };
}

// ─── Priority Extraction ──────────────────────────────────────────────────────

function takePriority(source: string): { nextSource: string; priority: Priority } {
  for (const pattern of HIGH_PRIORITY_PATTERNS) {
    const m = pattern.exec(source);
    if (m) return { nextSource: stripRange(source, m.index, m.index + m[0].length), priority: 'high' };
  }

  for (const pattern of LOW_PRIORITY_PATTERNS) {
    const m = pattern.exec(source);
    if (m) return { nextSource: stripRange(source, m.index, m.index + m[0].length), priority: 'low' };
  }

  return { nextSource: source, priority: 'normal' };
}

// ─── Tag Extraction ───────────────────────────────────────────────────────────

function takeExplicitTags(source: string): { nextSource: string; tags: string[] } {
  const tags = new Set<string>();
  const nextSource = source.replace(/(^|\s)[@#]([a-z0-9][a-z0-9_-]*)/gi, (_, prefix: string, tag: string) => {
    tags.add(tag.toLowerCase());
    return prefix || ' ';
  });
  return { nextSource, tags: Array.from(tags) };
}

function inferTags(source: string, existing: string[]): string[] {
  const tags = new Set(existing);
  for (const rule of TAG_INFERENCE_RULES) {
    if (!tags.has(rule.tag) && rule.pattern.test(source)) {
      tags.add(rule.tag);
    }
  }
  return Array.from(tags);
}

// ─── EOD time injection ───────────────────────────────────────────────────────

function maybeInjectEODTime(source: string, time: string | null): string | null {
  if (time !== null) return time;
  if (/\b(eod|end\s+of\s+(?:the\s+)?day)\b/i.test(source)) return '17:00';
  return null;
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function parseIntent(input: string, baseDate: Date = new Date()): ParsedIntent {
  const raw = input.trim();
  let working = raw;

  // 1. Explicit tags (@home #work)
  const { nextSource: taglessSource, tags: explicitTags } = takeExplicitTags(working);
  working = taglessSource;

  // 2. Priority
  const { nextSource: noPriority, priority } = takePriority(working);
  working = noPriority;

  // 3. Duration ("for 2 hours")
  const { nextSource: noDuration, duration } = takeDuration(working);
  working = noDuration;

  // 4. Recurrence ("every monday", "daily") — must come before date
  const { nextSource: noRecurrence, recurrence } = takeRecurrence(working);
  working = noRecurrence;

  // 5. Date
  const { nextSource: noDate, date, isFloating } = takeDate(working, baseDate);
  working = noDate;

  // 6. Time
  const { nextSource: noTime, time: rawTime } = takeTime(working);
  working = noTime;

  // Inject EOD time if needed (even if takeTime found nothing)
  const time = maybeInjectEODTime(raw, rawTime);

  // 7. Clean up the remaining text
  const fallbackText = raw.replace(/(^|\s)[@#][a-z0-9][a-z0-9_-]*/gi, ' ');
  const text = cleanupText(working) || cleanupText(fallbackText) || raw;

  // 8. Tag inference (run on original input for best signal)
  const tags = inferTags(raw, explicitTags);

  // 9. isAdvanced — gates Pro features
  const isAdvanced = ADVANCED_PATTERNS.some(p => p.test(raw)) || isFloating || recurrence !== null;

  return {
    raw,
    text,
    date,
    time,
    priority,
    tags,
    isAdvanced,
    recurrence,
    duration,
    isFloating,
  };
}
