# Marhal Trip - Saudi Travel Planning Application

## Overview
Marhal Trip is a full-stack trip planning application designed for Saudi Arabia. It offers destination guides, activities, accommodations, and an AI-powered trip planning feature. The project aims to provide a comprehensive and personalized travel planning experience within Saudi Arabia, catering to various user tiers with different levels of access and features.

## User Preferences
I want iterative development.
I prefer to be asked before you make any major changes.
I like to be given detailed explanations, especially for complex architectural decisions.
I prefer a communication style that is direct and clear.
Please do not make changes to files outside the `client/` and `server/` directories unless explicitly instructed.
Avoid making changes to the database schema (`drizzle/schema.ts`) without prior discussion.

## System Architecture

### UI/UX Decisions
-   **Color Schemes/Templates**: Not explicitly defined but implies a modern, user-friendly interface.
-   **Layout System**:
    -   `AppShell`: Main responsive layout for authenticated user pages (mobile: sticky top bar + bottom nav; desktop: left sidebar + top header). Includes auth guard.
    -   `AdminLayout`: Separate layout for admin pages.
    -   `Navbar`: Public page top navigation.
-   **User Tier System**: Implemented with Free, Smart, and Professional tiers, each offering different limits on trip duration, activities per day, and saved trips. Professional tier includes PDF export.
-   **Admin Dashboard**: Accessible at `/admin`, providing management interfaces for cities, activities, accommodations, and users.
-   **Accommodation System**: Three-tier classification (economy, mid, luxury) with fields for name, description, price range, and Google Maps integration. Plan generation matches user preferences.

### Technical Implementations
-   **Frontend**: React 19 with TypeScript, Vite 7, and Tailwind CSS 4. Uses TanStack React Query for state management.
-   **Backend**: Express.js with tRPC for type-safe API interactions.
-   **Database**: PostgreSQL with Drizzle ORM. Schema defined in `drizzle/schema.ts`.
-   **Trip Generation**:
    -   Daily itineraries with Arabic day titles and template-based time scheduling.
    -   Activities are strictly city-specific and limited by user tier.
    -   Template-based day scheduling with pre-ordered interleaved activity/meal slots:
        - mealsPerDay=3: breakfast(08:00) → activity → activity → lunch(12:30) → activity → activity → dinner(19:00) → activity (8 items)
        - mealsPerDay=2: activity → activity → lunch(12:30) → activity → activity → dinner(19:00) → activity (7 items)
        - 15-30 min transition gaps between all items; no overlaps by design
        - Activities always ≥60% of day items; no two consecutive restaurants
        - When meal slots can't be filled (no restaurant/low budget), they convert to activity slots
        - Min 3 activities per day guaranteed via placeholder fallback
    -   Stores both `destination` (Arabic) and `destinationEn` (English) in plan JSON for bilingual display.
    -   Each DB-sourced activity in the plan includes `activityId` referencing the activities table. Free fallback and AI-generated activities are text-only (no activityId). Frontend resolves localized name/details/googleMapsUrl via `ActivityLookupMap` from a `destinations.getActivitiesByIds` endpoint. Backward compatible with old plans lacking activityId.
-   **Language-Aware Destination Names**: `getLocalizedName(nameAr, nameEn, language)` utility in `client/src/lib/utils.ts` handles bilingual city/destination display with fallback logic (en prefers nameEn→nameAr; ar prefers nameAr→nameEn). Applied across Home, PlanTrip, TripDetails, MyPlans, SharedTrip, Dashboard, ItineraryView, and PDF export. Backward compatible with older trips missing `destinationEn`.
-   **Activity Metadata**: Enhanced metadata includes `category`, `tags`, `budgetLevel`, and `bestTimeOfDay` for intelligent trip planning.
-   **Restaurant Import**: Optional Restaurants sheet with `mealTags` column for meal-appropriate selection. Tags stored in `specialties` JSON field with `meal:` prefix (no DB schema change). Selection priority: meal-tagged → keyword matching → generic fallback.
-   **Data Seeding/Bulk Import**: Supports XLSX files for bulk import of Cities, Activities, and Accommodations. Features idempotent upserts using `external_id` for unique matching and per-row error reporting.
-   **Share Plan Feature**: Smart and Professional tier users can generate shareable, token-based URLs for their trips.
-   **Server-side PDF Export**: Professional tier users can export trip plans as PDFs. The backend generates PDFs using jsPDF with embedded Arabic fonts, including daily itineraries and accommodation details.

### Feature Specifications
-   **User Management**: Role-based access (admin, regular user) and authentication.
-   **Trip Details Page**: Displays trip header, accommodation, and daily itinerary with Google Maps links. Uses `ItineraryView` shared component with accordion day cards and activity cards.
-   **Itinerary Display**: Shared `ItineraryView` component (`client/src/components/ItineraryView.tsx`) used by both TripDetails and SharedTrip pages. Uses shadcn Accordion for day-level expand/collapse (single-open), with `ActivityCard` sub-components showing time, title, description, category/cost badges, and Google Maps buttons.
-   **Per-Day Dates**: When a trip has `startDate`, each day card shows a computed calendar date (startDate + dayIndex) in locale-aware format (Arabic/English). Graceful degradation for older trips without startDate.
-   **AI Trip Assistant**: Smart and Professional tier users can chat with an AI to modify their trip plan. Uses OpenAI (gpt-4o-mini) or Gemini (gemini-2.0-flash) based on available API keys. Features: chat UI in TripDetails dialog, plan preview before saving, save/revert buttons, Zod validation of AI output, plan size limits. Free tier users see upgrade prompt. Env vars: `OPENAI_API_KEY` or `GEMINI_API_KEY`.
-   **Support System**: Public submission endpoint for support messages and an admin inbox for managing them.

## External Dependencies
-   **PostgreSQL**: Database solution (Replit built-in).
-   **Google Maps**: Integrated for displaying activity and accommodation locations.
-   **jsPDF**: Used on the backend for server-side PDF generation.
-   **OpenAI SDK**: For AI trip assistant (gpt-4o-mini).
-   **@google/generative-ai**: For AI trip assistant (Gemini 2.0 Flash) as alternative to OpenAI.
-   **Vite**: Frontend build tool.
-   **Tailwind CSS**: Utility-first CSS framework.
-   **React**: Frontend library.
-   **Express.js**: Backend web framework.
-   **tRPC**: Type-safe API layer.
-   **Drizzle ORM**: ORM for database interactions.
-   **TanStack React Query**: Data fetching and state management library.