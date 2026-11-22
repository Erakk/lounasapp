import { z } from 'zod';
import { CATEGORY_IDS, CLUSTERS } from '../data/categories';

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'time must be HH:MM');
export const TimeRangeSchema = z
  .object({ from: time, to: time })
  .refine((r) => r.from < r.to, { message: 'from must be before to' });

export const FORMATS = ['buffet', 'plated', 'salad_main', 'soup', 'by_weight', 'counter'] as const;
export const INCLUDES = ['salad', 'soup', 'bread', 'drink', 'coffee', 'dessert'] as const;
export const DIETS = ['vegan', 'vegetarian', 'gluten_free', 'lactose_free', 'halal'] as const;
export const RISK_REASONS = [
  'spicy',
  'raw_fish',
  'fish_only',
  'vegan_only',
  'single_dish',
  'soup_only',
  'price',
  'theme',
  'meat_heavy',
  'low_rating',
  'queue',
] as const;
export const STATUSES = ['open', 'verify', 'closed'] as const;

const clusterIds = Object.keys(CLUSTERS) as [keyof typeof CLUSTERS, ...(keyof typeof CLUSTERS)[]];

export const PlaceSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  address: z.string().min(1),
  lat: z.number().min(61.45).max(61.55), // inside central Tampere
  lon: z.number().min(23.65).max(23.85),
  distanceM: z.number().int().nonnegative(),
  walkMin: z.number().int().positive(),
  clusterId: z.enum(clusterIds).optional(),
  categories: z.array(z.enum(CATEGORY_IDS)).min(1).max(3),
  format: z.enum(FORMATS),
  price: z.object({
    lunch: z.number().positive().optional(),
    min: z.number().positive().optional(),
    max: z.number().positive().optional(),
    student: z.number().positive().optional(),
    pensioner: z.number().positive().optional(),
    soup: z.number().positive().optional(),
    note: z.string().optional(),
  }),
  priceVerified: z.boolean(),
  includes: z.array(z.enum(INCLUDES)),
  lunchHours: z.record(z.enum(WEEKDAYS), z.array(TimeRangeSchema).min(1)),
  group: z.object({
    comfortMax: z.number().int().min(1).max(100),
    seats: z.number().int().positive().optional(),
    bookingRequiredFrom: z.number().int().positive().optional(),
    acceptsLunchBooking: z.boolean().optional(),
    peakCrowding: z.enum(['low', 'medium', 'high']).optional(),
  }),
  diet: z.array(z.enum(DIETS)),
  dislikeRisk: z.object({ level: z.enum(['L', 'M', 'H']), reasons: z.array(z.enum(RISK_REASONS)) }),
  rating: z.object({ value: z.number().min(0).max(5), count: z.number().int(), source: z.string() }).optional(),
  links: z.object({
    website: z.string().url().optional(),
    lunchList: z.string().url().optional(),
    lunchListQuality: z.enum(['lunch_list', 'lunch_info', 'site']).optional(),
    lunchListSource: z.enum(['own', 'mall', 'aggregator']).optional(),
    lunchListCheckedAt: z.string().optional(),
    phone: z.string().optional(),
  }),
  info: z.array(z.string()),
  status: z.enum(STATUSES),
  verifiedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type Place = z.infer<typeof PlaceSchema>;
export type TimeRange = z.infer<typeof TimeRangeSchema>;
export type Format = (typeof FORMATS)[number];
export type Include = (typeof INCLUDES)[number];
export type Diet = (typeof DIETS)[number];
export type RiskReason = (typeof RISK_REASONS)[number];
