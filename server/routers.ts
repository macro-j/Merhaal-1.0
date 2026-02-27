import { TRPCError } from "@trpc/server";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN = "7d";

/**
 * Parse duration string to minutes
 * Supports formats: "2 ساعة", "90 دقيقة", "1.5 ساعة"
 * Defaults to 90 minutes if invalid or missing
 */
function parseDurationToMinutes(duration?: string): number {
  if (!duration || typeof duration !== 'string') return 90;

  const durationLower = duration.toLowerCase().trim();

  // Match "X ساعة" (hours in Arabic)
  const hoursMatch = durationLower.match(/^([\d.]+)\s*(?:ساعة|sa'ah|hour)/i);
  if (hoursMatch) {
    const hours = parseFloat(hoursMatch[1]);
    if (!isNaN(hours)) return Math.round(hours * 60);
  }

  // Match "X دقيقة" (minutes in Arabic)
  const minutesMatch = durationLower.match(/^([\d.]+)\s*(?:دقيقة|daqiqah|minute)/i);
  if (minutesMatch) {
    const minutes = parseFloat(minutesMatch[1]);
    if (!isNaN(minutes)) return Math.round(minutes);
  }

  return 90;
}

/**
 * Convert minutes since midnight to HH:MM format
 */
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Derive period from time (HH:MM format)
 * صباحًا (morning): before 12:00
 * ظهرًا (afternoon): 12:00–16:00
 * مساءً (evening): after 16:00
 */
// 🔥 Period rules: منع أنشطة غير مناسبة حسب الوقت
function isActivityAllowedInPeriod(activity: any, period: string): boolean {
  const name = (activity.name || '').toString();
  const category = (activity.category || '').toString();

  const isAdventure =
    category.includes('مغام') ||
    name.includes('حافة العالم');

  const isMuseumLike =
    category.includes('سيا') ||
    category.includes('ثق') ||
    name.includes('متحف') ||
    name.includes('قصر');

  const isMallEntertainment =
    category.includes('تسو') ||
    category.includes('ترفي') ||
    name.includes('مول') ||
    name.includes('بوليفارد') ||
    name.includes('واجهة');

  // صباحًا: امنع مغامرات بعيدة (مثل حافة العالم)
  if (period === 'صباحًا') {
    if (isAdventure) return false;
    return true;
  }

  // ظهرًا: عادي كل شيء
  if (period === 'ظهرًا') {
    return true;
  }

  // مساءً: امنع المتاحف/التراث + امنع المغامرات البعيدة
  if (period === 'مساءً') {
    if (isMuseumLike) return false;
    if (isAdventure) return false;
    return true;
  }

  return true;
}

/**
 * Derive period from time (HH:MM format)
 * صباحًا (morning): before 12:00
 * ظهرًا (afternoon): 12:00–16:00
 * مساءً (evening): after 16:00
 */
function derivePeriod(time: string): string {
  const [hoursStr] = time.split(':');
  const hours = parseInt(hoursStr, 10);

  if (hours < 12) return 'صباحًا';
  if (hours < 16) return 'ظهرًا';
  return 'مساءً';
}

/**
 * Parse accommodation price range to min/max values
 * Supports formats: "1200–2500", "1200-2500", "1200"
 * Returns { min, max } or empty object if invalid/missing
 */
function parsePriceRangeToMinMax(priceRange?: string): { min?: number; max?: number } {
  if (!priceRange || typeof priceRange !== 'string') return {};

  const trimmed = priceRange.trim();

  // Try to match range: "1200–2500" or "1200-2500"
  const rangeMatch = trimmed.match(/(\d+)\s*[–-]\s*(\d+)/);
  if (rangeMatch) {
    const min = parseInt(rangeMatch[1], 10);
    const max = parseInt(rangeMatch[2], 10);
    return { min, max };
  }

  // Try to match single number
  const singleMatch = trimmed.match(/(\d+)/);
  if (singleMatch) {
    const price = parseInt(singleMatch[1], 10);
    return { min: price, max: price };
  }

  return {};
}

/**
 * Estimate activity cost from cost text or budget level
 * Supports formats: "150–400", "150-400", "150", or empty
 * If costText contains a range, returns average.
 * If empty, uses budgetLevel: low=25, medium=75, high=200
 * Special case: "0–400" (shopping) → moderate estimate (150) unless budgetLevel is low/high
 */
function estimateCost(costText?: string, budgetLevel?: string): number {
  // Fallback budget level values
  const budgetLevelDefaults: { [key: string]: number } = {
    low: 25,
    medium: 75,
    high: 200,
  };

  if (!costText || typeof costText !== 'string' || costText.trim() === '') {
    // Use budget level as fallback
    const level = (budgetLevel || 'medium').toLowerCase();
    return budgetLevelDefaults[level] || 75;
  }

  const trimmed = costText.trim();

  // Try to match range: "150–400" or "150-400"
  const rangeMatch = trimmed.match(/(\d+)\s*[–-]\s*(\d+)/);
  if (rangeMatch) {
    const num1 = parseInt(rangeMatch[1], 10);
    const num2 = parseInt(rangeMatch[2], 10);
    
    // Special case: "0–X" might mean flexible/shopping → moderate estimate
    if (num1 === 0) {
      const level = (budgetLevel || 'medium').toLowerCase();
      if (level === 'low') return 25;
      if (level === 'high') return num2 * 0.5; // e.g., 0–400 → 200
      return 150; // moderate estimate for shopping
    }

    return Math.round((num1 + num2) / 2);
  }

  // Try to match single number
  const singleMatch = trimmed.match(/(\d+)/);
  if (singleMatch) {
    return parseInt(singleMatch[1], 10);
  }

  // Fallback to budget level
  const level = (budgetLevel || 'medium').toLowerCase();
  return budgetLevelDefaults[level] || 75;
}

/**
 * Check if a time window is available (no overlap with existing activities)
 * Returns true if the proposed time block does not overlap with any scheduled activity
 */
function isTimeWindowAvailable(
  dayActivities: Array<any>,
  windowStartMinutes: number,
  windowEndMinutes: number
): boolean {
  return !dayActivities.some(act => {
    const actStart = parseInt(act.startTime.split(':')[0]) * 60 + parseInt(act.startTime.split(':')[1]);
    const actEnd = parseInt(act.endTime.split(':')[0]) * 60 + parseInt(act.endTime.split(':')[1]);
    
    // Check for overlap
    return !(windowEndMinutes <= actStart || windowStartMinutes >= actEnd);
  });
}

/**
 * Find an available time slot within a meal window that doesn't overlap with existing activities
 * Returns { startMinutes, endMinutes } or null if no slot available
 */
function findAvailableSlotInWindow(
  dayActivities: Array<any>,
  windowStartMinutes: number,
  windowEndMinutes: number,
  durationMinutes: number
): { startMinutes: number; endMinutes: number } | null {
  // Try the ideal window start time first
  if (isTimeWindowAvailable(dayActivities, windowStartMinutes, windowStartMinutes + durationMinutes)) {
    return { startMinutes: windowStartMinutes, endMinutes: windowStartMinutes + durationMinutes };
  }

  // Scan for available slots within the window (every 15 minutes)
  for (let tryStart = windowStartMinutes; tryStart + durationMinutes <= windowEndMinutes; tryStart += 15) {
    if (isTimeWindowAvailable(dayActivities, tryStart, tryStart + durationMinutes)) {
      return { startMinutes: tryStart, endMinutes: tryStart + durationMinutes };
    }
  }

  return null;
}

/**
 * Check if a restaurant has a specific meal tag in its specialties array.
 * mealTags are stored as "meal:breakfast", "meal:lunch", "meal:dinner", "meal:cafe".
 */
function hasMealTag(restaurant: any, mealType: string): boolean {
  const specs: any[] = Array.isArray(restaurant.specialties) ? restaurant.specialties : [];
  const target = `meal:${mealType}`;
  return specs.some((s: string) => typeof s === 'string' && s.toLowerCase() === target);
}

/**
 * Find an affordable restaurant from the restaurants table.
 * Priority order per meal slot:
 *   1) Restaurants tagged with meal:<mealType> via mealTags import column
 *   2) For breakfast: keyword matching on name/cuisine/trending (cafe, فطور, etc.)
 *   3) Any remaining restaurant (generic fallback)
 * Returns { restaurant, isBreakfastSpecific } so callers can apply price scaling.
 */
function findAffordableRestaurant(
  candidates: Array<any>,
  mealType: 'breakfast' | 'lunch' | 'dinner',
  maxCost: number,
  usedIds: Set<number>,
  budgetPriceRange?: string
): { restaurant: any; isBreakfastSpecific: boolean } | null {

let available = candidates.filter(r => !usedIds.has(r.id));

// إذا ما فيه خيارات غير مستخدمة → اسمح بإعادة الاستخدام
if (available.length === 0) {
 available = candidates.filter(r => hasMealTag(r, 'breakfast') || hasMealTag(r, 'cafe'));

}

if (available.length === 0) return null;



  if (available.length === 0) return null;

  if (budgetPriceRange) {
    const priceFiltered = available.filter(r => r.priceRange === budgetPriceRange);
    if (priceFiltered.length > 0) available = priceFiltered;
  }

  let isBreakfastSpecific = false;

  // 1️⃣ أولاً: فلترة حسب meal_tags
  const taggedForMeal = available.filter(r =>
    hasMealTag(r, mealType) ||
    (mealType === 'breakfast' && hasMealTag(r, 'cafe'))
  );

  if (taggedForMeal.length > 0) {
    available = taggedForMeal;
    if (mealType === 'breakfast') isBreakfastSpecific = true;
  } 
  else if (mealType === 'breakfast') {
    // 2️⃣ fallback للفطور فقط (كلمات مفتاحية)
    const breakfastKeywords = [
      'فطور', 'إفطار', 'breakfast',
      'كافيه', 'مقهى', 'cafe', 'coffee',
      'bakery', 'مخبز', 'حلويات', 'patisserie', 'brunch'
    ];

    const preferred = available.filter(r => {
      const text = `${r.cuisine || ''} ${r.trending || ''} ${r.name || ''}`.toLowerCase();
      return breakfastKeywords.some(kw => text.includes(kw.toLowerCase()));
    });

    if (preferred.length > 0) {
      available = preferred;
      isBreakfastSpecific = true;
    } else {
      // ❌ أهم سطر: لا نرجع مطعم عشاء كفطور
      return null;
    }
  }

  // 3️⃣ حاول اختيار مطعم ضمن الميزانية
for (const restaurant of available) {
  const cost = parseFloat(restaurant.avgPrice) || 0;
  if (cost > 0 && cost <= maxCost) {
    return { restaurant, isBreakfastSpecific };
  }
}

// ✅ إذا فطور وما لقينا ضمن الميزانية → اختر الأرخص
if (mealType === 'breakfast' && available.length > 0) {
  const sorted = available
    .map(r => ({
      r,
      cost: parseFloat(r.avgPrice) || 9999
    }))
    .sort((a, b) => a.cost - b.cost);

  return { restaurant: sorted[0].r, isBreakfastSpecific: true };
}


  // ❌ لا نسوي fallback عشوائي للفطور أبداً
  if (mealType === 'breakfast') return null;

  // ✔ الغداء والعشاء ممكن fallback
  if (available.length > 0) {
    return { restaurant: available[0], isBreakfastSpecific };
  }

  return null;
}


export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    register: publicProcedure
      .input(z.object({
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(6),
        phone: z.string().optional(),
        city: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Check if user exists
        const existingUser = await db.getUserByEmail(input.email);
        if (existingUser) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'البريد الإلكتروني مسجل مسبقًا',
          });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(input.password, 10);

        // Create user
        const result = await db.createUser({
          name: input.name,
          email: input.email,
          password: hashedPassword,
          phone: input.phone || null,
          city: input.city || null,
          role: 'user',
          tier: 'free',
        });

        // Generate JWT
        const token = jwt.sign(
          { userId: result.id, email: input.email },
          JWT_SECRET,
          { expiresIn: JWT_EXPIRES_IN }
        );

        return {
          success: true,
          token,
          user: {
            id: result.id,
            name: input.name,
            email: input.email,
            role: 'user',
            tier: 'free',
            city: input.city || null,
          },
        };
      }),

    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string(),
        rememberMe: z.boolean().optional().default(false),
      }))
      .mutation(async ({ input }) => {
        // Find user
        const user = await db.getUserByEmail(input.email);
        if (!user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
          });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(input.password, user.password);
        if (!isValidPassword) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
          });
        }

        // Update last sign in
        await db.updateUserLastSignIn(user.id);

        // Generate JWT with dynamic expiry based on rememberMe
        const tokenExpiry = input.rememberMe ? '30d' : '1d';
        const token = jwt.sign(
          { userId: user.id, email: user.email },
          JWT_SECRET,
          { expiresIn: tokenExpiry }
        );

        return {
          success: true,
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            tier: user.tier,
            phone: user.phone,
            city: user.city,
          },
        };
      }),

    me: publicProcedure.query(async ({ ctx }) => {
      // Get token from header
      const authHeader = ctx.req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
      }

      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
        const user = await db.getUserById(decoded.userId);
        
        if (!user) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          tier: user.tier,
          phone: user.phone,
          city: user.city,
        };
      } catch (error) {
        return null;
      }
    }),

    logout: publicProcedure.mutation(() => {
      return { success: true };
    }),
  }),

  destinations: router({
    list: publicProcedure.query(async () => {
      return await db.getAllDestinations();
    }),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getDestinationById(input.id);
      }),
    
    getByName: publicProcedure
      .input(z.object({ name: z.string() }))
      .query(async ({ input }) => {
        return await db.getDestinationByName(input.name);
      }),
    
    getActivities: publicProcedure
      .input(z.object({ destinationId: z.number() }))
      .query(async ({ input }) => {
        return await db.getActivitiesByDestination(input.destinationId);
      }),

    getActivitiesByIds: publicProcedure
      .input(z.object({ ids: z.array(z.number()) }))
      .query(async ({ input }) => {
        return await db.getActivitiesByIds(input.ids);
      }),
    
    getAccommodations: publicProcedure
      .input(z.object({ destinationId: z.number() }))
      .query(async ({ input }) => {
        return await db.getAccommodationsByDestination(input.destinationId);
      }),
    
    getRestaurants: publicProcedure
      .input(z.object({ destinationId: z.number() }))
      .query(async ({ input }) => {
        return await db.getRestaurantsByDestination(input.destinationId);
      }),
  }),

  trips: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      // Get user from token
      const authHeader = ctx.req.headers.authorization;
      if (!authHeader) throw new TRPCError({ code: 'UNAUTHORIZED' });
      
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      
      return await db.getUserTrips(decoded.userId);
    }),
    
    create: protectedProcedure
      .input(z.object({
        destinationId: z.number(),
        days: z.number().min(1),
        budget: z.number().min(0),
        interests: z.array(z.string()),
        accommodationType: z.string().optional(),
        startDate: z.string().optional(),
        mealsPerDay: z.number().min(2).max(3).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Get user from token
        const authHeader = ctx.req.headers.authorization;
        if (!authHeader) throw new TRPCError({ code: 'UNAUTHORIZED' });
        
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
        const user = await db.getUserById(decoded.userId);
        
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        // Check tier limits
        const userTier = user.tier || 'free';
        const tierLimits = {
          free: { maxDays: 1, maxTrips: 1, maxActivitiesPerDay: 3 },
          smart: { maxDays: 10, maxTrips: 3, maxActivitiesPerDay: 5 },
          professional: { maxDays: 999, maxTrips: 999, maxActivitiesPerDay: 8 },
        };
        const limits = tierLimits[userTier as keyof typeof tierLimits];

        // Check day limit
        if (input.days > limits.maxDays) {
          throw new TRPCError({ 
            code: 'FORBIDDEN', 
            message: `باقتك الحالية تسمح بـ ${limits.maxDays} أيام كحد أقصى. قم بترقية باقتك للمزيد!` 
          });
        }

        // Check trip count limit
        const existingTrips = await db.getUserTrips(decoded.userId);
        if (existingTrips.length >= limits.maxTrips) {
          throw new TRPCError({ 
            code: 'FORBIDDEN', 
            message: `باقتك الحالية تسمح بـ ${limits.maxTrips} رحلات محفوظة. قم بترقية باقتك أو احذف رحلة قديمة!` 
          });
        }

        // Generate trip plan
        const destination = await db.getDestinationById(input.destinationId);
        if (!destination) {
          throw new Error('Destination not found');
        }

        const activities = await db.getActivitiesByDestination(input.destinationId);
        const accommodations = await db.getAccommodationsByDestination(input.destinationId);
        const restaurants = await db.getRestaurantsByDestination(input.destinationId);

        // Budget distribution
        const dailyBudget = input.budget / input.days;
        const budgetDistribution = {
          accommodation: dailyBudget * 0.40,
          activities: dailyBudget * 0.35,
          food: dailyBudget * 0.25,
        };

        // Determine quality level
        let qualityLevel: 'اقتصادية' | 'متوسطة' | 'عالية';
        if (dailyBudget < 500) {
          qualityLevel = 'اقتصادية';
        } else if (dailyBudget < 1000) {
          qualityLevel = 'متوسطة';
        } else {
          qualityLevel = 'عالية';
        }
// 🎯 تحديد عدد الوجبات حسب مستوى الجودة
const mealsPerDay =
  input.mealsPerDay ??
  (qualityLevel === 'عالية' ? 3 : qualityLevel === 'متوسطة' ? 2 : 1);

// نضيف وجبات فقط إذا فيه مطاعم كافية
const shouldAddMeals = restaurants.length >= input.days * mealsPerDay;

// نطاق سعر المطاعم حسب الجودة
const restaurantPriceRange =
  qualityLevel === 'عالية' ? 'فاخر'
  : qualityLevel === 'متوسطة' ? 'متوسط'
  : 'اقتصادي';


const usedRestaurantIds = new Set<number>();


        // Select accommodation early to compute remaining budget
        const preferredClass = input.accommodationType === 'فاخر' ? 'luxury' : 
                              input.accommodationType === 'اقتصادي' ? 'economy' : 'mid';
        
        // Try classes in fallback order: luxury -> mid -> economy
        const classOrderByPreference: Array<'luxury' | 'mid' | 'economy'> = ['luxury', 'mid', 'economy'];
        const preferredIndex = classOrderByPreference.indexOf(preferredClass);
        const orderedClasses = classOrderByPreference.slice(preferredIndex).concat(classOrderByPreference.slice(0, preferredIndex));
        // ✅ Keep budget for experiences (meals + activities) after accommodation
const MIN_REMAINING_AFTER_STAY = Math.max(120, Math.floor(dailyBudget * 0.20)); // 20% or at least 120 SAR
const maxAffordableNight = Math.max(dailyBudget - MIN_REMAINING_AFTER_STAY, 0);

        let selectedAccommodation: any = null;
        let accommodationSelectionNote: string | null = null;
        
        // Try each class in order, checking affordability
        for (const classToTry of orderedClasses) {
          const candidateAccommodations = accommodations.filter(a => a.class === classToTry && a.isActive);
          
          for (const accommodation of candidateAccommodations) {
            const priceInfo = parsePriceRangeToMinMax(accommodation.priceRange || undefined);
            
// ✅ If we have price info, ensure we keep room for meals/activities
if (priceInfo.min !== undefined) {
  if (priceInfo.min > maxAffordableNight) {
    continue;
  }
}

            
            // Found an affordable accommodation
            selectedAccommodation = accommodation;
            
            // Generate selection note if we fell back to a cheaper class
            if (classToTry !== preferredClass) {
              const classLabels: { [key: string]: string } = {
                'luxury': 'فاخرة',
                'mid': 'متوسطة',
                'economy': 'اقتصادية',
              };
              const preferredLabel = classLabels[preferredClass];
              const selectedLabel = classLabels[classToTry];
              accommodationSelectionNote = `تم اختيار إقامة ${selectedLabel} لأن الميزانية اليومية (${dailyBudget} ر.س) لا تناسب إقامة ${preferredLabel}.`;
            }
            
            break;
          }
          
          if (selectedAccommodation) break;
        }
        
        // Calculate accommodation costs
        let accommodationMinPricePerNight: number | null = null;
        let accommodationAvgPricePerNight: number | null = null;
        
        if (selectedAccommodation) {
          const priceInfo = parsePriceRangeToMinMax(selectedAccommodation.priceRange || undefined);
          if (priceInfo.min !== undefined) {
            accommodationMinPricePerNight = priceInfo.min;
          }
          if (priceInfo.min !== undefined && priceInfo.max !== undefined) {
            accommodationAvgPricePerNight = Math.round((priceInfo.min + priceInfo.max) / 2);
          }
        }
        
        // Compute daily budget breakdown
        const accommodationCostPerNight = accommodationMinPricePerNight ?? 0;
        const remainingAfterAccommodation = Math.max(dailyBudget - accommodationCostPerNight, 0);

        // Filter activities by tier and budget
        let filteredActivities = activities.filter(activity => {
          const activityTier = activity.minTier || 'free';
          let tierAllowed = false;
          if (userTier === 'professional') tierAllowed = true;
          else if (userTier === 'smart' && (activityTier === 'free' || activityTier === 'smart')) tierAllowed = true;
          else if (userTier === 'free' && activityTier === 'free') tierAllowed = true;

          const activityCost = parseFloat(activity.cost || '0');
          const activityBudgetLevel = activity.budgetLevel || 'medium';
          let budgetAllowed = true;
          if (qualityLevel === 'اقتصادية') {
            budgetAllowed = activityCost === 0 || activityBudgetLevel === 'low';
          } else if (qualityLevel === 'متوسطة') {
            budgetAllowed = activityCost <= 100 || activityBudgetLevel !== 'high';
          }

          return tierAllowed && budgetAllowed;
        });

        // Filter by interests if provided (match against type, category, and tags)
        if (input.interests.length > 0) {
          const categoryMap: { [key: string]: string[] } = {
            'مطاعم': ['طعام', 'مطاعم', 'food'],
            'تسوق': ['تسوق', 'shopping'],
            'طبيعة': ['طبيعة', 'nature', 'منتزهات'],
            'ثقافة': ['ثقافة', 'culture', 'متاحف', 'تراث'],
            'مغامرات': ['مغامرات', 'adventure', 'رياضة'],
            'ترفيه': ['ترفيه', 'entertainment'],
            'عائلي': ['عائلي', 'family'],
          };
          
          const interestFiltered = filteredActivities.filter(activity => {
            const activityTags = activity.tags || [];
            return input.interests.some(interest => {
              const relatedTerms = categoryMap[interest] || [interest];
              return relatedTerms.some(term =>
                activity.type?.includes(term) ||
                activity.category?.includes(term) ||
                activityTags.some((tag: string) => tag.includes(term))
              );
            });
          });
          if (interestFiltered.length >= input.days * 2) {
            filteredActivities = interestFiltered;
          }
        }

        // Apply budget-based activity filtering based on remaining budget after accommodation
        let budgetActivityNote: string | null = null;
        if (remainingAfterAccommodation < 150) {
          // Restrict activities based on remaining budget
          if (remainingAfterAccommodation < 50) {
            // Only allow free/low budget activities
            filteredActivities = filteredActivities.filter(activity => {
              const budgetLevel = activity.budgetLevel || 'medium';
              const cost = parseFloat(activity.cost || '0');
              return budgetLevel === 'low' || cost === 0;
            });
            budgetActivityNote = 'تم تقييد الأنشطة لتناسب المتبقي بعد السكن.';
          } else {
            // Allow low + medium, exclude high
            filteredActivities = filteredActivities.filter(activity => {
              const budgetLevel = activity.budgetLevel || 'medium';
              return budgetLevel !== 'high';
            });
            budgetActivityNote = 'تم تقييد الأنشطة لتناسب المتبقي بعد السكن.';
          }
        }

        // Exclude restaurant/food-category activities ALWAYS when restaurants exist
        // This prevents duplicate dining entries (one from activities table + one from restaurants table)
        const restaurantCategories = ['مطاعم', 'طعام', 'food', 'restaurant', 'cafe', 'مقاهي', 'كافيه'];
        const isRestaurantActivity = (activity: any): boolean => {
          const cat = (activity.category || '').toLowerCase();
          const typ = (activity.type || '').toLowerCase();
          return restaurantCategories.some(rc => cat.includes(rc) || typ.includes(rc));
        };
        const excludedRestaurantActivityCount = filteredActivities.filter(isRestaurantActivity).length;
        if (restaurants.length > 0) {
          filteredActivities = filteredActivities.filter(a => !isRestaurantActivity(a));
        }

        // FINAL SAFETY BLOCK: If accommodation exhausted daily budget and no activities found, provide free alternatives
        if (remainingAfterAccommodation <= 0 && filteredActivities.length === 0) {
          // Try to find real free activities from the original DB list
          const freePool = activities.filter(activity => {
            const budgetLevel = activity.budgetLevel || 'medium';
            const cost = parseFloat(activity.cost || '0');
            const category = activity.category || '';
            const typ = (activity.type || '').toLowerCase();
            
            const isFreeEligible = budgetLevel === 'low' || cost === 0 || ['طبيعة', 'تراث', 'ثقافة'].includes(category);
            return isFreeEligible && !isRestaurantActivity(activity);
          });
          
          if (freePool.length > 0) {
            // Use real free activities
            filteredActivities = freePool;
          } else {
            // Create simple free placeholder activities
            const placeholders = [
              { nameAr: 'مشي حر في ممشى قريب', nameEn: 'Walk in nearby promenade', category: 'طبيعة' },
              { nameAr: 'زيارة حديقة عامة (مجاني)', nameEn: 'Visit public park (free)', category: 'طبيعة' },
              { nameAr: 'جولة تصوير خارجية لمعالم المدينة (مجاني)', nameEn: 'Free outdoor photography tour of landmarks', category: 'تراث' },
              { nameAr: 'استكشاف الأسواق التقليدية المحلية (مجاني)', nameEn: 'Explore local traditional markets (free)', category: 'ثقافة' },
              { nameAr: 'مشاهدة المناظر الطبيعية من نقطة ارتفاع (مجاني)', nameEn: 'View natural scenery from a viewpoint (free)', category: 'طبيعة' },
              { nameAr: 'زيارة مكتبة عامة أو متحف بدخول مجاني', nameEn: 'Visit free public library or museum', category: 'ثقافة' },
            ];
            
            placeholders.forEach((placeholder, idx) => {
              filteredActivities.push({
                id: -(1000 + idx),
                destinationId: input.destinationId,
                nameAr: placeholder.nameAr,
                nameEn: placeholder.nameEn,
                descriptionAr: `نشاط مجاني في ${destination.nameAr}`,
                descriptionEn: `Free activity in ${destination.nameEn}`,
                type: placeholder.category,
                category: placeholder.category,
                duration: '1 ساعة',
                cost: '0',
                budgetLevel: 'low',
                minTier: 'free',
                rating: 4,
                reviews: 50,
              } as any);
            });
          }
          
          budgetActivityNote = 'تمت إضافة أنشطة مجانية لأن ميزانية اليوم تذهب للسكن.';
        }

        const hadActivitiesBeforeBudgetFilter = filteredActivities.length > 0;

        // DETECT LOW-BUDGET MODE: If accommodation leaves little for activities
        // Calculate the minimum cost of a paid activity to detect low-budget threshold
        let cheapestPaidActivityCost = Infinity;
        for (const activity of filteredActivities) {
          const cost = estimateCost(activity.cost || undefined, activity.budgetLevel || undefined);
          if (cost > 0 && cost < cheapestPaidActivityCost) {
            cheapestPaidActivityCost = cost;
          }
        }
        // If no paid activities exist, use a reasonable default threshold (50 SAR)
        if (cheapestPaidActivityCost === Infinity) {
          cheapestPaidActivityCost = 50;
        }
        
        const isLowBudgetAfterStay = remainingAfterAccommodation < cheapestPaidActivityCost;

        // Fallback: generate placeholder activities if DB is empty
        if (filteredActivities.length === 0 && !hadActivitiesBeforeBudgetFilter) {
          const fallbackActivitiesPerDay = userTier === 'professional' ? 7 : userTier === 'smart' ? 4 : 2;
          const fallbackTemplates = [
            { name: `زيارة معالم ${destination.nameAr}`, type: 'سياحة', period: 'صباحًا' },
            { name: `جولة في أسواق ${destination.nameAr}`, type: 'تسوق', period: 'ظهرًا' },
            { name: `استكشاف المتاحف المحلية`, type: 'ثقافة', period: 'عصرًا' },
            { name: `تناول العشاء في مطعم محلي`, type: 'طعام', period: 'مساءً' },
            { name: `جولة مشي في الحي التاريخي`, type: 'سياحة', period: 'صباحًا' },
            { name: `زيارة الحدائق والمتنزهات`, type: 'طبيعة', period: 'ظهرًا' },
            { name: `تجربة المأكولات الشعبية`, type: 'طعام', period: 'عصرًا' },
            { name: `مشاهدة غروب الشمس`, type: 'طبيعة', period: 'مساءً' },
          ];
          
          for (let i = 0; i < input.days * fallbackActivitiesPerDay; i++) {
            const template = fallbackTemplates[i % fallbackTemplates.length];
            filteredActivities.push({
              id: -i,
              destinationId: input.destinationId,
              name: template.name,
              type: template.type,
              details: `استمتع بتجربة فريدة في ${destination.nameAr}`,
              duration: '2 ساعة',
              cost: '0',
              minTier: 'free',
            } as any);
          }
        }

        // Dynamic time-aware scheduling
        const dayTitles = ['اليوم الأول', 'اليوم الثاني', 'اليوم الثالث', 'اليوم الرابع', 'اليوم الخامس', 'اليوم السادس', 'اليوم السابع', 'اليوم الثامن', 'اليوم التاسع', 'اليوم العاشر'];
        
        // Enforce tier-based activity limit per day (minimum 3, maximum based on tier)
        // But if accommodation exhausted budget, limit to 1-2 free activities
        const usedActivityIds = new Set<number>();
        const shuffleFn = (arr: any[]) => [...arr].sort(() => Math.random() - 0.5);
        let allShuffled = shuffleFn(filteredActivities);

        const plan: Array<any> = [];
        let remainingTripBudget = input.budget;


        const MIN_ACTIVITIES_PER_DAY = 3;
const MAX_ITEMS_PER_DAY =
  qualityLevel === 'عالية' ? 6 :
  qualityLevel === 'متوسطة' ? 6 : 8;

        console.log(`[PlanGen] availableActivities=${filteredActivities.length}, excludedRestaurantActivities=${excludedRestaurantActivityCount}, restaurants=${restaurants.length}, mealsPerDay=${mealsPerDay}`);

        const mealLabels: Record<string, { ar: string; en: string }> = {
          breakfast: { ar: 'إفطار', en: 'Breakfast' },
          lunch:     { ar: 'غداء', en: 'Lunch' },
          dinner:    { ar: 'عشاء', en: 'Dinner' },
        };

        type SlotType = 'activity' | 'meal';
        interface DaySlot {
          type: SlotType;
          mealType?: 'breakfast' | 'lunch' | 'dinner';
          start: number;
          end: number;
        }

        const buildDayTemplate = (meals: number): DaySlot[] => {
          if (meals === 3) {
            return [
              { type: 'meal',     mealType: 'breakfast', start: 8 * 60,        end: 9 * 60 },        // 08:00–09:00
              { type: 'activity',                        start: 9 * 60 + 30,   end: 11 * 60 },       // 09:30–11:00
              { type: 'activity',                        start: 11 * 60 + 15,  end: 12 * 60 + 15 },  // 11:15–12:15
              { type: 'meal',     mealType: 'lunch',     start: 12 * 60 + 30,  end: 13 * 60 + 30 },  // 12:30–13:30
              { type: 'activity',                        start: 14 * 60,       end: 15 * 60 + 30 },  // 14:00–15:30
              { type: 'activity',                        start: 16 * 60,       end: 17 * 60 + 30 },  // 16:00–17:30
              { type: 'meal',     mealType: 'dinner',    start: 19 * 60,       end: 20 * 60 },       // 19:00–20:00
              { type: 'activity',                        start: 20 * 60 + 30,  end: 22 * 60 },       // 20:30–22:00
            ];
          }
          return [
            { type: 'activity',                        start: 9 * 60,        end: 10 * 60 + 30 },  // 09:00–10:30
            { type: 'activity',                        start: 10 * 60 + 45,  end: 12 * 60 },       // 10:45–12:00
            { type: 'meal',     mealType: 'lunch',     start: 12 * 60 + 30,  end: 13 * 60 + 30 },  // 12:30–13:30
            { type: 'activity',                        start: 14 * 60,       end: 15 * 60 + 30 },  // 14:00–15:30
            { type: 'activity',                        start: 16 * 60,       end: 17 * 60 + 30 },  // 16:00–17:30
            { type: 'meal',     mealType: 'dinner',    start: 19 * 60,       end: 20 * 60 },       // 19:00–20:00
            { type: 'activity',                        start: 20 * 60 + 30,  end: 22 * 60 },       // 20:30–22:00
          ];
        };

        const categoryFallbackCosts: { [key: string]: number } = {
          'مطاعم': 80, 'ترفيه': 60, 'تسوق': 100, 'ثقافة': 30,
          'تراث': 20, 'طبيعة': 10, 'مغامرات': 120, 'عائلي': 50,
        };

        const getActivityCost = (activity: any): number => {
          let cost = estimateCost(activity.cost, activity.budgetLevel || undefined);
          if (!cost || cost === 0) {
            const category = activity.category || activity.type || '';
            cost = categoryFallbackCosts[category] || 40;
          }
          return cost;
        };
// ✅ Helper: هل النشاط مناسب للفترة الزمنية؟
function isActivityAllowedInPeriod(activity: any, period: string): boolean {
  // إذا ما عنده وقت محدد (tags/metadata) نخليه يمر
  const tags: string[] = Array.isArray(activity?.tags) ? activity.tags : [];

  // لو عندك في الداتا tags زي: "time:morning" / "time:afternoon" / "time:evening"
  const timeTags = tags
    .filter(t => typeof t === 'string' && t.startsWith('time:'))
    .map(t => t.replace('time:', '').toLowerCase());

  // ما فيه تقييد → مسموح بأي وقت
  if (timeTags.length === 0) return true;

  // تحويل period العربي لمفتاح إنجليزي
  const periodKey =
    period === 'صباحًا' ? 'morning' :
    period === 'ظهرًا' ? 'afternoon' :
    'evening';

  return timeTags.includes(periodKey);
}
const pickActivityForSlot = (
  budget: number,
  isLowBudget: boolean,
  interests: string[],
  usedActivityIdsForDay: Set<number>,
  period: string
): { activity: any; cost: number } | null => {

let candidates = allShuffled
  .filter(a => !usedActivityIdsForDay.has(a.id))
  .sort((a, b) => {
    const usageA = activityUsageCount.get(a.id) || 0;
    const usageB = activityUsageCount.get(b.id) || 0;
    return usageA - usageB; // الأقل استخدامًا أولاً
  });

if (candidates.length === 0) return null;
// ✅ A-4: فلترة الأنشطة حسب الفترة (صباح/ظهر/مساء)
// 🔥 فلترة ناعمة حسب الفترة (Soft)
const periodFiltered = candidates.filter(a =>
  isActivityAllowedInPeriod(a, period)
);

// إذا فيه مرشحين مناسبين للفترة استخدمهم
// إذا لا، لا تصفّر اليوم — استخدم القائمة الأصلية
candidates = periodFiltered.length > 0 ? periodFiltered : candidates;

          if (isLowBudget) {
            candidates = candidates.filter(a => {
              const c = estimateCost(a.cost, a.budgetLevel);
              return c === 0;
            });
            if (candidates.length === 0) return null;
          }

          const scored = candidates.map(a => {
            const cost = getActivityCost(a);
            let score = 0;
            // 🎯 تفضيل حسب الفترة الزمنية
const category = (a.category || '').toString();

if (period === 'صباحًا') {
  if (category.includes('ثق') || category.includes('سيا') || category.includes('تراث')) {
    score += 15; // صباح ثقافة/تراث
  }
  if (category.includes('تسو') || category.includes('ترفي')) {
    score -= 10; // تقليل المول صباحًا
  }
}

if (period === 'مساءً') {
  if (category.includes('تسو') || category.includes('ترفي')) {
    score += 15; // مساء ترفيه
  }
  if (category.includes('ثق') || category.includes('سيا')) {
    score -= 10; // تقليل متاحف مساءً
  }
}
            if (interests.length > 0) {
              const actTags = [a.category, a.type, ...(a.tags || [])].filter(Boolean).map((t: string) => t.toLowerCase());
              const matchCount = interests.filter(i => actTags.some((t: string) => t.includes(i.toLowerCase()))).length;
              score += matchCount * 10;
            }
            if (cost <= budget) score += 5;
            return { activity: a, cost, score };
          });

          scored.sort((a, b) => b.score - a.score);

for (const item of scored) {
  // 🔥 تأكيد إضافي للفترة
  if (!isActivityAllowedInPeriod(item.activity, period)) {
    continue;
  }

  if (item.cost <= budget || isLowBudget) {
    usedActivityIdsForDay.add(item.activity.id);
    return { activity: item.activity, cost: item.cost };
  }
}

          return null;
        };

        const placeholderActivities = [
          { nameAr: 'مشي حر في ممشى قريب', nameEn: 'Walk in nearby promenade', category: 'طبيعة' },
          { nameAr: 'زيارة حديقة عامة', nameEn: 'Visit public park', category: 'طبيعة' },
          { nameAr: 'جولة تصوير خارجية لمعالم المدينة', nameEn: 'Outdoor photography tour of landmarks', category: 'تراث' },
          { nameAr: 'استكشاف الأسواق التقليدية المحلية', nameEn: 'Explore local traditional markets', category: 'ثقافة' },
          { nameAr: 'مشاهدة المناظر الطبيعية من نقطة ارتفاع', nameEn: 'View natural scenery from a viewpoint', category: 'طبيعة' },
          { nameAr: 'زيارة مكتبة عامة أو متحف بدخول مجاني', nameEn: 'Visit free public library or museum', category: 'ثقافة' },
        ];
const activityUsageCount = new Map<number, number>();
const usedActivityIdsForTrip = new Set<number>();
for (let day = 1; day <= input.days; day++) {
  const dayItems: Array<any> = [];
const usedActivityIdsForDay = new Set<number>(); // يتصفّر كل يوم
let freeActivitiesCount = 0;                     // يتصفّر كل يوم

  // ✅ الميزانية بعد السكن
  const baseDailyBudget = Math.max(dailyBudget - accommodationCostPerNight, 0);

  // ✅ توزيع SaaS حسب الجودة (qualityLevel عندك: 'اقتصادية' | 'متوسطة' | 'عالية')
  let dayBudgetMultiplier = 1;
  if (qualityLevel === 'عالية') {
    dayBudgetMultiplier = day === 1 ? 1.25 : 0.95;
  } else if (qualityLevel === 'متوسطة') {
    dayBudgetMultiplier = day === 1 ? 1.10 : 0.98;
  }

  const dayBudget = Math.floor(baseDailyBudget * dayBudgetMultiplier);

  // ✅ فصل ميزانية الوجبات عن الأنشطة (مهم)
  const mealBudget = shouldAddMeals ? Math.floor(dayBudget * 0.40) : 0;      // 40% للوجبات
  let remainingMealBudget = mealBudget;

  const activityBudget = Math.max(dayBudget - mealBudget, 0);               // الباقي للأنشطة
  let remainingActivityBudget = activityBudget;

  const currentDayIsLowBudget = isLowBudgetAfterStay;



  if (remainingAfterAccommodation <= 0) {
    budgetActivityNote = 'تمت إضافة أنشطة مجانية لأن ميزانية اليوم تذهب للسكن.';
    const freeSlots = buildDayTemplate(2)
      .filter(s => s.type === 'activity')
      .slice(0, 3);

    for (let i = 0; i < freeSlots.length; i++) {
      const slot = freeSlots[i];
      const ph = placeholderActivities[(day - 1 + i) % placeholderActivities.length];

      dayItems.push({
        startTime: minutesToTime(slot.start),
        endTime: minutesToTime(slot.end),
        period: derivePeriod(minutesToTime(slot.start)),
        activity: ph.nameAr,
        description: `نشاط مجاني في ${destination.nameAr}`,
        type: ph.category,
        category: ph.category,
        duration: '1 ساعة',
        cost: '0',
        budgetLevel: 'low',
        estimatedCost: 0,
      });
    }

    plan.push({
      day,
      title: dayTitles[day - 1],
      activities: dayItems,
      dayTotalCost: 0,
      dayBudgetSummary: {
        dailyBudget,
        accommodationCostPerNight,
        remainingAfterAccommodation,
        activitiesCost: 0,
        foodCost: 0,
        dayItemsCost: 0,
        remainingAfterActivities: 0,
      },
      budgetActivityNote,
    });

    continue;
  }

  const dayTemplate = buildDayTemplate(shouldAddMeals ? mealsPerDay : 2);

  // 🔥 Force breakfast slot first if restaurants exist
  if (shouldAddMeals) {
    dayTemplate.sort((a, b) => {
      if (a.type === 'meal' && a.mealType === 'breakfast') return -1;
      if (b.type === 'meal' && b.mealType === 'breakfast') return 1;
      return 0;
    });
  }

  let activityCount = 0;
  let mealCount = 0;
  let placeholderIdx = (day - 1) * MIN_ACTIVITIES_PER_DAY;
// ✅ SaaS Rule: حد أقصى للأنشطة المجانية في اليوم
const maxFreeActivitiesPerDay =
  qualityLevel === 'عالية' ? 1 :
  qualityLevel === 'متوسطة' ? 2 : 3;



const fillActivitySlot = (slot: DaySlot) => {
const period = derivePeriod(minutesToTime(slot.start));

const picked = pickActivityForSlot(
  remainingActivityBudget,
  currentDayIsLowBudget,
  input.interests || [],
  usedActivityIdsForDay,
  period
);

  // لو ما فيه نشاط مناسب → لا نضيف شيء
if (!picked) {
  // fallback: حاول نختار أي نشاط يناسب الميزانية
const fallback = allShuffled.find(a =>
  !usedActivityIdsForDay.has(a.id) &&
  !usedActivityIdsForTrip.has(a.id) &&   // 🔥 منع تكرار عبر الرحلة
  (parseFloat(a.cost) || 0) <= remainingActivityBudget
);

if (!fallback) {
  // آخر حل: أضف نشاط مجاني بسيط
  dayItems.push({
    startTime: minutesToTime(slot.start),
    endTime: minutesToTime(slot.end),
    period: derivePeriod(minutesToTime(slot.start)),
    activity: 'جولة حرة',
    description: `استمتع بوقت حر في ${destination.nameAr}`,
    type: 'حر',
    category: 'حر',
    duration: '1 ساعة',
    cost: '0',
    budgetLevel: 'low',
    estimatedCost: 0,
  });
freeActivitiesCount++;
  activityCount++;
  return;
}

  const fallbackCost = parseFloat(fallback.cost) || 0;

  dayItems.push({
    activityId: fallback.id,
    startTime: minutesToTime(slot.start),
    endTime: minutesToTime(slot.end),
    period: derivePeriod(minutesToTime(slot.start)),
    activity: fallback.name,
    description:
      fallback.details ||
      `استمتع بـ${fallback.name} في ${destination.nameAr}`,
    type: fallback.type,
    category: fallback.category,
    duration: fallback.duration || '1 ساعة',
    cost: fallback.cost,
    budgetLevel: fallback.budgetLevel,
    estimatedCost: fallbackCost,
  });

  usedActivityIdsForDay.add(fallback.id);
usedActivityIdsForTrip.add(fallback.id);
  remainingActivityBudget = Math.max(
    remainingActivityBudget - fallbackCost,
    0
  );

  activityCount++;
  return;
}

  const { activity, cost: actCost } = picked;
// ✅ منع تكرار نفس النشاط عبر أيام الرحلة
if (usedActivityIdsForTrip.has(activity.id)) {
  return;
}
  // 🚫 لا نسمح بتجاوز ميزانية الأنشطة
  if (actCost > remainingActivityBudget) {
    return;
  }

  // ✅ حد أقصى للأنشطة المجانية
  if (actCost === 0) {
    if (freeActivitiesCount >= maxFreeActivitiesPerDay) {
      return;
    }
    freeActivitiesCount++;
  }
// 🎯 لا نكرر نفس الفئة أكثر من مرتين في اليوم
const sameCategoryCount = dayItems.filter(
  d => d.category === activity.category
).length;

if (sameCategoryCount >= 3) {
  return;
}
// 🎯 لا نسمح بنفس الفئة مرتين متتاليتين
const lastItem = dayItems[dayItems.length - 1];
if (lastItem && lastItem.category === activity.category) {
  return;
}

 const slotLength = slot.end - slot.start;
const rawDuration = parseDurationToMinutes(activity.duration);

// 🚫 لا نسمح بنشاط أطول من 3 ساعات داخل الجدول اليومي العادي
if (rawDuration > 180) {
  return;
}
let clampedDuration = Math.min(rawDuration, slotLength);

// 👑 في الباقة الفاخرة نزيد مدة النشاط قليلاً
if (qualityLevel === 'عالية') {
  clampedDuration = Math.min(clampedDuration + 30, slotLength);
}

const actualEnd = slot.start + clampedDuration;


  dayItems.push({
    activityId: activity.id,
    startTime: minutesToTime(slot.start),
    endTime: minutesToTime(actualEnd),
    period: derivePeriod(minutesToTime(slot.start)),
    activity: activity.name,
    description:
      activity.details ||
      `استمتع بـ${activity.name} في ${destination.nameAr}`,
    type: activity.type,
    category: activity.category,
    duration: activity.duration || '1 ساعة',
    cost: activity.cost,
    budgetLevel: activity.budgetLevel,
    estimatedCost: actCost,
  });

  // 🔥 هذا السطر المهم لمنع التكرار داخل نفس اليوم
  usedActivityIdsForDay.add(activity.id);
  usedActivityIdsForTrip.add(activity.id);
activityUsageCount.set(
  activity.id,
  (activityUsageCount.get(activity.id) || 0) + 1
);

  remainingActivityBudget = Math.max(
    remainingActivityBudget - actCost,
    0
  );

  activityCount++;
};



for (const slot of dayTemplate) {
if (dayItems.length >= 6) break;
  // ✅ إذا الميزانية المتبقية بعد السكن قليلة لا نبالغ بعدد العناصر
  if (remainingAfterAccommodation <= 250 && dayItems.length >= 5) {
    break;
  }

  // ✅ لا نوقف اليوم إلا إذا:
  // - ميزانية الأنشطة انتهت تقريبًا
  // - وميزانية الوجبات انتهت تقريبًا
  // - وأضفنا وجبة واحدة على الأقل
  // - وعدد العناصر منطقي


  if (slot.type === 'meal' && slot.mealType) {

    if (!shouldAddMeals || currentDayIsLowBudget) {
      fillActivitySlot(slot);
      continue;
    }

    const result = findAffordableRestaurant(
      restaurants,
      slot.mealType,
      remainingMealBudget,
      usedRestaurantIds,
      restaurantPriceRange
    );



              if (!result) {
                fillActivitySlot(slot);
                continue;
              }

              const { restaurant, isBreakfastSpecific } = result;
              let mealCost = parseFloat(restaurant.avgPrice) || 0;
// ✅ الفطور إلزامي حتى لو تجاوز الميزانية
if (mealCost > remainingMealBudget) {
  if (slot.mealType === 'breakfast') {
    // اسمح بتجاوز الميزانية للفطور
  } else {
    fillActivitySlot(slot);
    continue;
  }
}

              if (slot.mealType === 'breakfast' && !isBreakfastSpecific) {
                mealCost = Math.round(mealCost * 0.7);
              }

              const specialtiesArr = Array.isArray(restaurant.specialties) ? restaurant.specialties : [];
              const displaySpecialties = specialtiesArr.filter((s: string) => typeof s === 'string' && !s.startsWith('meal:'));
              const mealTagsArr = specialtiesArr.filter((s: string) => typeof s === 'string' && s.startsWith('meal:')).map((s: string) => s.replace('meal:', ''));
              const descParts = [restaurant.cuisine || ''];
              if (displaySpecialties.length > 0) descParts.push(displaySpecialties.slice(0, 3).join('، '));
              if (restaurant.location) descParts.push(restaurant.location);

              const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.name + ' ' + (destination.nameAr || ''))}`;

              dayItems.push({
                startTime: minutesToTime(slot.start),
                endTime: minutesToTime(slot.end),
                period: derivePeriod(minutesToTime(slot.start)),
                activity: restaurant.name,
                description: descParts.filter(Boolean).join(' · '),
                type: 'مطاعم', category: 'مطاعم',
                duration: '1 ساعة', cost: String(mealCost),
                budgetLevel: restaurant.priceRange === 'فاخر' ? 'high' : restaurant.priceRange === 'متوسط' ? 'medium' : 'low',
                estimatedCost: mealCost, mealType: slot.mealType, mealLabel: mealLabels[slot.mealType],
                googleMapsUrl, restaurantId: restaurant.id,
                ...(mealTagsArr.length > 0 ? { mealTags: mealTagsArr } : {}),
              });

              usedRestaurantIds.add(restaurant.id);
remainingMealBudget = Math.max(remainingMealBudget - mealCost, 0);              mealCount++;
            } else if (slot.type === 'activity') {
              fillActivitySlot(slot);
            }
          }

          let insufficientNote: string | null = null;
        const MIN_DAILY_ITEMS = 2;

if (dayItems.length < MIN_DAILY_ITEMS) {
  insufficientNote = 'لا توجد أنشطة كافية لهذه المدينة ضمن الميزانية المحددة';
}


          let mealNote: string | null = null;
          const minMeals = 2;
          if (shouldAddMeals && mealCount < minMeals) {
            mealNote = 'لا توجد مطاعم كافية مناسبة للميزانية — تم استبدال بعض الوجبات بأنشطة';
          }

          dayItems.sort((a, b) => {
            const aMin = parseInt(a.startTime.split(':')[0]) * 60 + parseInt(a.startTime.split(':')[1]);
            const bMin = parseInt(b.startTime.split(':')[0]) * 60 + parseInt(b.startTime.split(':')[1]);
            return aMin - bMin;
          });
// 🔥 ضمان الحد الأدنى من الأنشطة (غير المطاعم)
const MIN_ACTIVITIES_REQUIRED = 5;

while (dayItems.filter(i => i.type !== 'مطاعم').length < MIN_ACTIVITIES_REQUIRED) {
  const ph = placeholderActivities[placeholderIdx % placeholderActivities.length];
  placeholderIdx++;

  dayItems.push({
    startTime: '16:00',
    endTime: '17:00',
    period: 'مساءً',
    activity: ph.nameAr,
    description: `نشاط إضافي في ${destination.nameAr}`,
    type: ph.category,
    category: ph.category,
    duration: '1 ساعة',
    cost: '0',
    budgetLevel: 'low',
    estimatedCost: 0,
  });
}
          // --- Budget summary (source of truth: sum of estimatedCost on each item) ---
          const foodCost = dayItems
            .filter(a => a.mealType)
            .reduce((sum, act) => sum + (typeof act.estimatedCost === 'number' ? act.estimatedCost : (parseFloat(act.cost) || 0)), 0);
          const pureActivitiesCost = dayItems
            .filter(a => !a.mealType)
            .reduce((sum, act) => sum + (typeof act.estimatedCost === 'number' ? act.estimatedCost : (parseFloat(act.cost) || 0)), 0);
          const dayItemsCost = pureActivitiesCost + foodCost;
          const remainingAfterActivitiesForDay = Math.max(remainingAfterAccommodation - dayItemsCost, 0);
          remainingTripBudget = Math.max(remainingTripBudget - accommodationCostPerNight - dayItemsCost, 0);

          const dayTitle = insufficientNote
            ? `${dayTitles[day - 1] || `اليوم ${day}`} — ${insufficientNote}`
            : (dayTitles[day - 1] || `اليوم ${day}`);

          const notes = [insufficientNote, mealNote].filter(Boolean);
          console.log(`[PlanGen] Day ${day}: chosenActivities=${activityCount}, chosenMeals=${mealCount}${notes.length ? ', NOTES: ' + notes.join('; ') : ''}`);

          plan.push({
            day, title: dayTitle,
            activities: dayItems,
            dayTotalCost: dayItemsCost,
            dayBudgetSummary: {
              dailyBudget, accommodationCostPerNight, remainingAfterAccommodation,
              activitiesCost: pureActivitiesCost, foodCost,
              dayItemsCost,
              remainingAfterActivities: remainingAfterActivitiesForDay,
            },
            remainingTripBudget,
            ...(insufficientNote ? { insufficientActivitiesNote: insufficientNote } : {}),
            ...(mealNote ? { mealNote } : {}),
          });
        } 
        
        // Build accommodation info for plan (accommodation already selected and budgets computed earlier)
        let accommodationInfo = null;
        
        if (selectedAccommodation) {
          accommodationInfo = {
            name: selectedAccommodation.nameAr,
            nameEn: selectedAccommodation.nameEn,
            class: selectedAccommodation.class,
            priceRange: selectedAccommodation.priceRange,
            googleMapsUrl: selectedAccommodation.googleMapsUrl || selectedAccommodation.googlePlaceId 
              ? `https://www.google.com/maps/place/?q=place_id:${selectedAccommodation.googlePlaceId}` 
              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedAccommodation.nameAr + ' ' + destination.nameAr + ' السعودية')}`,
            rating: selectedAccommodation.rating,
          };
        }
        
        // Determine budget note
        let budgetNote: string | null = null;
        if (remainingAfterAccommodation < 50) {
          budgetNote = 'ميزانيتك اليومية تذهب للسكن تقريبًا، تم تفضيل الأنشطة المجانية والخيارات الاقتصادية.';
        }
        
        const accommodationTotalCost = (accommodationCostPerNight || 0) * input.days;
        const itemsTotalCost = plan.reduce((sum, day) => sum + (day.dayTotalCost || 0), 0);
        const tripTotalCost = accommodationTotalCost + itemsTotalCost;
        const remainingBudget = Math.max(input.budget - tripTotalCost, 0);
        
        // Keep plan as-is (dayBudgetSummary already set in the day loop)
        const planWithBudgetSummary = plan;

        // Create trip record
        const tripData = {
          userId: user.id,
          destinationId: input.destinationId,
          days: input.days,
          budget: input.budget.toString(),
          interests: input.interests,
          accommodationType: input.accommodationType || 'متوسط',
          startDate: input.startDate,
          plan: {
            destination: destination.nameAr,
            destinationEn: destination.nameEn,
            days: input.days,
            budget: input.budget,
            budgetDistribution,
            qualityLevel,
            accommodation: accommodationInfo,
            accommodationSelectionNote,
            noAccommodationMessage: !selectedAccommodation ? 'لا توجد إقامات تناسب ميزانيتك في هذه المدينة' : null,
            dailyBudget,
            accommodationCostPerNight,
            remainingAfterAccommodation,
            mealsPerDay,
            budgetNote,
            budgetActivityNote,
            dailyPlan: planWithBudgetSummary,
            tripTotalCost,
            remainingBudget,
          },
        };

        const result = await db.createTrip(tripData);
        return { id: result.id, plan: tripData.plan };
      }),

    delete: protectedProcedure
      .input(z.object({ tripId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const authHeader = ctx.req.headers.authorization;
        if (!authHeader) throw new TRPCError({ code: 'UNAUTHORIZED' });
        
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
        
        await db.deleteTrip(input.tripId, decoded.userId);
        return { success: true };
      }),

    generateShareLink: protectedProcedure
      .input(z.object({ tripId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const authHeader = ctx.req.headers.authorization;
        if (!authHeader) throw new TRPCError({ code: 'UNAUTHORIZED' });
        
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
        const user = await db.getUserById(decoded.userId);
        
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });
        
        if (user.tier !== 'smart' && user.tier !== 'professional') {
          throw new TRPCError({ 
            code: 'FORBIDDEN', 
            message: 'مشاركة الخطط متاحة فقط لباقة ذكي والاحترافي' 
          });
        }
        
        const trips = await db.getUserTrips(decoded.userId);
        const trip = trips.find((t: any) => t.id === input.tripId);
        if (!trip) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'الخطة غير موجودة' });
        }
        
        const shareToken = crypto.randomBytes(32).toString('hex');
        await db.updateTripShareToken(input.tripId, shareToken);
        
        return { shareToken };
      }),

    removeShareLink: protectedProcedure
      .input(z.object({ tripId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const authHeader = ctx.req.headers.authorization;
        if (!authHeader) throw new TRPCError({ code: 'UNAUTHORIZED' });
        
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
        
        const trips = await db.getUserTrips(decoded.userId);
        const trip = trips.find((t: any) => t.id === input.tripId);
        if (!trip) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'الخطة غير موجودة' });
        }
        
        await db.removeTripShareToken(input.tripId);
        return { success: true };
      }),

    getShared: publicProcedure
      .input(z.object({ shareToken: z.string() }))
      .query(async ({ input }) => {
        const trip = await db.getTripByShareToken(input.shareToken);
        if (!trip || !trip.isPublic) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'الخطة غير موجودة أو غير متاحة للمشاركة' });
        }
        
        const destination = await db.getDestinationById(trip.destinationId);
        return {
          id: trip.id,
          days: trip.days,
          destination: destination?.nameAr || 'غير معروف',
          destinationEn: destination?.nameEn || '',
          plan: trip.plan,
          startDate: trip.startDate || null,
          createdAt: trip.createdAt,
        };
      }),

    aiAssist: protectedProcedure
      .input(z.object({
        tripId: z.number(),
        instruction: z.string().min(1).max(500),
      }))
      .mutation(async ({ ctx, input }) => {
        const authHeader = ctx.req.headers.authorization;
        if (!authHeader) throw new TRPCError({ code: 'UNAUTHORIZED' });

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
        const user = await db.getUserById(decoded.userId);
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        if (user.tier !== 'smart' && user.tier !== 'professional') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'مساعد الرحلة الذكي متاح فقط لباقة ذكي والاحترافي',
          });
        }

        const trip = await db.getTripById(input.tripId);
        if (!trip || trip.userId !== user.id) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'الرحلة غير موجودة' });
        }

        const currentPlan = trip.plan as any;
        if (!currentPlan || !currentPlan.dailyPlan) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'لا توجد خطة للتعديل' });
        }

        const planForAI = {
          destination: currentPlan.destination,
          days: currentPlan.days,
          dailyPlan: currentPlan.dailyPlan.map((day: any) => ({
            day: day.day,
            title: day.title,
            activities: day.activities?.map((a: any) => ({
              activity: a.activity,
              description: a.description,
              type: a.type,
              category: a.category,
              duration: a.duration,
              cost: a.cost,
              startTime: a.startTime,
              endTime: a.endTime,
              period: a.period,
            })) || [],
          })),
        };

        const systemPrompt = `أنت مساعد رحلات ذكي. المستخدم سيعطيك خطة رحلة حالية وتعليمات لتعديلها.
أعد الخطة المعدلة فقط بصيغة JSON. لا تضف أي نص خارج JSON.
حافظ على نفس البنية تمامًا. كل يوم يحتوي على: day (رقم), title (عنوان عربي), activities (مصفوفة).
كل نشاط يحتوي على: activity (اسم), description (وصف قصير), type (نوع), category (فئة), duration (مدة), cost (تكلفة كنص), startTime (HH:MM), endTime (HH:MM), period (صباحًا/ظهرًا/عصرًا/مساءً).
أبقِ الأنشطة واقعية ومتوفرة في ${currentPlan.destination} بالسعودية.
أعد JSON فقط بالشكل: { "dailyPlan": [...] }`;

        const userMessage = `الخطة الحالية:\n${JSON.stringify(planForAI.dailyPlan, null, 0)}\n\nالتعديل المطلوب: ${input.instruction}`;

        const aiMode = (process.env.AI_MODE || 'mock').toLowerCase();

        if (aiMode === 'mock') {
          const mockDailyPlan = JSON.parse(JSON.stringify(currentPlan.dailyPlan));
          if (mockDailyPlan[0]?.activities?.[0]) {
            mockDailyPlan[0].activities[0].activity += ' (معدل)';
            mockDailyPlan[0].activities[0].description = `تعديل تجريبي: ${input.instruction}`;
          }
          const updatedPlan = {
            ...currentPlan,
            dailyPlan: mockDailyPlan,
            budgetNote: `وضع تجريبي: ${input.instruction}`,
          };
          return {
            updatedPlan,
            assistantMessage: 'تم (تجريبيًا) تعديل الخطة حسب طلبك. فعّل الوضع الحي لاحقًا لاستخدام الذكاء الاصطناعي الحقيقي.',
            usedMock: true,
          };
        }

        const geminiKey = process.env.GEMINI_API_KEY;
        if (!geminiKey) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'لم يتم تكوين مفتاح Gemini. يرجى إضافة GEMINI_API_KEY.',
          });
        }

        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({
          model: 'gemini-2.0-flash',
          generationConfig: {
            responseMimeType: 'application/json',
            maxOutputTokens: 4000,
            temperature: 0.7,
          },
        });
        const result = await model.generateContent(`${systemPrompt}\n\n${userMessage}`);
        let aiResponseText = result.response.text();

        aiResponseText = aiResponseText.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '').trim();

        let parsed: any;
        try {
          parsed = JSON.parse(aiResponseText);
        } catch {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'فشل في تحليل استجابة الذكاء الاصطناعي. حاول مرة أخرى.',
          });
        }

        const activitySchema = z.object({
          activityId: z.number().optional(),
          activity: z.string(),
          description: z.string().optional().default(''),
          type: z.string().optional().default(''),
          category: z.string().optional().default(''),
          duration: z.string().optional().default(''),
          cost: z.string().optional().default('0'),
          startTime: z.string().optional().default(''),
          endTime: z.string().optional().default(''),
          period: z.string().optional().default(''),
        });

        const daySchema = z.object({
          day: z.number(),
          title: z.string(),
          activities: z.array(activitySchema),
        });

        const planOutputSchema = z.object({
          dailyPlan: z.array(daySchema),
        });

        const validation = planOutputSchema.safeParse(parsed);
        if (!validation.success) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'الخطة المعدلة غير صالحة. حاول مرة أخرى بتعليمات مختلفة.',
          });
        }

        const updatedDailyPlan = validation.data.dailyPlan;
        const updatedPlan = {
          ...currentPlan,
          dailyPlan: updatedDailyPlan,
        };

        return { updatedPlan, usedMock: false };
      }),

    savePlan: protectedProcedure
      .input(z.object({
        tripId: z.number(),
        plan: z.object({
          destination: z.string(),
          days: z.number(),
          dailyPlan: z.array(z.object({
            day: z.number(),
            title: z.string(),
            activities: z.array(z.object({
              activityId: z.number().optional(),
              activity: z.string(),
              description: z.string().optional(),
              type: z.string().optional(),
              category: z.string().optional(),
              duration: z.string().optional(),
              cost: z.string().optional(),
              startTime: z.string().optional(),
              endTime: z.string().optional(),
              period: z.string().optional(),
            })),
          })),
        }).passthrough(),
      }))
      .mutation(async ({ ctx, input }) => {
        const authHeader = ctx.req.headers.authorization;
        if (!authHeader) throw new TRPCError({ code: 'UNAUTHORIZED' });

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
        const user = await db.getUserById(decoded.userId);
        if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

        if (user.tier !== 'smart' && user.tier !== 'professional') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'غير مسموح' });
        }

        const planStr = JSON.stringify(input.plan);
        if (planStr.length > 500000) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'الخطة كبيرة جدًا' });
        }

        const result = await db.updateTripPlan(input.tripId, user.id, input.plan);
        if (!result) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'الرحلة غير موجودة' });
        }

        return { success: true };
      }),
  }),

  user: router({
    updateTier: protectedProcedure
      .input(z.object({
        tier: z.enum(['free', 'smart', 'professional']),
      }))
      .mutation(async ({ ctx, input }) => {
        const authHeader = ctx.req.headers.authorization;
        if (!authHeader) throw new TRPCError({ code: 'UNAUTHORIZED' });
        
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
        
        await db.updateUserTier(decoded.userId, input.tier);
        return { success: true };
      }),
  }),

  admin: router({
    checkAccess: protectedProcedure.query(async ({ ctx }) => {
      const authHeader = ctx.req.headers.authorization;
      if (!authHeader) throw new TRPCError({ code: 'UNAUTHORIZED' });
      
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const user = await db.getUserById(decoded.userId);
      
      if (!user || user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }
      
      return { isAdmin: true };
    }),

    users: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        const authHeader = ctx.req.headers.authorization;
        if (!authHeader) throw new TRPCError({ code: 'UNAUTHORIZED' });
        
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
        const user = await db.getUserById(decoded.userId);
        
        if (!user || user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        
        return await db.getAllUsers();
      }),

      updateTier: protectedProcedure
        .input(z.object({
          userId: z.number(),
          tier: z.enum(['free', 'smart', 'professional']),
        }))
        .mutation(async ({ ctx, input }) => {
          const authHeader = ctx.req.headers.authorization;
          if (!authHeader) throw new TRPCError({ code: 'UNAUTHORIZED' });
          
          const token = authHeader.substring(7);
          const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
          const user = await db.getUserById(decoded.userId);
          
          if (!user || user.role !== 'admin') {
            throw new TRPCError({ code: 'FORBIDDEN' });
          }
          
          await db.updateUserTier(input.userId, input.tier);
          return { success: true };
        }),

      updateRole: protectedProcedure
        .input(z.object({
          userId: z.number(),
          role: z.enum(['user', 'admin']),
        }))
        .mutation(async ({ ctx, input }) => {
          const authHeader = ctx.req.headers.authorization;
          if (!authHeader) throw new TRPCError({ code: 'UNAUTHORIZED' });
          
          const token = authHeader.substring(7);
          const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
          const user = await db.getUserById(decoded.userId);
          
          if (!user || user.role !== 'admin') {
            throw new TRPCError({ code: 'FORBIDDEN' });
          }
          
          await db.updateUserRole(input.userId, input.role);
          return { success: true };
        }),
    }),

    destinations: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        const authHeader = ctx.req.headers.authorization;
        if (!authHeader) throw new TRPCError({ code: 'UNAUTHORIZED' });
        
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
        const user = await db.getUserById(decoded.userId);
        
        if (!user || user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        
        return await db.getAllDestinations();
      }),

      create: protectedProcedure
        .input(z.object({
          slug: z.string().min(2),
          nameAr: z.string().min(2),
          nameEn: z.string().min(2),
          titleAr: z.string().min(2),
          titleEn: z.string().min(2),
          descriptionAr: z.string().min(10),
          descriptionEn: z.string().min(10),
          images: z.array(z.string()),
          isActive: z.boolean().default(true),
        }))
        .mutation(async ({ ctx, input }) => {
          const authHeader = ctx.req.headers.authorization;
          if (!authHeader) throw new TRPCError({ code: 'UNAUTHORIZED' });
          
          const token = authHeader.substring(7);
          const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
          const user = await db.getUserById(decoded.userId);
          
          if (!user || user.role !== 'admin') {
            throw new TRPCError({ code: 'FORBIDDEN' });
          }
          
          const result = await db.createDestination(input);
          return { id: result.id };
        }),

      update: protectedProcedure
        .input(z.object({
          id: z.number(),
          slug: z.string().optional(),
          nameAr: z.string().optional(),
          nameEn: z.string().optional(),
          titleAr: z.string().optional(),
          titleEn: z.string().optional(),
          descriptionAr: z.string().optional(),
          descriptionEn: z.string().optional(),
          images: z.array(z.string()).optional(),
          isActive: z.boolean().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          const authHeader = ctx.req.headers.authorization;
          if (!authHeader) throw new TRPCError({ code: 'UNAUTHORIZED' });
          
          const token = authHeader.substring(7);
          const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
          const user = await db.getUserById(decoded.userId);
          
          if (!user || user.role !== 'admin') {
            throw new TRPCError({ code: 'FORBIDDEN' });
          }
          
          const { id, ...data } = input;
          await db.updateDestination(id, data);
          return { success: true };
        }),

      delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
          const authHeader = ctx.req.headers.authorization;
          if (!authHeader) throw new TRPCError({ code: 'UNAUTHORIZED' });
          
          const token = authHeader.substring(7);
          const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
          const user = await db.getUserById(decoded.userId);
          
          if (!user || user.role !== 'admin') {
            throw new TRPCError({ code: 'FORBIDDEN' });
          }
          
          await db.deleteDestination(input.id);
          return { success: true };
        }),
    }),

    activities: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        const authHeader = ctx.req.headers.authorization;
        if (!authHeader) throw new TRPCError({ code: 'UNAUTHORIZED' });
        
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
        const user = await db.getUserById(decoded.userId);
        
        if (!user || user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        
        return await db.getAllActivities();
      }),

      create: protectedProcedure
        .input(z.object({
          destinationId: z.number(),
          name: z.string().min(2),
          nameEn: z.string().optional(),
          type: z.string().min(2),
          duration: z.string().optional(),
          cost: z.string().optional(),
          icon: z.string().optional(),
          minTier: z.enum(['free', 'smart', 'professional']).default('free'),
          details: z.string().optional(),
          isActive: z.boolean().default(true),
        }))
        .mutation(async ({ ctx, input }) => {
          const authHeader = ctx.req.headers.authorization;
          if (!authHeader) throw new TRPCError({ code: 'UNAUTHORIZED' });
          
          const token = authHeader.substring(7);
          const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
          const user = await db.getUserById(decoded.userId);
          
          if (!user || user.role !== 'admin') {
            throw new TRPCError({ code: 'FORBIDDEN' });
          }
          
          const result = await db.createActivity(input);
          return { id: result.id };
        }),

      update: protectedProcedure
        .input(z.object({
          id: z.number(),
          destinationId: z.number().optional(),
          name: z.string().optional(),
          nameEn: z.string().optional(),
          type: z.string().optional(),
          duration: z.string().optional(),
          cost: z.string().optional(),
          icon: z.string().optional(),
          minTier: z.enum(['free', 'smart', 'professional']).optional(),
          details: z.string().optional(),
          isActive: z.boolean().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          const authHeader = ctx.req.headers.authorization;
          if (!authHeader) throw new TRPCError({ code: 'UNAUTHORIZED' });
          
          const token = authHeader.substring(7);
          const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
          const user = await db.getUserById(decoded.userId);
          
          if (!user || user.role !== 'admin') {
            throw new TRPCError({ code: 'FORBIDDEN' });
          }
          
          const { id, ...data } = input;
          await db.updateActivity(id, data);
          return { success: true };
        }),

      delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
          const authHeader = ctx.req.headers.authorization;
          if (!authHeader) throw new TRPCError({ code: 'UNAUTHORIZED' });
          
          const token = authHeader.substring(7);
          const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
          const user = await db.getUserById(decoded.userId);
          
          if (!user || user.role !== 'admin') {
            throw new TRPCError({ code: 'FORBIDDEN' });
          }
          
          await db.deleteActivity(input.id);
          return { success: true };
        }),

      deleteByDestination: protectedProcedure
        .input(z.object({ destinationId: z.number() }))
        .mutation(async ({ ctx, input }) => {
          const authHeader = ctx.req.headers.authorization;
          if (!authHeader) throw new TRPCError({ code: 'UNAUTHORIZED' });
          
          const token = authHeader.substring(7);
          const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
          const user = await db.getUserById(decoded.userId);
          
          if (!user || user.role !== 'admin') {
            throw new TRPCError({ code: 'FORBIDDEN' });
          }
          
          const count = await db.deleteActivitiesByDestination(input.destinationId);
          return { count };
        }),

      deleteMany: protectedProcedure
        .input(z.object({ ids: z.array(z.number()) }))
        .mutation(async ({ ctx, input }) => {
          const authHeader = ctx.req.headers.authorization;
          if (!authHeader) throw new TRPCError({ code: 'UNAUTHORIZED' });
          
          const token = authHeader.substring(7);
          const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
          const user = await db.getUserById(decoded.userId);
          
          if (!user || user.role !== 'admin') {
            throw new TRPCError({ code: 'FORBIDDEN' });
          }
          
          const count = await db.deleteActivitiesMany(input.ids);
          return { count };
        }),
    }),

    accommodations: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        const authHeader = ctx.req.headers.authorization;
        if (!authHeader) throw new TRPCError({ code: 'UNAUTHORIZED' });
        
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
        const user = await db.getUserById(decoded.userId);
        
        if (!user || user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        
        return await db.getAllAccommodations();
      }),

      create: protectedProcedure
        .input(z.object({
          destinationId: z.number(),
          nameAr: z.string().min(2),
          nameEn: z.string().optional(),
          descriptionAr: z.string().optional(),
          descriptionEn: z.string().optional(),
          class: z.enum(['economy', 'mid', 'luxury']).default('mid'),
          priceRange: z.string().optional(),
          googlePlaceId: z.string().optional(),
          googleMapsUrl: z.string().optional(),
          isActive: z.boolean().default(true),
        }))
        .mutation(async ({ ctx, input }) => {
          const authHeader = ctx.req.headers.authorization;
          if (!authHeader) throw new TRPCError({ code: 'UNAUTHORIZED' });
          
          const token = authHeader.substring(7);
          const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
          const user = await db.getUserById(decoded.userId);
          
          if (!user || user.role !== 'admin') {
            throw new TRPCError({ code: 'FORBIDDEN' });
          }
          
          const result = await db.createAccommodation(input);
          return { id: result.id };
        }),

      update: protectedProcedure
        .input(z.object({
          id: z.number(),
          destinationId: z.number().optional(),
          nameAr: z.string().optional(),
          nameEn: z.string().optional(),
          descriptionAr: z.string().optional(),
          descriptionEn: z.string().optional(),
          class: z.enum(['economy', 'mid', 'luxury']).optional(),
          priceRange: z.string().optional(),
          googlePlaceId: z.string().optional(),
          googleMapsUrl: z.string().optional(),
          isActive: z.boolean().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          const authHeader = ctx.req.headers.authorization;
          if (!authHeader) throw new TRPCError({ code: 'UNAUTHORIZED' });
          
          const token = authHeader.substring(7);
          const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
          const user = await db.getUserById(decoded.userId);
          
          if (!user || user.role !== 'admin') {
            throw new TRPCError({ code: 'FORBIDDEN' });
          }
          
          const { id, ...data } = input;
          await db.updateAccommodation(id, data);
          return { success: true };
        }),

      delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
          const authHeader = ctx.req.headers.authorization;
          if (!authHeader) throw new TRPCError({ code: 'UNAUTHORIZED' });
          
          const token = authHeader.substring(7);
          const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
          const user = await db.getUserById(decoded.userId);
          
          if (!user || user.role !== 'admin') {
            throw new TRPCError({ code: 'FORBIDDEN' });
          }
          
          await db.deleteAccommodation(input.id);
          return { success: true };
        }),

      deleteByDestination: protectedProcedure
        .input(z.object({ destinationId: z.number() }))
        .mutation(async ({ ctx, input }) => {
          const authHeader = ctx.req.headers.authorization;
          if (!authHeader) throw new TRPCError({ code: 'UNAUTHORIZED' });
          
          const token = authHeader.substring(7);
          const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
          const user = await db.getUserById(decoded.userId);
          
          if (!user || user.role !== 'admin') {
            throw new TRPCError({ code: 'FORBIDDEN' });
          }
          
          const count = await db.deleteAccommodationsByDestination(input.destinationId);
          return { count };
        }),

      deleteMany: protectedProcedure
        .input(z.object({ ids: z.array(z.number()) }))
        .mutation(async ({ ctx, input }) => {
          const authHeader = ctx.req.headers.authorization;
          if (!authHeader) throw new TRPCError({ code: 'UNAUTHORIZED' });
          
          const token = authHeader.substring(7);
          const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
          const user = await db.getUserById(decoded.userId);
          
          if (!user || user.role !== 'admin') {
            throw new TRPCError({ code: 'FORBIDDEN' });
          }
          
          const count = await db.deleteAccommodationsMany(input.ids);
          return { count };
        }),
    }),

    support: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        const authHeader = ctx.req.headers.authorization;
        if (!authHeader) throw new TRPCError({ code: 'UNAUTHORIZED' });
        
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
        const user = await db.getUserById(decoded.userId);
        
        if (!user || user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        
        return await db.getAllSupportMessages();
      }),

      markResolved: protectedProcedure
        .input(z.object({ id: z.number(), isResolved: z.boolean() }))
        .mutation(async ({ ctx, input }) => {
          const authHeader = ctx.req.headers.authorization;
          if (!authHeader) throw new TRPCError({ code: 'UNAUTHORIZED' });
          
          const token = authHeader.substring(7);
          const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
          const user = await db.getUserById(decoded.userId);
          
          if (!user || user.role !== 'admin') {
            throw new TRPCError({ code: 'FORBIDDEN' });
          }
          
          await db.markSupportMessageResolved(input.id, input.isResolved);
          return { success: true };
        }),

      delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
          const authHeader = ctx.req.headers.authorization;
          if (!authHeader) throw new TRPCError({ code: 'UNAUTHORIZED' });
          
          const token = authHeader.substring(7);
          const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
          const user = await db.getUserById(decoded.userId);
          
          if (!user || user.role !== 'admin') {
            throw new TRPCError({ code: 'FORBIDDEN' });
          }
          
          await db.deleteSupportMessage(input.id);
          return { success: true };
        }),
    }),

    bulkImport: protectedProcedure
      .input(z.object({
        cities: z.array(z.record(z.string(), z.any())).optional(),
        activities: z.array(z.record(z.string(), z.any())).optional(),
        accommodations: z.array(z.record(z.string(), z.any())).optional(),
        restaurants: z.array(z.record(z.string(), z.any())).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const authHeader = ctx.req.headers.authorization;
        if (!authHeader) throw new TRPCError({ code: 'UNAUTHORIZED' });
        
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
        const user = await db.getUserById(decoded.userId);
        
        if (!user || user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }

        // Helper: normalize header names
        const normalizeHeader = (header: string): string => {
          return header.trim().toLowerCase().replace(/[\s_-]/g, '');
        };

        // Helper: get field value by multiple possible header names
        const getFieldValue = (row: any, possibleHeaders: string[]): any => {
          for (const header of possibleHeaders) {
            const normalized = normalizeHeader(header);
            for (const [key, value] of Object.entries(row)) {
              if (normalizeHeader(key) === normalized) {
                return value;
              }
            }
          }
          return undefined;
        };

        // Helper: normalize budgetLevel enum (free -> low)
        const normalizeBudgetLevel = (value: any): string => {
          if (!value) return 'medium';
          const normalized = String(value).trim().toLowerCase();
          if (normalized === 'free') return 'low';
          if (['low', 'medium', 'high'].includes(normalized)) return normalized;
          return 'medium'; // default on unknown
        };

        // Helper: normalize minTier enum
        const normalizeMinTier = (value: any): string => {
          if (!value) return 'free';
          const normalized = String(value).trim().toLowerCase();
          if (['free', 'smart', 'professional'].includes(normalized)) return normalized;
          return 'free'; // default on unknown
        };

        // Helper: normalize bestTimeOfDay enum
        const normalizeBestTimeOfDay = (value: any): string => {
          if (!value) return '';
          const normalized = String(value).trim().toLowerCase();
          if (['morning', 'afternoon', 'evening', 'anytime'].includes(normalized)) return normalized;
          return ''; // default on unknown
        };

        // Helper: normalize accommodation class enum
        const normalizeAccommodationClass = (value: any): string => {
          if (!value) return 'mid';
          const normalized = String(value).trim().toLowerCase();
          if (['economy', 'mid', 'luxury'].includes(normalized)) return normalized;
          return 'mid'; // default on unknown
        };

        const deriveCityKey = (row: { cityKey: string; slug: string; nameEn: string; nameAr: string }): string => {
          if (row.cityKey) return String(row.cityKey).trim();
          if (row.slug) return String(row.slug).trim().toLowerCase().replace(/\s+/g, '-');
          if (row.nameEn) return String(row.nameEn).trim().toLowerCase().replace(/\s+/g, '-');
          if (row.nameAr) return String(row.nameAr).trim().replace(/\s+/g, '-');
          return '';
        };

        // Normalize city rows
        const normalizeCities = (cities: any[]): any[] => {
          return cities.map(city => {
            const raw = {
              cityKey: getFieldValue(city, ['city_id', 'cityKey', 'id']) || '',
              slug: getFieldValue(city, ['slug']) || '',
              nameAr: getFieldValue(city, ['name_ar', 'nameAr']) || '',
              nameEn: getFieldValue(city, ['name_en', 'nameEn']) || '',
              descriptionAr: getFieldValue(city, ['description_ar', 'descriptionAr']) || '',
              descriptionEn: getFieldValue(city, ['description_en', 'descriptionEn']) || '',
              image: getFieldValue(city, ['image', 'image_url']) || '',
              region: getFieldValue(city, ['region']) || '',
              isActive: getFieldValue(city, ['is_active', 'isActive']) !== false,
            };
            return { ...raw, cityKey: deriveCityKey(raw) };
          });
        };

        // Normalize activity rows
        const normalizeActivities = (activities: any[]): any[] => {
          return activities.map(activity => ({
            activityKey: getFieldValue(activity, ['activity_id', 'id']) || '',
            destinationKey: getFieldValue(activity, ['city_id', 'destinationId']) || '',
            nameAr: getFieldValue(activity, ['name_ar', 'nameAr', 'name']) || '',
            nameEn: getFieldValue(activity, ['name_en', 'nameEn']) || '',
            type: getFieldValue(activity, ['type']) || '',
            category: getFieldValue(activity, ['category']) || '',
            budgetLevel: normalizeBudgetLevel(getFieldValue(activity, ['budget_level', 'budgetLevel'])),
            bestTimeOfDay: normalizeBestTimeOfDay(getFieldValue(activity, ['best_time_of_day', 'bestTimeOfDay', 'best_time'])),
            minTier: normalizeMinTier(getFieldValue(activity, ['min_tier', 'minTier'])),
            cost: getFieldValue(activity, ['cost', 'estimatedCost', 'avgCostPerPerson']) || '',
            duration: getFieldValue(activity, ['duration', 'durationMin']) || '',
            details: getFieldValue(activity, ['details', 'costNote']) || '',
            detailsEn: getFieldValue(activity, ['details_en', 'detailsEn']) || '',
            googleMapsUrl: getFieldValue(activity, ['google_maps_url', 'googleMapsUrl']) || '',
            isActive: getFieldValue(activity, ['is_active', 'isActive']) !== false,
            originalBudgetLevel: String(getFieldValue(activity, ['budget_level', 'budgetLevel']) || '').trim().toLowerCase(),
          }));
        };

        // Normalize accommodation rows
        const normalizeAccommodations = (accommodations: any[]): any[] => {
          return accommodations.map(acc => ({
            accommodationKey: getFieldValue(acc, ['accommodation_id', 'id']) || '',
            destinationKey: getFieldValue(acc, ['city_id', 'destinationId']) || '',
            nameAr: getFieldValue(acc, ['name_ar', 'nameAr']) || '',
            nameEn: getFieldValue(acc, ['name_en', 'nameEn']) || '',
            class: normalizeAccommodationClass(getFieldValue(acc, ['class'])),
            priceRange: getFieldValue(acc, ['price_range', 'priceRange', 'pricePerNight']) || '',
            descriptionAr: getFieldValue(acc, ['description_ar', 'descriptionAr']) || '',
            descriptionEn: getFieldValue(acc, ['description_en', 'descriptionEn']) || '',
            googleMapsUrl: getFieldValue(acc, ['google_maps_url', 'googleMapsUrl']) || '',
            rating: getFieldValue(acc, ['rating']) || '',
            isActive: getFieldValue(acc, ['is_active', 'isActive']) !== false,
          }));
        };

        const normalizeRestaurants = (rows: any[]): any[] => {
          return rows.map(row => {
            const mealTagsRaw = getFieldValue(row, ['meal_tags', 'mealTags', 'mealtags']) || '';
            const mealTags = typeof mealTagsRaw === 'string'
              ? mealTagsRaw.split(',').map((t: string) => t.trim().toLowerCase()).filter(Boolean)
              : [];
            const specialtiesRaw = getFieldValue(row, ['specialties']) || '';
            const specialties = typeof specialtiesRaw === 'string'
              ? specialtiesRaw.split(',').map((t: string) => t.trim()).filter(Boolean)
              : Array.isArray(specialtiesRaw) ? specialtiesRaw : [];

            const combinedSpecialties = [
              ...specialties,
              ...mealTags.map((tag: string) => `meal:${tag}`),
            ];

            return {
              destinationKey: getFieldValue(row, ['city_id', 'destinationId']) || '',
              name: getFieldValue(row, ['name', 'name_ar', 'nameAr']) || '',
              cuisine: getFieldValue(row, ['cuisine']) || '',
              priceRange: getFieldValue(row, ['price_range', 'priceRange']) || 'متوسط',
              avgPrice: getFieldValue(row, ['avg_price', 'avgPrice', 'price']) || '0',
              rating: getFieldValue(row, ['rating']) || '',
              specialties: combinedSpecialties,
              trending: getFieldValue(row, ['trending']) || '',
              location: getFieldValue(row, ['location']) || '',
            };
          });
        };

        const normalizePriceRange = (value: any): string => {
          if (!value) return 'متوسط';
          const normalized = String(value).trim();
          if (['فاخر', 'متوسط', 'اقتصادي'].includes(normalized)) return normalized;
          const lower = normalized.toLowerCase();
          if (lower === 'luxury' || lower === 'high') return 'فاخر';
          if (lower === 'mid' || lower === 'medium') return 'متوسط';
          if (lower === 'economy' || lower === 'low' || lower === 'budget') return 'اقتصادي';
          return 'متوسط';
        };

        const MAX_ERRORS = 50;
        const results: any = {};
        const cityKeyToDatabaseId: { [key: string]: number } = {};

        console.log(`[Import] ========== BULK IMPORT START ==========`);
        console.log(`[Import] Received sheets: cities=${input.cities?.length ?? 0} rows, activities=${input.activities?.length ?? 0} rows, accommodations=${input.accommodations?.length ?? 0} rows, restaurants=${input.restaurants?.length ?? 0} rows`);

        const totalParsedRows = (input.cities?.length ?? 0) + (input.activities?.length ?? 0) + (input.accommodations?.length ?? 0) + (input.restaurants?.length ?? 0);

        if (totalParsedRows === 0) {
          console.log(`[Import] ERROR: No data rows in any sheet`);
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'No data rows found in any sheet. Ensure sheets are named: Cities, Activities, Accommodations and contain data rows below the header.',
          });
        }

        let totalInserted = 0;
        const allErrors: string[] = [];

        // Process Cities
        if (input.cities && input.cities.length > 0) {
          const normalizedCities = normalizeCities(input.cities);
          const errors: string[] = [];
          let parsedRows = normalizedCities.length;
          let insertedRows = 0;

          console.log(`[Import] --- Cities: ${parsedRows} parsed rows ---`);
          if (normalizedCities.length > 0) {
            console.log(`[Import] Cities sample row[0] keys: ${Object.keys(input.cities[0]).join(', ')}`);
            console.log(`[Import] Cities normalized row[0]: cityKey="${normalizedCities[0].cityKey}", nameAr="${normalizedCities[0].nameAr}", nameEn="${normalizedCities[0].nameEn}"`);
          }

          for (let idx = 0; idx < normalizedCities.length; idx++) {
            const city = normalizedCities[idx];
            if (!city.cityKey) {
              const msg = `Row ${idx + 2}: مطلوب: cityKey (city_id OR cityKey OR id)`;
              if (errors.length < MAX_ERRORS) errors.push(msg);
              continue;
            }
            if (!city.nameAr) {
              const msg = `Row ${idx + 2}: مطلوب: nameAr (name_ar OR nameAr)`;
              if (errors.length < MAX_ERRORS) errors.push(msg);
              continue;
            }

            const externalId = String(city.cityKey).trim();
            const cityData = {
              nameAr: city.nameAr,
              nameEn: city.nameEn || city.nameAr,
              slug: externalId.toLowerCase().replace(/\s+/g, '-'),
              titleAr: city.nameAr,
              titleEn: city.nameEn || city.nameAr,
              descriptionAr: city.descriptionAr || '',
              descriptionEn: city.descriptionEn || '',
              images: city.image ? [city.image] : [],
              isActive: city.isActive,
            };

            try {
              const result = await db.upsertDestinationByExternalId(externalId, cityData);
              cityKeyToDatabaseId[externalId] = result.id;
              insertedRows++;
            } catch (e: any) {
              const msg = `Row ${idx + 2}: upsert failed (key=${externalId}): ${e.message}`;
              console.error(`[Import] ${msg}`);
              if (errors.length < MAX_ERRORS) errors.push(msg);
            }
          }

          totalInserted += insertedRows;
          allErrors.push(...errors);
          console.log(`[Import] Cities result: parsedRows=${parsedRows}, insertedRows=${insertedRows}, errors=${errors.length}`);
          results.cities = { parsedRows, insertedRows, errors: errors.length > 0 ? errors : undefined };
        }

        // Process Activities
        if (input.activities && input.activities.length > 0) {
          const normalizedActivities = normalizeActivities(input.activities);
          const errors: string[] = [];
          let parsedRows = normalizedActivities.length;
          let insertedRows = 0;
          const missingDestinations: string[] = [];

          console.log(`[Import] --- Activities: ${parsedRows} parsed rows ---`);
          if (normalizedActivities.length > 0) {
            console.log(`[Import] Activities sample row[0] keys: ${Object.keys(input.activities[0]).join(', ')}`);
            console.log(`[Import] Activities normalized row[0]: destinationKey="${normalizedActivities[0].destinationKey}", nameAr="${normalizedActivities[0].nameAr}", type="${normalizedActivities[0].type}"`);
          }

          for (let idx = 0; idx < normalizedActivities.length; idx++) {
            const activity = normalizedActivities[idx];

            if (!activity.destinationKey) {
              const msg = `Row ${idx + 2}: مطلوب: destinationKey (city_id OR destinationId)`;
              if (errors.length < MAX_ERRORS) errors.push(msg);
              continue;
            }
            if (!activity.nameAr) {
              const msg = `Row ${idx + 2}: مطلوب: nameAr (name_ar OR nameAr OR name)`;
              if (errors.length < MAX_ERRORS) errors.push(msg);
              continue;
            }
            if (!activity.type) {
              const msg = `Row ${idx + 2}: مطلوب: type`;
              if (errors.length < MAX_ERRORS) errors.push(msg);
              continue;
            }

            let destinationId: number | null = null;

            const destKeyStr = String(activity.destinationKey).trim();
            if (cityKeyToDatabaseId[destKeyStr]) {
              destinationId = cityKeyToDatabaseId[destKeyStr];
            } else {
              const destination = await db.getDestinationByExternalId(destKeyStr);
              if (destination) {
                destinationId = destination.id;
              } else if (!isNaN(Number(destKeyStr)) && Number(destKeyStr) > 0) {
                const numDestId = Number(destKeyStr);
                try {
                  const destById = await db.getDestinationById(numDestId);
                  if (destById) destinationId = numDestId;
                } catch (_e) {}
              }
              if (!destinationId) {
                const destBySlug = await db.getDestinationBySlug(destKeyStr.toLowerCase().replace(/\s+/g, '-'));
                if (destBySlug) destinationId = destBySlug.id;
              }
              if (!destinationId) {
                const destByName = await db.getDestinationByName(destKeyStr);
                if (destByName) destinationId = destByName.id;
              }
            }

            if (!destinationId) {
              if (!missingDestinations.includes(destKeyStr)) {
                missingDestinations.push(destKeyStr);
              }
              const msg = `Row ${idx + 2}: destinationId "${destKeyStr}" not found (tried: cityKey map, external_id, numeric id, slug, name)`;
              if (errors.length < MAX_ERRORS) errors.push(msg);
              continue;
            }

            const activityKey = activity.activityKey || `activity_${Date.now()}_${idx}`;
            const tags = activity.category ? [activity.category] : [];

            let cost: string;
            if (activity.originalBudgetLevel === 'free') {
              cost = '0';
            } else if (activity.cost) {
              cost = String(activity.cost);
            } else {
              cost = '0';
            }

            const activityData = {
              destinationId,
              name: activity.nameAr,
              nameEn: activity.nameEn,
              type: activity.type || activity.category,
              category: activity.category as any,
              tags,
              details: activity.details,
              detailsEn: activity.detailsEn || '',
              duration: activity.duration ? String(activity.duration) : undefined,
              cost,
              budgetLevel: activity.budgetLevel as any,
              bestTimeOfDay: activity.bestTimeOfDay as any,
              minTier: activity.minTier as any,
              isActive: activity.isActive,
              googleMapsUrl: activity.googleMapsUrl,
            };

            try {
              await db.upsertActivityByExternalId(String(activityKey), activityData);
              insertedRows++;
            } catch (e: any) {
              const msg = `Row ${idx + 2}: upsert failed (key=${activityKey}): ${e.message}`;
              console.error(`[Import] ${msg}`);
              if (errors.length < MAX_ERRORS) errors.push(msg);
            }
          }

          totalInserted += insertedRows;
          allErrors.push(...errors);
          console.log(`[Import] Activities result: parsedRows=${parsedRows}, insertedRows=${insertedRows}, errors=${errors.length}, missingDestinations=${missingDestinations.join(',')}`);
          results.activities = { parsedRows, insertedRows, errors: errors.length > 0 ? errors : undefined, missingDestinations: missingDestinations.length > 0 ? missingDestinations : undefined };
        }

        // Process Accommodations
        if (input.accommodations && input.accommodations.length > 0) {
          const normalizedAccommodations = normalizeAccommodations(input.accommodations);
          const errors: string[] = [];
          let parsedRows = normalizedAccommodations.length;
          let insertedRows = 0;
          const missingDestinations: string[] = [];

          console.log(`[Import] --- Accommodations: ${parsedRows} parsed rows ---`);
          if (normalizedAccommodations.length > 0) {
            console.log(`[Import] Accommodations sample row[0] keys: ${Object.keys(input.accommodations[0]).join(', ')}`);
            console.log(`[Import] Accommodations normalized row[0]: destinationKey="${normalizedAccommodations[0].destinationKey}", nameAr="${normalizedAccommodations[0].nameAr}", class="${normalizedAccommodations[0].class}"`);
          }

          for (let idx = 0; idx < normalizedAccommodations.length; idx++) {
            const acc = normalizedAccommodations[idx];

            if (!acc.destinationKey) {
              const msg = `Row ${idx + 2}: مطلوب: destinationKey (city_id OR destinationId)`;
              if (errors.length < MAX_ERRORS) errors.push(msg);
              continue;
            }
            if (!acc.nameAr) {
              const msg = `Row ${idx + 2}: مطلوب: nameAr (name_ar OR nameAr)`;
              if (errors.length < MAX_ERRORS) errors.push(msg);
              continue;
            }
            if (!acc.class) {
              const msg = `Row ${idx + 2}: مطلوب: class`;
              if (errors.length < MAX_ERRORS) errors.push(msg);
              continue;
            }

            let destinationId: number | null = null;

            const destKeyStr = String(acc.destinationKey).trim();
            if (cityKeyToDatabaseId[destKeyStr]) {
              destinationId = cityKeyToDatabaseId[destKeyStr];
            } else {
              const destination = await db.getDestinationByExternalId(destKeyStr);
              if (destination) {
                destinationId = destination.id;
              } else if (!isNaN(Number(destKeyStr)) && Number(destKeyStr) > 0) {
                const numDestId = Number(destKeyStr);
                try {
                  const destById = await db.getDestinationById(numDestId);
                  if (destById) destinationId = numDestId;
                } catch (_e) {}
              }
              if (!destinationId) {
                const destBySlug = await db.getDestinationBySlug(destKeyStr.toLowerCase().replace(/\s+/g, '-'));
                if (destBySlug) destinationId = destBySlug.id;
              }
              if (!destinationId) {
                const destByName = await db.getDestinationByName(destKeyStr);
                if (destByName) destinationId = destByName.id;
              }
            }

            if (!destinationId) {
              if (!missingDestinations.includes(destKeyStr)) {
                missingDestinations.push(destKeyStr);
              }
              const msg = `Row ${idx + 2}: destinationId "${destKeyStr}" not found (tried: cityKey map, external_id, numeric id, slug, name)`;
              if (errors.length < MAX_ERRORS) errors.push(msg);
              continue;
            }

            const accKey = acc.accommodationKey || `accommodation_${Date.now()}_${idx}`;

            const accData = {
              destinationId,
              nameAr: acc.nameAr,
              nameEn: acc.nameEn,
              descriptionAr: acc.descriptionAr,
              descriptionEn: acc.descriptionEn || '',
              class: (acc.class || 'mid') as any,
              priceRange: acc.priceRange,
              rating: acc.rating ? parseInt(String(acc.rating), 10) : undefined,
              googleMapsUrl: acc.googleMapsUrl,
              isActive: acc.isActive,
            };

            try {
              await db.upsertAccommodationByExternalId(String(accKey), accData);
              insertedRows++;
            } catch (e: any) {
              const msg = `Row ${idx + 2}: upsert failed (key=${accKey}): ${e.message}`;
              console.error(`[Import] ${msg}`);
              if (errors.length < MAX_ERRORS) errors.push(msg);
            }
          }

          totalInserted += insertedRows;
          allErrors.push(...errors);
          console.log(`[Import] Accommodations result: parsedRows=${parsedRows}, insertedRows=${insertedRows}, errors=${errors.length}, missingDestinations=${missingDestinations.join(',')}`);
          results.accommodations = { parsedRows, insertedRows, errors: errors.length > 0 ? errors : undefined, missingDestinations: missingDestinations.length > 0 ? missingDestinations : undefined };
        }

        // Process Restaurants
        if (input.restaurants && input.restaurants.length > 0) {
          const normalizedRows = normalizeRestaurants(input.restaurants);
          const errors: string[] = [];
          let parsedRows = normalizedRows.length;
          let insertedRows = 0;
          const missingDestinations: string[] = [];

          console.log(`[Import] --- Restaurants: ${parsedRows} parsed rows ---`);
          if (normalizedRows.length > 0) {
            console.log(`[Import] Restaurants sample row[0] keys: ${Object.keys(input.restaurants[0]).join(', ')}`);
            console.log(`[Import] Restaurants normalized row[0]: destinationKey="${normalizedRows[0].destinationKey}", name="${normalizedRows[0].name}", cuisine="${normalizedRows[0].cuisine}", specialties=${JSON.stringify(normalizedRows[0].specialties)}`);
          }

          for (let idx = 0; idx < normalizedRows.length; idx++) {
            const row = normalizedRows[idx];

            if (!row.destinationKey) {
              const msg = `Row ${idx + 2}: مطلوب: destinationKey (city_id OR destinationId)`;
              if (errors.length < MAX_ERRORS) errors.push(msg);
              continue;
            }
            if (!row.name) {
              const msg = `Row ${idx + 2}: مطلوب: name`;
              if (errors.length < MAX_ERRORS) errors.push(msg);
              continue;
            }

            let destinationId: number | null = null;
            const destKeyStr = String(row.destinationKey).trim();
            if (cityKeyToDatabaseId[destKeyStr]) {
              destinationId = cityKeyToDatabaseId[destKeyStr];
            } else {
              const destination = await db.getDestinationByExternalId(destKeyStr);
              if (destination) {
                destinationId = destination.id;
              } else if (!isNaN(Number(destKeyStr)) && Number(destKeyStr) > 0) {
                const numDestId = Number(destKeyStr);
                try {
                  const destById = await db.getDestinationById(numDestId);
                  if (destById) destinationId = numDestId;
                } catch (_e) {}
              }
              if (!destinationId) {
                const destBySlug = await db.getDestinationBySlug(destKeyStr.toLowerCase().replace(/\s+/g, '-'));
                if (destBySlug) destinationId = destBySlug.id;
              }
              if (!destinationId) {
                const destByName = await db.getDestinationByName(destKeyStr);
                if (destByName) destinationId = destByName.id;
              }
            }

            if (!destinationId) {
              if (!missingDestinations.includes(destKeyStr)) {
                missingDestinations.push(destKeyStr);
              }
              const msg = `Row ${idx + 2}: destinationId "${destKeyStr}" not found`;
              if (errors.length < MAX_ERRORS) errors.push(msg);
              continue;
            }

            try {
              await db.upsertRestaurantByNameAndCity({
                destinationId,
                name: row.name,
                cuisine: row.cuisine || 'متنوع',
                priceRange: normalizePriceRange(row.priceRange),
                avgPrice: String(row.avgPrice || '0'),
                rating: row.rating ? String(row.rating) : undefined,
                specialties: row.specialties,
                trending: row.trending || undefined,
                location: row.location || undefined,
              });
              insertedRows++;
            } catch (e: any) {
              const msg = `Row ${idx + 2}: upsert failed (name="${row.name}"): ${e.message}`;
              console.error(`[Import] ${msg}`);
              if (errors.length < MAX_ERRORS) errors.push(msg);
            }
          }

          totalInserted += insertedRows;
          allErrors.push(...errors);
          console.log(`[Import] Restaurants result: parsedRows=${parsedRows}, insertedRows=${insertedRows}, errors=${errors.length}`);
          results.restaurants = { parsedRows, insertedRows, errors: errors.length > 0 ? errors : undefined, missingDestinations: missingDestinations.length > 0 ? missingDestinations : undefined };
        }

        console.log(`[Import] ========== BULK IMPORT END: totalParsedRows=${totalParsedRows}, totalInserted=${totalInserted}, totalErrors=${allErrors.length} ==========`);

        if (totalParsedRows > 0 && totalInserted === 0) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Import failed: ${totalParsedRows} rows parsed but 0 rows inserted. Check errors for details.`,
            cause: { results, errors: allErrors.slice(0, MAX_ERRORS) },
          });
        }

        return { ...results, success: true, totalParsedRows, totalInserted };
      }),
  }),

  support: router({
    submit: publicProcedure
      .input(z.object({
        name: z.string().min(2),
        email: z.string().email(),
        subject: z.string().min(2),
        message: z.string().min(10),
      }))
      .mutation(async ({ input }) => {
        const result = await db.createSupportMessage(input);
        return { id: result.id };
      }),
  }),
});

export type AppRouter = typeof appRouter;
