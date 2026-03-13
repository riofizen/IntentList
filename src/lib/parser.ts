import { addDays, addMonths, addWeeks, getDay, isBefore, startOfDay } from 'date-fns';
import { Priority } from '../types';

export interface ParsedIntent {
  raw: string;
  text: string;
  date: Date;
  time: string | null;
  priority: Priority;
  tags: string[];
  isAdvanced: boolean;
}

const MONTHS: Record<string, number> = {
  january: 0,
  jan: 0,
  february: 1,
  feb: 1,
  march: 2,
  mar: 2,
  april: 3,
  apr: 3,
  may: 4,
  june: 5,
  jun: 5,
  july: 6,
  jul: 6,
  august: 7,
  aug: 7,
  september: 8,
  sept: 8,
  sep: 8,
  october: 9,
  oct: 9,
  november: 10,
  nov: 10,
  december: 11,
  dec: 11,
};

const WEEKDAYS: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thur: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

const HIGH_PRIORITY_PATTERNS = [
  /\b(high priority|top priority|critical|urgent|asap|immediately|important)\b/i,
  /\bp1\b/i,
  /!!+/,
];

const LOW_PRIORITY_PATTERNS = [
  /\b(low priority|eventually|whenever|later on|not urgent)\b/i,
  /\bp3\b/i,
];

const ADVANCED_PATTERNS = [
  /\b(every|each|daily|weekly|monthly|yearly|annually)\b/i,
  /\bbiweekly\b/i,
  /\brecurring\b/i,
  /\brepeat(?:ing)?\b/i,
  /\bsometime\b/i,
  /\bsomeday\b/i,
  /\bwhenever\b/i,
];

const TAG_INFERENCE_RULES: Array<{ tag: string; pattern: RegExp }> = [
  { tag: 'work', pattern: /\b(meeting|client|report|project|team|office|proposal|deck|email)\b/i },
  { tag: 'code', pattern: /\b(code|debug|deploy|repo|commit|pull request|pr|bug|build|refactor|ship)\b/i },
  { tag: 'study', pattern: /\b(study|revise|exam|assignment|course|lecture|practice problem|read chapter)\b/i },
  { tag: 'health', pattern: /\b(workout|gym|run|walk|doctor|therapy|meditat|stretch|sleep|water|yoga)\b/i },
  { tag: 'finance', pattern: /\b(rent|bill|budget|invoice|tax|bank|salary|payment|expense)\b/i },
  { tag: 'errands', pattern: /\b(buy|pickup|pick up|grocery|groceries|store|pharmacy|cleaners|drop off|return)\b/i },
  { tag: 'personal', pattern: /\b(call mom|call dad|family|birthday|anniversary|friend|home|personal)\b/i },
];

const PART_OF_DAY_TIME: Record<string, string> = {
  morning: '09:00',
  afternoon: '14:00',
  evening: '18:00',
  night: '20:00',
  tonight: '20:00',
};

const LEADING_FILLERS = [
  /^(?:please\s+)?(?:remind me to|remember to|i need to|need to|can you|could you|please|todo|to do|task|add)\s+/i,
  /^(?:i should|i have to|i must)\s+/i,
];

const TRAILING_GLUE = /\b(?:on|at|by|for|in|around|this|next)\b$/i;
const LEADING_GLUE = /^(?:on|at|by|for|in|around)\b/i;

function stripRange(source: string, start: number, end: number) {
  return `${source.slice(0, start)} ${source.slice(end)}`;
}

function cleanupText(source: string) {
  let value = source.trim();

  for (const pattern of LEADING_FILLERS) {
    value = value.replace(pattern, '');
  }

  value = value
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;!?])/g, '$1')
    .replace(/^[,.;:!?/\-]+/, '')
    .replace(/[,.;:!?/\-]+$/, '')
    .trim();

  while (TRAILING_GLUE.test(value)) {
    value = value.replace(TRAILING_GLUE, '').trim();
  }

  while (LEADING_GLUE.test(value)) {
    value = value.replace(LEADING_GLUE, '').trim();
  }

  return value;
}

function normalizeTime(hours: number, minutes = 0) {
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function buildDate(baseDate: Date, month: number, day: number, year?: number) {
  const resolvedYear = year ?? baseDate.getFullYear();
  const candidate = new Date(resolvedYear, month, day);

  if (candidate.getMonth() !== month || candidate.getDate() !== day) {
    return null;
  }

  if (year === undefined && isBefore(startOfDay(candidate), startOfDay(baseDate))) {
    candidate.setFullYear(candidate.getFullYear() + 1);
  }

  return candidate;
}

function resolveWeekday(baseDate: Date, targetDay: number, modifier: 'this' | 'next' | null) {
  const currentDay = getDay(baseDate);
  let delta = (targetDay - currentDay + 7) % 7;

  if (modifier === 'next') {
    delta = (delta || 7) + 7;
  } else if (delta === 0 && modifier !== 'this') {
    delta = 0;
  }

  return addDays(baseDate, delta);
}

function takeDate(source: string, baseDate: Date) {
  let match =
    /\b(day after tomorrow)\b/i.exec(source) ??
    /\b(tomorrow)\b/i.exec(source) ??
    /\b(today|tonight)\b/i.exec(source);

  if (match) {
    const label = match[1].toLowerCase();
    const offset = label === 'day after tomorrow' ? 2 : label === 'tomorrow' ? 1 : 0;
    return {
      nextSource: stripRange(source, match.index, match.index + match[0].length),
      date: addDays(baseDate, offset),
    };
  }

  match = /\bin\s+(\d+)\s+(day|days|week|weeks|month|months)\b/i.exec(source);
  if (match) {
    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    const date =
      unit.startsWith('day') ? addDays(baseDate, amount) :
      unit.startsWith('week') ? addWeeks(baseDate, amount) :
      addMonths(baseDate, amount);

    return {
      nextSource: stripRange(source, match.index, match.index + match[0].length),
      date,
    };
  }

  match = /\b(?:(this|next)\s+)?weekend\b/i.exec(source);
  if (match) {
    const modifier = (match[1]?.toLowerCase() as 'this' | 'next' | undefined) ?? null;
    const saturday = resolveWeekday(baseDate, 6, modifier);
    return {
      nextSource: stripRange(source, match.index, match.index + match[0].length),
      date: saturday,
    };
  }

  match = /\bnext\s+week\b/i.exec(source);
  if (match) {
    return {
      nextSource: stripRange(source, match.index, match.index + match[0].length),
      date: addWeeks(baseDate, 1),
    };
  }

  match = /\bnext\s+month\b/i.exec(source);
  if (match) {
    return {
      nextSource: stripRange(source, match.index, match.index + match[0].length),
      date: addMonths(baseDate, 1),
    };
  }

  match =
    /\b(?:(this|next)\s+)?(monday|mon|tuesday|tue|tues|wednesday|wed|thursday|thu|thur|thurs|friday|fri|saturday|sat|sunday|sun)\b/i.exec(source);
  if (match) {
    const modifier = (match[1]?.toLowerCase() as 'this' | 'next' | undefined) ?? null;
    const weekday = WEEKDAYS[match[2].toLowerCase()];
    return {
      nextSource: stripRange(source, match.index, match.index + match[0].length),
      date: resolveWeekday(baseDate, weekday, modifier),
    };
  }

  match = /\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,\s*|\s+)?(\d{4})?\b/i.exec(source);
  if (match) {
    const month = MONTHS[match[1].toLowerCase()];
    const day = Number(match[2]);
    const year = match[3] ? Number(match[3]) : undefined;
    const date = buildDate(baseDate, month, day, year);

    if (date) {
      return {
        nextSource: stripRange(source, match.index, match.index + match[0].length),
        date,
      };
    }
  }

  match = /\b(\d{1,2})(?:st|nd|rd|th)?\s+(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)(?:,\s*|\s+)?(\d{4})?\b/i.exec(source);
  if (match) {
    const day = Number(match[1]);
    const month = MONTHS[match[2].toLowerCase()];
    const year = match[3] ? Number(match[3]) : undefined;
    const date = buildDate(baseDate, month, day, year);

    if (date) {
      return {
        nextSource: stripRange(source, match.index, match.index + match[0].length),
        date,
      };
    }
  }

  match = /\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/.exec(source);
  if (match) {
    const first = Number(match[1]);
    const second = Number(match[2]);
    const rawYear = match[3] ? Number(match[3]) : undefined;
    const year = rawYear === undefined ? undefined : rawYear < 100 ? 2000 + rawYear : rawYear;
    const month = first > 12 ? second - 1 : first - 1;
    const day = first > 12 ? first : second;
    const date = buildDate(baseDate, month, day, year);

    if (date) {
      return {
        nextSource: stripRange(source, match.index, match.index + match[0].length),
        date,
      };
    }
  }

  return { nextSource: source, date: baseDate };
}

function takeTime(source: string) {
  let match = /\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i.exec(source);
  if (match) {
    let hours = Number(match[1]);
    const minutes = match[2] ? Number(match[2]) : 0;
    const meridiem = match[3].toLowerCase();

    if (hours === 12) {
      hours = meridiem === 'am' ? 0 : 12;
    } else if (meridiem === 'pm') {
      hours += 12;
    }

    return {
      nextSource: stripRange(source, match.index, match.index + match[0].length),
      time: normalizeTime(hours, minutes),
    };
  }

  match = /\b(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)\b/.exec(source);
  if (match) {
    return {
      nextSource: stripRange(source, match.index, match.index + match[0].length),
      time: normalizeTime(Number(match[1]), Number(match[2])),
    };
  }

  match = /\b(noon|midnight)\b/i.exec(source);
  if (match) {
    return {
      nextSource: stripRange(source, match.index, match.index + match[0].length),
      time: match[1].toLowerCase() === 'noon' ? '12:00' : '00:00',
    };
  }

  match = /\b(morning|afternoon|evening|tonight|night)\b/i.exec(source);
  if (match) {
    return {
      nextSource: stripRange(source, match.index, match.index + match[0].length),
      time: PART_OF_DAY_TIME[match[1].toLowerCase()],
    };
  }

  return { nextSource: source, time: null };
}

function takePriority(source: string) {
  for (const pattern of HIGH_PRIORITY_PATTERNS) {
    const match = pattern.exec(source);
    if (match) {
      return {
        nextSource: stripRange(source, match.index, match.index + match[0].length),
        priority: 'high' as Priority,
      };
    }
  }

  for (const pattern of LOW_PRIORITY_PATTERNS) {
    const match = pattern.exec(source);
    if (match) {
      return {
        nextSource: stripRange(source, match.index, match.index + match[0].length),
        priority: 'low' as Priority,
      };
    }
  }

  return { nextSource: source, priority: 'normal' as Priority };
}

function takeExplicitTags(source: string) {
  const tags = new Set<string>();
  const nextSource = source.replace(/(^|\s)[@#]([a-z0-9][a-z0-9_-]*)/gi, (_, prefix: string, tag: string) => {
    tags.add(tag.toLowerCase());
    return prefix || ' ';
  });

  return { nextSource, tags: Array.from(tags) };
}

function inferTags(source: string, existing: string[]) {
  const tags = new Set(existing);

  for (const rule of TAG_INFERENCE_RULES) {
    if (tags.has(rule.tag)) continue;
    if (rule.pattern.test(source)) {
      tags.add(rule.tag);
    }
  }

  return Array.from(tags);
}

export function parseIntent(input: string, baseDate: Date = new Date()): ParsedIntent {
  const raw = input.trim();
  let working = raw;

  const { nextSource: taglessSource, tags: explicitTags } = takeExplicitTags(working);
  working = taglessSource;

  const { nextSource: prioritySource, priority } = takePriority(working);
  working = prioritySource;

  const { nextSource: dateSource, date } = takeDate(working, baseDate);
  working = dateSource;

  const { nextSource: timeSource, time } = takeTime(working);
  working = timeSource;

  const text = cleanupText(working) || cleanupText(raw.replace(/(^|\s)[@#][a-z0-9][a-z0-9_-]*/gi, ' ')) || raw;
  const tags = inferTags(raw, explicitTags);
  const isAdvanced = ADVANCED_PATTERNS.some((pattern) => pattern.test(raw));

  return {
    raw,
    text,
    date,
    time,
    priority,
    tags,
    isAdvanced,
  };
}
