/**
 * taskBreakdown.ts
 *
 * Zero-cost, zero-latency task breakdown using keyword pattern matching.
 * Works fully offline and in the browser — no API key needed.
 *
 * Falls back to a generic breakdown template if no specific match is found.
 */

// ─── Template Library ─────────────────────────────────────────────────────────

interface BreakdownTemplate {
  /** Regex that matches the task text */
  pattern: RegExp;
  /** Subtask steps to return */
  steps: string[];
}

const TEMPLATES: BreakdownTemplate[] = [
  // ── Writing / Documents ───────────────────────────────────────────────────
  {
    pattern: /\b(write|draft|create|prepare)\b.*\b(report|document|doc|whitepaper|summary|brief)\b/i,
    steps: [
      'Define the purpose and target audience',
      'Outline the key sections',
      'Gather data, references, and supporting material',
      'Write the first draft',
      'Proofread, edit, and finalize',
    ],
  },
  {
    pattern: /\b(write|draft|send|compose|reply to|respond to)\b.*\b(email|message|dm)\b/i,
    steps: [
      'Clarify the main point or ask',
      'Draft the email',
      'Check tone, clarity, and length',
      'Add attachments or CC recipients if needed',
      'Send',
    ],
  },
  {
    pattern: /\b(write|create|prepare|build)\b.*\b(presentation|deck|slides|ppt|pptx)\b/i,
    steps: [
      'Define the key message and audience',
      'Outline the slide structure',
      'Create slides with clear visuals',
      'Add speaker notes',
      'Review flow and finalize',
    ],
  },
  {
    pattern: /\b(write|draft|complete)\b.*\b(essay|article|blog|post)\b/i,
    steps: [
      'Research the topic',
      'Create an outline',
      'Write the introduction',
      'Develop the body paragraphs',
      'Write conclusion and proofread',
    ],
  },
  {
    pattern: /\b(write|update|draft)\b.*\b(resume|cv|cover letter|portfolio)\b/i,
    steps: [
      'List recent achievements and experience',
      'Tailor content to the target role',
      'Update work history and skills',
      'Proofread for typos and formatting',
      'Export as PDF and share',
    ],
  },

  // ── Coding / Engineering ──────────────────────────────────────────────────
  {
    pattern: /\b(build|create|implement|add|develop)\b.*\b(feature|functionality|module|component)\b/i,
    steps: [
      'Define requirements and acceptance criteria',
      'Design the solution or data model',
      'Implement the core logic',
      'Write tests for edge cases',
      'Review, merge, and document',
    ],
  },
  {
    pattern: /\b(fix|resolve|debug|investigate)\b.*\b(bug|issue|error|crash|problem)\b/i,
    steps: [
      'Reproduce the issue reliably',
      'Identify the root cause',
      'Write a targeted fix',
      'Add regression tests',
      'Deploy and verify the fix',
    ],
  },
  {
    pattern: /\b(deploy|release|ship|push|launch)\b/i,
    steps: [
      'Run all tests and check CI status',
      'Review environment variables and configs',
      'Build the production bundle',
      'Deploy to staging and verify',
      'Release to production and monitor',
    ],
  },
  {
    pattern: /\b(refactor|clean up|improve)\b.*\b(code|codebase|module)\b/i,
    steps: [
      'Identify the area to improve',
      'Write tests to cover current behaviour',
      'Refactor in small, reviewable steps',
      'Verify all tests pass',
      'Update documentation if needed',
    ],
  },
  {
    pattern: /\b(review|code review|review PR|review pull request)\b/i,
    steps: [
      'Understand the context and goal of the change',
      'Check logic, edge cases, and error handling',
      'Verify tests are present and passing',
      'Leave clear, constructive comments',
      'Approve or request changes',
    ],
  },

  // ── Meetings / Planning ───────────────────────────────────────────────────
  {
    pattern: /\b(prepare|prepare for|prep for|get ready for)\b.*\b(meeting|call|interview|presentation)\b/i,
    steps: [
      'Review the agenda or meeting goal',
      'Prepare talking points or questions',
      'Gather any relevant documents or data',
      'Confirm time zone and invite link',
      'Join on time and take notes',
    ],
  },
  {
    pattern: /\b(organise|organize|plan|set up|schedule)\b.*\b(event|party|trip|outing|workshop)\b/i,
    steps: [
      'Define the goal, date, and guest list',
      'Book venue or logistics',
      'Send invitations',
      'Prepare materials or itinerary',
      'Confirm details one day before',
    ],
  },
  {
    pattern: /\b(plan|plan for|prepare)\b.*\b(project|quarter|week|sprint|launch)\b/i,
    steps: [
      'Define goals and success metrics',
      'Break work into milestones',
      'Assign tasks and deadlines',
      'Set up tracking tools',
      'Schedule a check-in or review',
    ],
  },

  // ── Research ──────────────────────────────────────────────────────────────
  {
    pattern: /\b(research|look into|investigate|explore|find out about)\b/i,
    steps: [
      'Define what you want to learn or decide',
      'List 3–5 key questions to answer',
      'Gather sources (articles, docs, experts)',
      'Summarise findings',
      'Make a decision or create an action plan',
    ],
  },

  // ── Errands / Shopping ───────────────────────────────────────────────────
  {
    pattern: /\b(buy|purchase|order|get)\b.*\b(groceries|food|supplies|items|stuff)\b/i,
    steps: [
      'Check what you already have',
      'Write a shopping list',
      'Check for deals or coupons',
      'Buy or order items',
      'Put away and restock',
    ],
  },
  {
    pattern: /\b(clean|tidy|declutter|organise|organize)\b.*\b(room|house|desk|office|space|kitchen|bathroom)\b/i,
    steps: [
      'Remove items that don\'t belong',
      'Declutter and sort into keep/donate/trash',
      'Wipe down surfaces',
      'Vacuum, sweep, or mop',
      'Put everything back in place',
    ],
  },

  // ── Health & Fitness ──────────────────────────────────────────────────────
  {
    pattern: /\b(workout|exercise|train|go to the gym|hit the gym)\b/i,
    steps: [
      'Warm up for 5–10 minutes',
      'Complete main workout routine',
      'Track sets, reps, or duration',
      'Cool down and stretch',
      'Hydrate and log the session',
    ],
  },
  {
    pattern: /\b(meal prep|prep meals|cook for the week)\b/i,
    steps: [
      'Decide on meals for the week',
      'Write an ingredient list',
      'Grocery shop',
      'Cook and portion meals',
      'Label and refrigerate or freeze',
    ],
  },

  // ── Finance ───────────────────────────────────────────────────────────────
  {
    pattern: /\b(do|file|submit|complete|sort out)\b.*\b(taxes|tax return|tax filing)\b/i,
    steps: [
      'Gather income documents (W2, invoices, etc.)',
      'Collect receipts for deductions',
      'Use a tax tool or consult an accountant',
      'Review for accuracy',
      'Submit and save confirmation',
    ],
  },
  {
    pattern: /\b(create|build|set up|review|update)\b.*\b(budget|spending plan|finance)\b/i,
    steps: [
      'List all income sources',
      'Track all monthly expenses',
      'Identify areas to cut or optimise',
      'Set savings or investment targets',
      'Review progress weekly',
    ],
  },

  // ── Study ─────────────────────────────────────────────────────────────────
  {
    pattern: /\b(study|revise|prepare for|review)\b.*\b(exam|test|quiz|assessment)\b/i,
    steps: [
      'Review previous notes and materials',
      'Identify weak areas',
      'Create a revision schedule',
      'Practice with past papers or flashcards',
      'Do a final review the day before',
    ],
  },
  {
    pattern: /\b(complete|do|finish|submit)\b.*\b(assignment|homework|coursework|task)\b/i,
    steps: [
      'Read the requirements carefully',
      'Outline your approach',
      'Complete the main work',
      'Review for quality and correctness',
      'Submit before the deadline',
    ],
  },

  // ── Travel ───────────────────────────────────────────────────────────────
  {
    pattern: /\b(book|plan|organise|organize|arrange)\b.*\b(trip|travel|holiday|vacation|flight|hotel)\b/i,
    steps: [
      'Define destination, dates, and budget',
      'Book flights and accommodation',
      'Plan activities and itinerary',
      'Sort visa, insurance, and documents',
      'Pack and do a final checklist',
    ],
  },

  // ── Job / Career ─────────────────────────────────────────────────────────
  {
    pattern: /\b(apply|apply to|apply for)\b.*\b(job|position|role|internship)\b/i,
    steps: [
      'Research the company and role',
      'Tailor your resume for the position',
      'Write a personalised cover letter',
      'Submit your application',
      'Follow up after 5–7 days if no response',
    ],
  },
];

// ─── Generic Fallback ─────────────────────────────────────────────────────────

function genericBreakdown(taskText: string): string[] {
  const lower = taskText.toLowerCase();

  // Detect broad verbs and give sensible generic steps
  if (/\b(call|phone|ring|contact)\b/i.test(lower)) {
    return [
      'Prepare your key talking points',
      'Find a quiet spot and confirm the contact',
      'Make the call',
      'Take notes on outcomes',
      'Follow up on any action items',
    ];
  }

  if (/\b(read|finish reading)\b/i.test(lower)) {
    return [
      'Set a focused reading session (no distractions)',
      'Read the first section and take brief notes',
      'Summarise key points after each chapter',
      'Highlight or mark important passages',
      'Write a one-paragraph takeaway',
    ];
  }

  return [
    'Define what "done" looks like for this task',
    'Identify the very first action step',
    'Clear any blockers or dependencies',
    'Execute the core work',
    'Review the result and mark complete',
  ];
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Suggest 3–5 subtasks for a given task description.
 * Fully synchronous and free — no external calls.
 */
export async function suggestSubtasks(taskText: string): Promise<string[]> {
  if (!taskText.trim()) return [];

  for (const template of TEMPLATES) {
    if (template.pattern.test(taskText)) {
      return template.steps;
    }
  }

  return genericBreakdown(taskText);
}
