/**
 * focusInsight.ts
 *
 * Zero-cost, zero-latency focus insights.
 * Curated by mode (focus / short break / long break) and time of day.
 * No API key or network call needed.
 */

type Mode = 'pomodoro' | 'shortBreak' | 'longBreak';
type TimeSlot = 'morning' | 'midday' | 'afternoon' | 'evening' | 'night';

// ─── Curated Insight Library ──────────────────────────────────────────────────

const INSIGHTS: Record<Mode, Record<TimeSlot, string[]>> = {
  pomodoro: {
    morning: [
      'The morning is your sharpest hour — protect it.',
      'Clarity comes before the world gets loud.',
      'Ship the hard thing first.',
      'Deep work done by noon is a gift to your future self.',
      'One hour of real focus beats eight of distraction.',
    ],
    midday: [
      'The afternoon waits — finish this block strong.',
      'Momentum is easier to keep than restart.',
      'Stay with it. You are closer than you think.',
      'This twenty-five minutes is all that exists right now.',
      'Resistance is loudest just before breakthrough.',
    ],
    afternoon: [
      'Energy dips — focus sharpens the signal.',
      'Finish the session. Rest comes next.',
      'The work in front of you is the only work.',
      'Remove one tab. Then another. Then begin.',
      'Afternoon is for execution, not planning.',
    ],
    evening: [
      'End the day with intention, not drift.',
      'One more good block before you rest.',
      'What you finish tonight, tomorrow won\'t carry.',
      'Evening work is quiet and underrated.',
      'A focused evening protects tomorrow\'s morning.',
    ],
    night: [
      'Late work requires honest limits — know yours.',
      'Finish the task, then close the machine.',
      'Night is for wrapping up, not starting over.',
      'Work with the quiet, not against the clock.',
      'Dim the screen. Sharpen the thought.',
    ],
  },

  shortBreak: {
    morning: [
      'Stand up. Look out the window for thirty seconds.',
      'Three deep breaths reset the nervous system.',
      'Hydrate. Water before coffee.',
      'Walk to the kitchen and back — that counts.',
      'Roll your shoulders. Unclench your jaw.',
    ],
    midday: [
      'Step outside if you can — even for a minute.',
      'Eyes off the screen. Let them rest.',
      'A short walk beats a longer scroll.',
      'Drink water. Your brain is mostly water.',
      'Stretch your neck slowly. Both sides.',
    ],
    afternoon: [
      'Midday slump is real. Move a little.',
      'Close your eyes for sixty seconds.',
      'A short break compounds into better work.',
      'Step away from the screen before you fade.',
      'Breathe slowly. Let your mind surface.',
    ],
    evening: [
      'Short breaks in the evening prevent burnout.',
      'Step away. The work will still be there.',
      'Let your mind idle — it\'s still processing.',
      'Look at something far away to rest your eyes.',
      'A small pause is not lost time.',
    ],
    night: [
      'Rest is productive. Don\'t skip it.',
      'Let the system breathe.',
      'Your subconscious is solving problems right now.',
      'Close your eyes. Put your feet on the floor.',
      'A few minutes of nothing is a real skill.',
    ],
  },

  longBreak: {
    morning: [
      'Eat something. Focus runs on fuel.',
      'Go outside. Morning light resets your energy.',
      'A proper break is an investment in the next session.',
      'Leave the desk. Let your body lead for a while.',
      'Cook, walk, stretch. Something real, not digital.',
    ],
    midday: [
      'Eat lunch away from your screen.',
      'Walk for fifteen minutes — it sharpens the afternoon.',
      'Let your mind go completely blank for a moment.',
      'The best productivity hack is a real break.',
      'Daylight during breaks improves afternoon clarity.',
    ],
    afternoon: [
      'Nap if you can. Twenty minutes is transformative.',
      'A walk in the afternoon resets more than coffee does.',
      'Long breaks are where creativity refills.',
      'Do something with your hands — dishes, a stretch, a sketch.',
      'Step fully away. No half-breaks.',
    ],
    evening: [
      'Protect the evening. It belongs to recovery.',
      'Cook a real meal. Eat it slowly.',
      'Long breaks are where the day\'s work settles.',
      'Call someone. Human connection is recovery.',
      'Your evening rituals set up tomorrow\'s focus.',
    ],
    night: [
      'Wind down. The screen can wait until morning.',
      'A long break at night is the beginning of sleep.',
      'What is unfinished today can live in tomorrow.',
      'Read something slow and physical.',
      'Darkness tells your brain the work is done.',
    ],
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTimeSlot(timeOfDay: string): TimeSlot {
  const lower = timeOfDay.toLowerCase();

  if (/morning|dawn|early/.test(lower)) return 'morning';
  if (/noon|midday|lunch/.test(lower))  return 'midday';
  if (/afternoon/.test(lower))           return 'afternoon';
  if (/evening|dusk|sunset/.test(lower)) return 'evening';
  if (/night|late|midnight/.test(lower)) return 'night';

  // Parse "HH:MM" or "H:MM"
  const timeMatch = /(\d{1,2}):(\d{2})/.exec(timeOfDay);
  if (timeMatch) {
    const h = parseInt(timeMatch[1]);
    if (h >= 5 && h < 12)  return 'morning';
    if (h >= 12 && h < 14) return 'midday';
    if (h >= 14 && h < 18) return 'afternoon';
    if (h >= 18 && h < 22) return 'evening';
    return 'night';
  }

  // Fallback using current hour
  const h = new Date().getHours();
  if (h >= 5 && h < 12)  return 'morning';
  if (h >= 12 && h < 14) return 'midday';
  if (h >= 14 && h < 18) return 'afternoon';
  if (h >= 18 && h < 22) return 'evening';
  return 'night';
}

/** Pick a deterministic-ish item from an array so it feels fresh each session */
function pickInsight(pool: string[]): string {
  const seed = Math.floor(Date.now() / (1000 * 60 * 30)); // changes every 30 min
  return pool[seed % pool.length];
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns a short, sharp insight string for the given mode and time of day.
 * Fully synchronous and free — no network call.
 */
export async function getFocusInsight(
  mode: 'pomodoro' | 'shortBreak' | 'longBreak',
  timeOfDay: string
): Promise<string> {
  try {
    const slot = getTimeSlot(timeOfDay);
    const pool = INSIGHTS[mode][slot];
    return pickInsight(pool);
  } catch {
    return 'Your focus determines your reality.';
  }
}
