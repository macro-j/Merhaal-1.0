import type { BudgetTier } from "./destinationsData";

export type HotelCity = "Riyadh" | "Jeddah";

export type HotelStyleTag =
  | "central"
  | "business"
  | "family"
  | "heritage"
  | "lifestyle"
  | "luxury"
  | "shopping"
  | "waterfront";

export interface HotelExternalRef {
  provider: string;
  propertyId?: string;
  url: string;
}

export interface HotelKnowledge {
  id: string;
  city: HotelCity;
  nameAr: string;
  nameEn: string;
  budgetLevels: BudgetTier[];
  areaAr: string;
  areaEn: string;
  coordinates?: { lat: number; lng: number };
  familyFriendlyScore: number;
  luxuryLevel: number;
  styleTags: HotelStyleTag[];
  planningNotesAr: string;
  planningNotesEn: string;
  searchQuery: string;
  externalRefs: HotelExternalRef[];
}

export const HOTEL_KNOWLEDGE: readonly HotelKnowledge[] = [
  {
    id: "riyadh-ibis-olaya",
    city: "Riyadh",
    nameAr: "إيبيس الرياض شارع العليا",
    nameEn: "ibis Riyadh Olaya Street",
    budgetLevels: ["budget"],
    areaAr: "العليا",
    areaEn: "Al Olaya",
    coordinates: { lat: 24.71217, lng: 46.67643 },
    familyFriendlyScore: 6,
    luxuryLevel: 2,
    styleTags: ["central", "business", "shopping"],
    planningNotesAr:
      "خيار اقتصادي في العليا يناسب الخطط التي تتركز أنشطتها وسط الرياض.",
    planningNotesEn:
      "A budget option in Al Olaya for itineraries centered in central Riyadh.",
    searchQuery: "ibis Riyadh Olaya Street",
    externalRefs: [
      {
        provider: "accor",
        propertyId: "8100",
        url: "https://all.accor.com/hotel/8100/index.en.shtml",
      },
    ],
  },
  {
    id: "riyadh-centro-olaya",
    city: "Riyadh",
    nameAr: "سنترو العليا من روتانا",
    nameEn: "Centro Olaya by Rotana",
    budgetLevels: ["midRange"],
    areaAr: "العليا",
    areaEn: "Al Olaya",
    coordinates: { lat: 24.693, lng: 46.68417 },
    familyFriendlyScore: 7,
    luxuryLevel: 5,
    styleTags: ["central", "business", "lifestyle", "shopping"],
    planningNotesAr:
      "خيار متوسط مركزي للخطط التي تجمع التسوق والوجهات الحديثة.",
    planningNotesEn:
      "A central mid-range option for shopping and modern-city itineraries.",
    searchQuery: "Centro Olaya by Rotana Riyadh",
    externalRefs: [
      {
        provider: "rotana",
        propertyId: "centro-olaya",
        url: "https://www.rotana.com/centrohotels/kingdomofsaudiarabia/riyadh/centroolaya",
      },
    ],
  },
  {
    id: "riyadh-courtyard-diplomatic-quarter",
    city: "Riyadh",
    nameAr: "كورتيارد الرياض الحي الدبلوماسي",
    nameEn: "Courtyard Riyadh Diplomatic Quarter",
    budgetLevels: ["midRange"],
    areaAr: "الهدا والحي الدبلوماسي",
    areaEn: "Al Hada and Diplomatic Quarter",
    coordinates: { lat: 24.66637, lng: 46.62345 },
    familyFriendlyScore: 8,
    luxuryLevel: 6,
    styleTags: ["family", "heritage", "business"],
    planningNotesAr:
      "خيار متوسط مناسب للعائلات وللخطط القريبة من الدرعية وغرب الرياض.",
    planningNotesEn:
      "A family-friendly mid-range option for Diriyah and western Riyadh plans.",
    searchQuery: "Courtyard Riyadh Diplomatic Quarter",
    externalRefs: [
      {
        provider: "marriott",
        propertyId: "RUHAB",
        url: "https://www.marriott.com/en-us/hotels/ruhab-courtyard-riyadh-diplomatic-quarter/overview/",
      },
    ],
  },
  {
    id: "riyadh-four-seasons-kingdom-centre",
    city: "Riyadh",
    nameAr: "فورسيزونز الرياض في مركز المملكة",
    nameEn: "Four Seasons Hotel Riyadh at Kingdom Centre",
    budgetLevels: ["luxury"],
    areaAr: "العليا ومركز المملكة",
    areaEn: "Al Olaya and Kingdom Centre",
    coordinates: { lat: 24.71138, lng: 46.67431 },
    familyFriendlyScore: 8,
    luxuryLevel: 10,
    styleTags: ["central", "business", "lifestyle", "luxury", "shopping"],
    planningNotesAr:
      "خيار فاخر مركزي للرحلات ذات الطابع الحديث والتسوق الراقي.",
    planningNotesEn:
      "A central luxury option for modern and premium shopping itineraries.",
    searchQuery: "Four Seasons Hotel Riyadh at Kingdom Centre",
    externalRefs: [
      {
        provider: "four-seasons",
        propertyId: "riyadh",
        url: "https://www.fourseasons.com/riyadh/",
      },
    ],
  },
  {
    id: "jeddah-ibis-city-center",
    city: "Jeddah",
    nameAr: "إيبيس جدة سيتي سنتر",
    nameEn: "ibis Jeddah City Center",
    budgetLevels: ["budget"],
    areaAr: "الأندلس",
    areaEn: "Al Andalus",
    coordinates: { lat: 21.55286, lng: 39.17387 },
    familyFriendlyScore: 6,
    luxuryLevel: 2,
    styleTags: ["central", "business", "shopping"],
    planningNotesAr:
      "خيار اقتصادي مركزي يوازن الوصول إلى وسط جدة ومناطق التسوق.",
    planningNotesEn:
      "A central budget option balancing access to downtown and shopping areas.",
    searchQuery: "ibis Jeddah City Center",
    externalRefs: [
      {
        provider: "accor",
        propertyId: "9507",
        url: "https://all.accor.com/hotel/9507/index.en.shtml",
      },
    ],
  },
  {
    id: "jeddah-centro-shaheen",
    city: "Jeddah",
    nameAr: "سنترو شاهين جدة من روتانا",
    nameEn: "Centro Shaheen Jeddah by Rotana",
    budgetLevels: ["midRange"],
    areaAr: "الشرفية وطريق المدينة",
    areaEn: "Al Sharafiyah and Madinah Road",
    coordinates: { lat: 21.52363, lng: 39.18128 },
    familyFriendlyScore: 8,
    luxuryLevel: 5,
    styleTags: ["central", "family", "heritage", "business"],
    planningNotesAr:
      "خيار متوسط مناسب للعائلات وللخطط التي تجمع جدة التاريخية ووسط المدينة.",
    planningNotesEn:
      "A family-friendly mid-range option for Al-Balad and central Jeddah plans.",
    searchQuery: "Centro Shaheen Jeddah by Rotana",
    externalRefs: [
      {
        provider: "rotana",
        propertyId: "centro-shaheen",
        url: "https://www.rotana.com/centrohotels/kingdomofsaudiarabia/jeddah/centroshaheen",
      },
    ],
  },
  {
    id: "jeddah-hyatt-house-sari",
    city: "Jeddah",
    nameAr: "حياة هاوس جدة شارع صاري",
    nameEn: "Hyatt House Jeddah Sari Street",
    budgetLevels: ["midRange"],
    areaAr: "السلامة وشارع صاري",
    areaEn: "Al Salamah and Sari Street",
    coordinates: { lat: 21.57815, lng: 39.15319 },
    familyFriendlyScore: 9,
    luxuryLevel: 5,
    styleTags: ["family", "lifestyle", "shopping"],
    planningNotesAr:
      "خيار متوسط مناسب للعائلات وللخطط التي تتركز شمال ووسط جدة.",
    planningNotesEn:
      "A family-friendly mid-range option for northern and central Jeddah plans.",
    searchQuery: "Hyatt House Jeddah Sari Street",
    externalRefs: [
      {
        provider: "hyatt",
        propertyId: "JEDXR",
        url: "https://www.hyatt.com/hyatt-house/en-US/jedxr-hyatt-house-jeddah-sari-street",
      },
    ],
  },
  {
    id: "jeddah-park-hyatt",
    city: "Jeddah",
    nameAr: "بارك حياة جدة مارينا كلوب وسبا",
    nameEn: "Park Hyatt Jeddah Marina Club and Spa",
    budgetLevels: ["luxury"],
    areaAr: "الحمراء والكورنيش الجنوبي",
    areaEn: "Al Hamra and Southern Corniche",
    coordinates: { lat: 21.51371, lng: 39.1546 },
    familyFriendlyScore: 8,
    luxuryLevel: 10,
    styleTags: ["family", "lifestyle", "luxury", "waterfront"],
    planningNotesAr: "خيار فاخر للخطط التي تركز على الواجهة البحرية ووسط جدة.",
    planningNotesEn:
      "A luxury option for waterfront and central Jeddah itineraries.",
    searchQuery: "Park Hyatt Jeddah Marina Club and Spa",
    externalRefs: [
      {
        provider: "hyatt",
        propertyId: "JEDPH",
        url: "https://www.hyatt.com/park-hyatt/en-US/jedph-park-hyatt-jeddah-marina-club-and-spa",
      },
    ],
  },
];

export function getCuratedHotels(city: HotelCity): HotelKnowledge[] {
  return HOTEL_KNOWLEDGE.filter(hotel => hotel.city === city);
}
