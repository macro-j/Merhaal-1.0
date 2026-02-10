import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import * as db from "./db";
import { jsPDF } from "jspdf";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

const __pdfFilename = fileURLToPath(import.meta.url);
const __pdfDirname = path.dirname(__pdfFilename);

let cachedFontBase64: string | null = null;

function loadFont(): string {
  if (cachedFontBase64) return cachedFontBase64;

  const candidates = [
    path.join(__pdfDirname, "assets", "fonts", "Amiri-Regular.ttf"),
    path.join(process.cwd(), "server", "assets", "fonts", "Amiri-Regular.ttf"),
    path.resolve("server", "assets", "fonts", "Amiri-Regular.ttf"),
  ];

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        cachedFontBase64 = fs.readFileSync(p).toString("base64");
        console.log(`[PDF] Font loaded from: ${p}`);
        return cachedFontBase64;
      }
    } catch (e) {
      console.warn(`[PDF] Failed to read font at ${p}:`, e);
    }
  }

  throw new Error(
    `Arabic font file not found. Searched: ${candidates.join(", ")}`
  );
}

type Lang = "ar" | "en";

const labels = {
  ar: {
    title: "خطة رحلة مرحال",
    duration: "المدة",
    oneDay: "يوم واحد",
    days: "أيام",
    budget: "الميزانية",
    startDate: "تاريخ البدء",
    createdAt: "تاريخ الإنشاء",
    accommodation: "الإقامة",
    luxury: "فاخر",
    mid: "متوسط",
    economy: "اقتصادي",
    dailyItinerary: "برنامج الرحلة اليومي",
    footer: "مرحال - رفيقك في السفر داخل السعودية",
    dayFallback: "اليوم",
    dayTitles: [
      "اليوم الأول", "اليوم الثاني", "اليوم الثالث", "اليوم الرابع", "اليوم الخامس",
      "اليوم السادس", "اليوم السابع", "اليوم الثامن", "اليوم التاسع", "اليوم العاشر",
    ],
    dateLocale: "ar-SA",
    errInvalidId: "معرف الخطة غير صالح",
    errAuthRequired: "يجب تسجيل الدخول أولاً",
    errInvalidSession: "جلسة غير صالحة، يرجى تسجيل الدخول مرة أخرى",
    errUserNotFound: "المستخدم غير موجود",
    errTierRequired: "تصدير PDF متاح فقط لمستخدمي الباقة الاحترافية",
    errPlanNotFound: "الخطة غير موجودة أو ليست ملكك",
    errFontLoad: "تعذر تحميل خط اللغة العربية للملف",
    errGeneric: "حدث خطأ أثناء إنشاء الملف",
  },
  en: {
    title: "Marhal Trip Itinerary",
    duration: "Duration",
    oneDay: "1 day",
    days: "days",
    budget: "Budget",
    startDate: "Start Date",
    createdAt: "Created",
    accommodation: "Accommodation",
    luxury: "Luxury",
    mid: "Mid-range",
    economy: "Economy",
    dailyItinerary: "Daily Itinerary",
    footer: "Marhal - Your travel companion in Saudi Arabia",
    dayFallback: "Day",
    dayTitles: [
      "Day 1", "Day 2", "Day 3", "Day 4", "Day 5",
      "Day 6", "Day 7", "Day 8", "Day 9", "Day 10",
    ],
    dateLocale: "en-US",
    errInvalidId: "Invalid plan ID",
    errAuthRequired: "Authentication required",
    errInvalidSession: "Invalid session, please log in again",
    errUserNotFound: "User not found",
    errTierRequired: "PDF export is available for Professional tier only",
    errPlanNotFound: "Plan not found or does not belong to you",
    errFontLoad: "Failed to load Arabic font for PDF",
    errGeneric: "Failed to generate PDF",
  },
} as const;

const router = Router();

router.get("/plans/:id/pdf", async (req: Request, res: Response) => {
  try {
    const tripId = parseInt(req.params.id);
    const lang: Lang = req.query.lang === "en" ? "en" : "ar";
    const t = labels[lang];

    if (isNaN(tripId)) {
      return res.status(400).json({ error: t.errInvalidId });
    }
    const isRTL = lang === "ar";

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: t.errAuthRequired });
    }

    const token = authHeader.substring(7);
    let decoded: { userId: number };
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    } catch {
      return res.status(401).json({ error: t.errInvalidSession });
    }

    const user = await db.getUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: t.errUserNotFound });
    }

    if (user.tier !== "professional") {
      return res.status(403).json({ 
        error: t.errTierRequired,
        code: "TIER_REQUIRED"
      });
    }

    const trips = await db.getUserTrips(decoded.userId);
    const trip = trips.find((t: any) => t.id === tripId);
    
    if (!trip) {
      return res.status(404).json({ error: t.errPlanNotFound });
    }

    let fontData: string;
    try {
      fontData = loadFont();
    } catch (fontErr: any) {
      console.error("[PDF] Font loading failed:", fontErr.message);
      return res.status(500).json({
        error: t.errFontLoad,
      });
    }

    const plan = trip.plan as any;
    const cityNameAr = plan?.destination;
    const cityNameEn = plan?.destinationEn;
    const cityName = lang === 'en'
      ? (cityNameEn || cityNameAr || `Trip #${trip.id}`)
      : (cityNameAr || cityNameEn || `رحلة #${trip.id}`);

    const activityIds = new Set<number>();
    for (const day of plan?.dailyPlan || []) {
      for (const act of day.activities || []) {
        if (act.activityId) activityIds.add(act.activityId);
      }
    }
    const activitiesLookup: Record<number, any> = {};
    if (activityIds.size > 0) {
      const dbActivities = await db.getActivitiesByIds(Array.from(activityIds));
      for (const a of dbActivities) {
        activitiesLookup[a.id] = a;
      }
    }

    const doc = new jsPDF();
    const pageWidth = 210;
    const leftMargin = 20;
    const rightMargin = pageWidth - 20;
    const textX = isRTL ? rightMargin : leftMargin;
    const align = isRTL ? "right" as const : "left" as const;
    const indent = isRTL ? -10 : 10;
    const indent2 = isRTL ? -5 : 5;
    let y = 25;

    doc.addFileToVFS("Amiri-Regular.ttf", fontData);
    doc.addFont("Amiri-Regular.ttf", "Amiri", "normal");
    doc.setFont("Amiri");

    doc.setFontSize(22);
    doc.text(t.title, textX, y, { align });
    y += 12;

    doc.setFontSize(16);
    doc.text(cityName, textX, y, { align });
    y += 10;

    doc.setFontSize(11);
    const daysText = trip.days === 1 ? t.oneDay : `${trip.days} ${t.days}`;
    doc.text(`${t.duration}: ${daysText}`, textX, y, { align });
    y += 7;

    if (trip.budget) {
      doc.text(`${t.budget}: ${trip.budget}`, textX, y, { align });
      y += 7;
    }

    if (trip.startDate) {
      try {
        const startD = new Date(trip.startDate + "T00:00:00");
        if (!isNaN(startD.getTime())) {
          const startStr = startD.toLocaleDateString(t.dateLocale, {
            year: "numeric",
            month: "long",
            day: "numeric",
          });
          doc.text(`${t.startDate}: ${startStr}`, textX, y, { align });
          y += 7;
        }
      } catch {}
    }

    const dateStr = new Date(trip.createdAt).toLocaleDateString(t.dateLocale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    doc.text(`${t.createdAt}: ${dateStr}`, textX, y, { align });
    y += 15;

    if (plan?.accommodation) {
      doc.setFontSize(13);
      doc.text(t.accommodation, textX, y, { align });
      y += 8;
      doc.setFontSize(10);
      doc.text(plan.accommodation.name || "", textX + indent, y, { align });
      y += 6;
      const classLabel = plan.accommodation.class === 'luxury' ? t.luxury : 
                         plan.accommodation.class === 'mid' ? t.mid : t.economy;
      const priceInfo = plan.accommodation.priceRange ? ` | ${plan.accommodation.priceRange}` : '';
      doc.text(`${classLabel}${priceInfo}`, textX + indent, y, { align });
      y += 12;
    } else if (plan?.noAccommodationMessage) {
      doc.setFontSize(13);
      doc.text(t.accommodation, textX, y, { align });
      y += 8;
      doc.setFontSize(10);
      doc.text(plan.noAccommodationMessage, textX + indent, y, { align });
      y += 12;
    }

    doc.setDrawColor(180);
    doc.line(leftMargin, y, rightMargin, y);
    y += 8;

    doc.setFontSize(14);
    doc.text(t.dailyItinerary, textX, y, { align });
    y += 12;

    plan?.dailyPlan?.forEach((day: any, dayIdx: number) => {
      if (y > 250) {
        doc.addPage();
        doc.setFont("Amiri");
        y = 25;
      }

      doc.setFontSize(12);
      const dayTitle = day.title || t.dayTitles[dayIdx] || `${t.dayFallback} ${dayIdx + 1}`;
      let dayDateStr = '';
      if (trip.startDate) {
        try {
          const start = new Date(trip.startDate + 'T00:00:00');
          if (!isNaN(start.getTime())) {
            const dayDate = new Date(start);
            dayDate.setDate(dayDate.getDate() + dayIdx);
            dayDateStr = ' — ' + dayDate.toLocaleDateString(t.dateLocale, {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            });
          }
        } catch {}
      }
      doc.text(dayTitle + dayDateStr, textX, y, { align });
      y += 9;

      doc.setFontSize(9);
      day.activities?.forEach((activity: any) => {
        if (y > 270) {
          doc.addPage();
          doc.setFont("Amiri");
          y = 25;
        }

        const timeStr = activity.time || "";
        const period = activity.period || "";

        const dbAct = activity.activityId ? activitiesLookup[activity.activityId] : undefined;
        let activityName: string;
        let activityDesc: string | undefined;
        if (dbAct) {
          activityName = lang === 'en'
            ? (dbAct.nameEn || dbAct.name || activity.activity || '')
            : (dbAct.name || dbAct.nameEn || activity.activity || '');
          const detailsLocalized = lang === 'en'
            ? (dbAct.detailsEn || dbAct.details)
            : (dbAct.details || dbAct.detailsEn);
          activityDesc = detailsLocalized || activity.description;
        } else {
          activityName = activity.activity || activity.name || "";
          activityDesc = activity.description;
        }
        const costStr = activity.cost ? ` (${activity.cost})` : "";

        doc.text(`${period} ${timeStr} - ${activityName}${costStr}`, textX + indent2, y, { align });
        y += 6;

        if (activityDesc) {
          const desc = activityDesc.length > 70 
            ? activityDesc.substring(0, 67) + "..." 
            : activityDesc;
          doc.setTextColor(100);
          doc.text(desc, textX + indent, y, { align });
          doc.setTextColor(0);
          y += 6;
        }
        y += 2;
      });
      y += 6;
    });

    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(t.footer, pageWidth / 2, 285, { align: "center" });

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="merhaal-trip-${trip.id}-${lang}.pdf"`);
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error("[PDF] Export error:", error?.stack || error);
    const safeDetail = error?.message && !error.message.includes("/")
      ? error.message
      : undefined;
    const fallbackT = labels[((req.query.lang as string) === "en" ? "en" : "ar")];
    res.status(500).json({
      error: fallbackT.errGeneric,
      ...(safeDetail && { detail: safeDetail }),
    });
  }
});

export { router as pdfExportRouter };
