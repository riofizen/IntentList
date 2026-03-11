import { addDays, addMonths, addWeeks, format, isLastDayOfMonth, nextMonday, nextSunday, parse, startOfToday, startOfWeek, endOfMonth } from 'date-fns';
import { Priority } from '../types';

export interface ParsedResult {
  text: string;
  date: Date;
  time: string | null;
  priority: Priority;
  tags: string[];
  isAdvanced: boolean;
}

const FILLER_PHRASES = [
  'have to',
  'need to',
  'i want to',
  'remember to',
  'remind me to',
  'don\'t forget to',
  'i should',
  'must',
];

const ADVANCED_KEYWORDS = [
  'tmr', 'tom', 'later', 'weekend', 'next week', 'next month',
  'fyi', 'tonight', 'afternoon'
];

export function parseIntent(input: string, baseDate: Date = new Date()): ParsedResult {
  let text = input.toLowerCase().trim();
  let date = new Date(baseDate);
  let time: string | null = null;
  let priority: Priority = 'normal';
  let tags: string[] = [];
  let isAdvanced = false;

  // Extract tags (words starting with @ or #)
  const tagRegex = /[@#](\w+)/g;
  const tagMatches = text.match(tagRegex);
  if (tagMatches) {
    tags = tagMatches.map(t => t.slice(1));
    text = text.replace(tagRegex, '');
  }

  // Check if any advanced keywords are used
  isAdvanced = ADVANCED_KEYWORDS.some(kw => text.includes(kw));

  // 1. Priority Detection
  if (text.includes('urgent') || text.includes('important') || text.includes('high priority') || text.includes('!!!')) {
    priority = 'high';
    text = text.replace(/urgent|important|high priority|!!!/g, '');
  } else if (text.includes('low priority') || text.includes('whenever') || text.includes('maybe')) {
    priority = 'low';
    text = text.replace(/low priority|whenever|maybe/g, '');
  }

  // 2. Remove filler phrases
  for (const phrase of FILLER_PHRASES) {
    text = text.replace(phrase, '');
  }
  text = text.trim();

  // 3. Extract Relative Dates
  if (text.includes('today')) {
    date = startOfToday();
    text = text.replace('today', '');
  } else if (/\b(tomorrow|tmrw|tmr|tom)\b/.test(text)) {
    date = addDays(baseDate, 1);
    text = text.replace(/\b(tomorrow|tmrw|tmr|tom)\b/g, '');
  } else if (text.includes('next monday')) {
    date = nextMonday(baseDate);
    text = text.replace('next monday', '');
  } else if (text.includes('next sunday')) {
    date = nextSunday(baseDate);
    text = text.replace('next sunday', '');
  } else if (text.includes('next week')) {
    date = addWeeks(baseDate, 1);
    text = text.replace('next week', '');
  } else if (text.includes('next month')) {
    date = addMonths(baseDate, 1);
    text = text.replace('next month', '');
  } else if (text.includes('weekend')) {
    // Next Saturday
    const day = baseDate.getDay();
    const diff = (day <= 6 ? 6 - day : 6);
    date = addDays(baseDate, diff);
    text = text.replace('weekend', '');
  } else if (text.includes('later')) {
    date = addDays(baseDate, 2); // Heuristic for "later"
    text = text.replace('later', '');
  }

  // 4. Extract IT Shorthand
  if (text.includes('eod') || text.includes('cob')) {
    time = '18:00';
    text = text.replace(/\b(eod|cob)\b/g, '');
  } else if (text.includes('asap')) {
    priority = 'high';
    text = text.replace(/\basap\b/g, '');
  } else if (text.includes('eow')) {
    const day = baseDate.getDay();
    const diff = (day <= 5 ? 5 - day : 5 + (7 - day));
    date = addDays(baseDate, diff);
    text = text.replace(/\beow\b/g, '');
  } else if (text.includes('eom')) {
    date = endOfMonth(baseDate);
    text = text.replace(/\beom\b/g, '');
  } else if (text.includes('fyi')) {
    priority = 'low';
    text = text.replace(/\bfyi\b/g, '');
  }

  // 5. Extract Explicit Dates (Simple patterns like "12 march")
  const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  
  const dateRegex = new RegExp(`(\\d{1,2})\\s+(${monthNames.join('|')})`, 'i');
  const match = text.match(dateRegex);
  if (match) {
    const day = parseInt(match[1]);
    const monthStr = match[2].toLowerCase();
    const monthIndex = monthNames.findIndex(m => m.startsWith(monthStr)) % 12;
    date = new Date(baseDate.getFullYear(), monthIndex, day);
    text = text.replace(match[0], '');
  }

  // 6. Extract Time Words
  if (text.includes('morning')) {
    time = '09:00';
    text = text.replace('morning', '');
  } else if (text.includes('afternoon')) {
    time = '14:00';
    text = text.replace('afternoon', '');
  } else if (text.includes('evening') || text.includes('eve')) {
    time = '19:00';
    text = text.replace(/\b(evening|eve)\b/g, '');
  } else if (text.includes('tonight')) {
    time = '20:00';
    text = text.replace('tonight', '');
  } else if (text.includes('night')) {
    time = '22:00';
    text = text.replace('night', '');
  }

  return {
    text: text.trim().replace(/\s+/g, ' ') || input,
    date,
    time,
    priority,
    tags,
    isAdvanced
  };
}
