import { z } from 'zod';

export const ID_PATTERNS = {
  initiative: /^INIT-\d{3}$/,
  epic: /^EP-\d{3}$/,
  story: /^US-\d{3}$/,
  adr: /^ADR-\d{3}$/,
  'test-case': /^TC-\d{3}$/,
  sprint: /^SPRINT-\d{2}$/,
} as const;

export const STORY_STATUSES = ['Draft', 'Ready', 'In Progress', 'In Review', 'Done'] as const;
export const RELEASES = ['R1', 'R2', 'R3'] as const;

const ref = (type: keyof typeof ID_PATTERNS) =>
  z.string().regex(ID_PATTERNS[type], `must be a ${type} id`);

const id = (type: keyof typeof ID_PATTERNS) =>
  z.string().regex(ID_PATTERNS[type], `id must match ${ID_PATTERNS[type].source} for type ${type}`);

// YAML turns unquoted 2026-11-02 into a Date; keep dates as YYYY-MM-DD strings.
const isoDate = z.preprocess(
  (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be a YYYY-MM-DD date'),
);

const storyStatus = z.enum(STORY_STATUSES);
const release = z.enum(RELEASES);
const title = z.string().min(1);

const initiative = z.object({
  id: id('initiative'),
  type: z.literal('initiative'),
  title,
  status: z.enum(['Draft', 'Approved']),
});

const epic = z.object({
  id: id('epic'),
  type: z.literal('epic'),
  title,
  parent: ref('initiative'),
  release,
  status: storyStatus,
});

const story = z.object({
  id: id('story'),
  type: z.literal('story'),
  title,
  parent: ref('epic'),
  release,
  sprint: ref('sprint').optional(),
  status: storyStatus,
  points: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(5), z.literal(8), z.literal(13)]).optional(),
  links: z
    .object({
      tests: z.array(ref('test-case')).optional(),
      design: z.array(ref('adr')).optional(),
    })
    .optional(),
});

const adr = z.object({
  id: id('adr'),
  type: z.literal('adr'),
  title,
  status: z.enum(['Proposed', 'Accepted', 'Superseded']),
  stories: z.array(ref('story')),
});

const testCase = z
  .object({
    id: id('test-case'),
    type: z.literal('test-case'),
    title,
    parent: z.array(ref('story')).min(1),
    priority: z.enum(['High', 'Medium', 'Low']),
    testType: z.enum(['functional', 'negative', 'realtime', 'non-functional']),
    automation: z.enum(['automated', 'manual']),
    manualReason: z.string().min(1).optional(),
    status: z.enum(['Draft', 'Ready']),
  })
  .refine((tc) => tc.automation !== 'manual' || tc.manualReason, {
    message: 'manualReason is required when automation is manual',
    path: ['manualReason'],
  });

const sprint = z.object({
  id: id('sprint'),
  type: z.literal('sprint'),
  title,
  release,
  goal: z.string().min(1),
  start: isoDate,
  end: isoDate,
  status: z.enum(['Planned', 'Active', 'Closed']),
});

// Picked by `type` (rather than one z.union) so errors name the missing field, not just "Invalid input".
export const ITEM_SCHEMAS = {
  initiative,
  epic,
  story,
  adr,
  'test-case': testCase,
  sprint,
} as const;

export type Initiative = z.infer<typeof initiative>;
export type Epic = z.infer<typeof epic>;
export type Story = z.infer<typeof story>;
export type Adr = z.infer<typeof adr>;
export type TestCase = z.infer<typeof testCase>;
export type Sprint = z.infer<typeof sprint>;
export type Item = Initiative | Epic | Story | Adr | TestCase | Sprint;
export type ItemType = Item['type'];
export type StoryStatus = (typeof STORY_STATUSES)[number];
export type Release = (typeof RELEASES)[number];
export type LoadedItem = Item & { file: string };
