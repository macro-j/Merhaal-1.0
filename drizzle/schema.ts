import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const destinations = pgTable("destinations", {
  id: serial("id").primaryKey(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  titleAr: text("title_ar").notNull(),
  titleEn: text("title_en").notNull(),
  descriptionAr: text("description_ar").notNull(),
  descriptionEn: text("description_en").notNull(),
  images: jsonb("images").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const trendingPlaces = pgTable(
  "trending_places",
  {
    id: serial("id").primaryKey(),
    destinationId: integer("destination_id")
      .notNull()
      .references(() => destinations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    nameEn: text("name_en"),
    type: varchar("type", { length: 32 }).notNull(),
    area: text("area").notNull(),
    currentVisitors: integer("current_visitors").notNull().default(0),
    durationMinutes: integer("duration_minutes").notNull(),
    costTier: varchar("cost_tier", { length: 16 }).notNull(),
    optimalTimeBlocks: jsonb("optimal_time_blocks").$type<string[]>().notNull().default([]),
    requiresBooking: boolean("requires_booking").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    nameAreaIdx: uniqueIndex("trending_places_name_area_idx").on(table.name, table.area),
  })
);
