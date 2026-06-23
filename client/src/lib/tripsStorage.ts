import type { GeneratedTripPlan } from "@/lib/llm";

export const TRIPS_STORAGE_KEY = "merhaal_trips";

export interface SavedTrip extends GeneratedTripPlan {
  id: string;
  createdAt: string;
  budgetTier: string;
  totalBudgetSAR?: number;
  mealsPerDay?: 2 | 3;
  interests: string[];
  startDate?: string;
  dayCount: number;
}

export function getSavedTrips(): SavedTrip[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(TRIPS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTrip(trip: SavedTrip): void {
  const trips = getSavedTrips();
  trips.unshift(trip);
  localStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(trips));
}

export function deleteTrip(tripId: string): void {
  const trips = getSavedTrips().filter((t) => t.id !== tripId);
  localStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(trips));
}
