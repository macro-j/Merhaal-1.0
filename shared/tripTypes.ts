import type {
  BudgetTier,
  DestinationCategory,
  InterestTag,
  MealSlot,
} from "./destinationsData";

export type OutputLanguage = "ar" | "en";

export type ArabicBudgetTier = "اقتصادية" | "متوسطة" | "فاخرة";

export const BUDGET_TIER_OPTIONS: ArabicBudgetTier[] = [
  "اقتصادية",
  "متوسطة",
  "فاخرة",
];

export type TripMood =
  | "عريق وتراثي"
  | "ترند ولايف ستايل"
  | "استرخاء وطبيعة"
  | "حيوية وترفيه";

export const TRIP_MOOD_OPTIONS: TripMood[] = [
  "عريق وتراثي",
  "ترند ولايف ستايل",
  "استرخاء وطبيعة",
  "حيوية وترفيه",
];

export interface GenerateTripParams {
  destination: string;
  durationDays: number;
  budgetTier: ArabicBudgetTier;
  totalBudgetSAR?: number;
  accommodationType?: ArabicBudgetTier;
  travelerCount: number;
  interests: TripMood[];
  language: OutputLanguage;
  startDate?: string;
}

export type TripActivityTime = "الصباح" | "الظهر" | "المساء";

export interface TripActivity {
  id: string;
  placeId: string;
  activityType: DestinationCategory;
  mealSlot?: Exclude<MealSlot, "قهوة" | "لا ينطبق">;
  time: TripActivityTime;
  startTime: string;
  endTime: string;
  title: string;
  description: string;
  reason: string;
  locationName: string;
  bookingSearchQuery: string;
  estimatedCostSAR?: number | null;
}

export interface TripDay {
  dayNumber: number;
  date?: string;
  title?: string;
  description?: string;
  activities: TripActivity[];
}

export interface TripHotel {
  name: string;
  description: string;
  bookingUrl: string;
}

export interface TripQualityBreakdown {
  interestMatch: number;
  budgetMatch: number;
  diversity: number;
  noDuplicates: number;
  dailyBalance: number;
  mealsCompliance: number;
  timeConsistency: number;
  knowledgeBaseCoverage: number;
}

export interface TripQuality {
  score: number;
  breakdown: TripQualityBreakdown;
}

export interface TripMetadata {
  generatedAt: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  engineVersion: "1.0";
}

export interface TripPreferences {
  budgetTier: ArabicBudgetTier;
  resolvedBudgetTier: BudgetTier;
  totalBudgetSAR: number;
  travelerCount: number;
  perPersonBudgetSAR: number;
  dailyPerPersonBudgetSAR: number;
  /** Kept only when reading plans generated before travelerCount was introduced. */
  mealsPerDay?: 2 | 3;
  interests: TripMood[];
  interestTags: InterestTag[];
  language: OutputLanguage;
}

export interface GeneratedTripPlan {
  id: string;
  title: string;
  destination: string;
  metadata: TripMetadata;
  preferences: TripPreferences;
  days: TripDay[];
  warnings: string[];
  quality: TripQuality;
  hotel?: TripHotel;
}

export type PlanningErrorCode =
  | "INVALID_INPUT"
  | "UNSUPPORTED_DESTINATION"
  | "INSUFFICIENT_KNOWLEDGE"
  | "PLAN_VALIDATION_FAILED"
  | "AI_UNAVAILABLE"
  | "AI_INVALID_RESPONSE"
  | "INTERNAL_ERROR";

export interface PlanningErrorPayload {
  error: {
    code: PlanningErrorCode;
    message: string;
    details?: string[];
  };
}
