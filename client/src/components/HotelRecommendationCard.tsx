import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import type { BudgetTier } from "@shared/destinationsData";
import type { TripHotel } from "@shared/tripTypes";
import { BedDouble, ExternalLink, MapPin, Search } from "lucide-react";

type LegacyHotelFields = {
  description?: string;
  bookingUrl?: string;
};

interface HotelRecommendationCardProps {
  hotel?: TripHotel;
  destination: string;
}

function budgetLabel(
  tier: BudgetTier | undefined,
  language: "ar" | "en"
): string | null {
  if (!tier) return null;
  if (language === "en") {
    return tier === "budget"
      ? "Budget"
      : tier === "midRange"
        ? "Mid-range"
        : "Luxury";
  }
  return tier === "budget" ? "اقتصادي" : tier === "midRange" ? "متوسط" : "فاخر";
}

function buildSearchUrl(
  hotel: Partial<TripHotel>,
  destination: string
): string {
  const query = hotel.searchQuery || `${hotel.name ?? "hotel"} ${destination}`;
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

export function HotelRecommendationCard({
  hotel,
  destination,
}: HotelRecommendationCardProps) {
  const { language } = useLanguage();
  if (!hotel) return null;

  const legacyHotel = hotel as TripHotel & LegacyHotelFields;
  const name =
    language === "ar" ? hotel.nameAr || hotel.name : hotel.nameEn || hotel.name;
  const area =
    language === "ar" ? hotel.areaAr || hotel.area : hotel.areaEn || hotel.area;
  const reason =
    language === "ar"
      ? hotel.reasonAr || hotel.reason || legacyHotel.description
      : hotel.reasonEn || hotel.reason || legacyHotel.description;
  const tier = budgetLabel(hotel.budgetTier, language);
  const officialUrl =
    hotel.externalRef?.url && /^https:\/\//i.test(hotel.externalRef.url)
      ? hotel.externalRef.url
      : null;

  return (
    <Card
      className="overflow-hidden rounded-lg print:break-inside-avoid print:border print:border-gray-200 print:bg-white print:shadow-none"
      data-testid="hotel-recommendation"
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      <CardHeader className="border-b bg-primary/5 py-4 print:border-gray-200 print:bg-gray-50">
        <CardTitle className="flex items-center gap-2 text-base font-bold print:text-black">
          <BedDouble className="h-4 w-4 text-primary print:text-gray-700" />
          {language === "ar" ? "الإقامة المقترحة" : "Recommended stay"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4 print:text-black">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="font-semibold leading-snug print:text-black">
              {name}
            </h4>
            {area && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground print:text-gray-700">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span>{area}</span>
              </p>
            )}
          </div>
          {tier && <Badge variant="secondary">{tier}</Badge>}
        </div>

        {reason && (
          <p className="text-sm leading-relaxed text-muted-foreground print:text-gray-700">
            {reason}
          </p>
        )}

        <div className="flex flex-wrap gap-2 print:hidden">
          <Button variant="secondary" size="sm" className="gap-1.5" asChild>
            <a
              href={buildSearchUrl(hotel, destination)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Search className="h-3.5 w-3.5" />
              {language === "ar" ? "ابحث عن الفندق" : "Search hotel"}
              <ExternalLink className="h-3 w-3 opacity-60" />
            </a>
          </Button>
          {officialUrl && (
            <Button variant="outline" size="sm" className="gap-1.5" asChild>
              <a href={officialUrl} target="_blank" rel="noopener noreferrer">
                {language === "ar" ? "الموقع الرسمي" : "Official website"}
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
