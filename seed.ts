import { eq, sql } from "drizzle-orm";
import { pathToFileURL } from "node:url";
import { db, queryClient } from "./db";
import { destinations, trendingPlaces } from "./drizzle/schema";

export type TrendingPlaceType =
  | "cafe"
  | "dining"
  | "shopping"
  | "entertainment"
  | "nature"
  | "modern"
  | "family"
  | "adventure"
  | "luxury";

export type CostTier = "اقتصادية" | "متوسطة" | "فاخرة";

export type OptimalTimeBlock = "الصباح" | "الظهر" | "المساء" | "الليل";

export type RiyadhTrendingPlaceSeed = {
  name: string;
  nameEn?: string;
  type: TrendingPlaceType;
  area: string;
  currentVisitors: number;
  durationMinutes: number;
  costTier: CostTier;
  optimalTimeBlocks: OptimalTimeBlock[];
  requiresBooking: boolean;
};

export const riyadhTrendingPlacesSeed: RiyadhTrendingPlaceSeed[] = [
  { name: "كيكسترز", nameEn: "Kicksters", type: "cafe", area: "الملقا", currentVisitors: 127, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء", "الليل"], requiresBooking: false },
  { name: "اوف ذا إيرث", nameEn: "OffTheEarth", type: "dining", area: "النخيل", currentVisitors: 117, durationMinutes: 120, costTier: "فاخرة", optimalTimeBlocks: ["المساء", "الليل"], requiresBooking: true },
  { name: "أوريجن كوفي روسترز لاب", nameEn: "ORIGIN COFFEE ROASTERS LAB", type: "cafe", area: "حطين", currentVisitors: 99, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "الظهر", "المساء"], requiresBooking: false },
  { name: "المملكة سوشيال داينينغ", nameEn: "Al Mamlaka Social Dining", type: "dining", area: "العليا", currentVisitors: 93, durationMinutes: 120, costTier: "فاخرة", optimalTimeBlocks: ["الظهر", "المساء", "الليل"], requiresBooking: true },
  { name: "همبلي", nameEn: "Humbly", type: "dining", area: "المحمدية", currentVisitors: 92, durationMinutes: 120, costTier: "فاخرة", optimalTimeBlocks: ["الظهر", "المساء", "الليل"], requiresBooking: true },
  { name: "برج المملكة", nameEn: "Kingdom Tower", type: "modern", area: "العليا", currentVisitors: 84, durationMinutes: 120, costTier: "متوسطة", optimalTimeBlocks: ["المساء", "الليل"], requiresBooking: false },
  { name: "محمصة خطوة جمل", nameEn: "Camel Step Roasters", type: "cafe", area: "الرحمانية", currentVisitors: 82, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "الظهر", "المساء"], requiresBooking: false },
  { name: "ذا هيلث بار باي راو", nameEn: "The Health Bar by RAW", type: "dining", area: "الملقا", currentVisitors: 80, durationMinutes: 75, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "الظهر", "المساء"], requiresBooking: false },
  { name: "مركز المملكة", nameEn: "Kingdom Centre", type: "shopping", area: "العليا", currentVisitors: 77, durationMinutes: 150, costTier: "متوسطة", optimalTimeBlocks: ["الظهر", "المساء", "الليل"], requiresBooking: false },
  { name: "مدينة الرياض", nameEn: "Riyadh City", type: "modern", area: "الرياض", currentVisitors: 75, durationMinutes: 120, costTier: "اقتصادية", optimalTimeBlocks: ["الصباح", "الظهر", "المساء"], requiresBooking: false },
  { name: "بيكس - ذا تنت", nameEn: "PEÁKS - The Tent", type: "cafe", area: "الرحمانية", currentVisitors: 75, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["المساء", "الليل"], requiresBooking: false },
  { name: "ليتل هنري", nameEn: "LITTLE HENRI", type: "dining", area: "المروج", currentVisitors: 75, durationMinutes: 120, costTier: "فاخرة", optimalTimeBlocks: ["الظهر", "المساء", "الليل"], requiresBooking: true },
  { name: "هجين", nameEn: "Hjeen", type: "dining", area: "المحمدية", currentVisitors: 69, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الظهر", "المساء", "الليل"], requiresBooking: false },
  { name: "بي فت الربيع", nameEn: "B_FIT", type: "adventure", area: "الربيع", currentVisitors: 63, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء"], requiresBooking: false },
  { name: "جو جريك جامعة الملك سعود", nameEn: "Go Greek", type: "dining", area: "جامعة الملك سعود", currentVisitors: 61, durationMinutes: 75, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "الظهر", "المساء"], requiresBooking: false },
  { name: "دو آي دو", nameEn: "do I do", type: "cafe", area: "النزهة", currentVisitors: 59, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء", "الليل"], requiresBooking: false },
  { name: "جو جريك النزهة", nameEn: "Go Greek", type: "dining", area: "النزهة", currentVisitors: 57, durationMinutes: 75, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "الظهر", "المساء"], requiresBooking: false },
  { name: "فيني", nameEn: "Veni", type: "cafe", area: "الملك سلمان", currentVisitors: 55, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء", "الليل"], requiresBooking: false },
  { name: "ناب النرجس", nameEn: "nāp", type: "cafe", area: "النرجس", currentVisitors: 55, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء", "الليل"], requiresBooking: false },
  { name: "سوليتير مول", nameEn: "Solitaire Mall", type: "shopping", area: "الصحافة", currentVisitors: 54, durationMinutes: 180, costTier: "فاخرة", optimalTimeBlocks: ["الظهر", "المساء", "الليل"], requiresBooking: false },
  { name: "بيلمونت كوفي هاوس حطين", nameEn: "Belmont Coffee House", type: "cafe", area: "حطين", currentVisitors: 52, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء", "الليل"], requiresBooking: false },
  { name: "أوريجن كوفي روسترز", nameEn: "ORIGIN COFFEE ROASTERS", type: "cafe", area: "حطين", currentVisitors: 51, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "الظهر", "المساء"], requiresBooking: false },
  { name: "كايزو", nameEn: "Kayzo", type: "dining", area: "السليمانية", currentVisitors: 51, durationMinutes: 120, costTier: "فاخرة", optimalTimeBlocks: ["المساء", "الليل"], requiresBooking: true },
  { name: "إل بي إم", nameEn: "LPM", type: "dining", area: "العليا", currentVisitors: 50, durationMinutes: 120, costTier: "فاخرة", optimalTimeBlocks: ["الظهر", "المساء", "الليل"], requiresBooking: true },
  { name: "نوفمبر كوفي", nameEn: "November Coffee", type: "cafe", area: "الملقا", currentVisitors: 49, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء", "الليل"], requiresBooking: false },
  { name: "بي تي دبليو باي ذا واي المحمدية", nameEn: "BTW By The Way", type: "cafe", area: "المحمدية", currentVisitors: 49, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء", "الليل"], requiresBooking: false },
  { name: "قمر", nameEn: "AMAR", type: "dining", area: "المعذر الشمالي", currentVisitors: 48, durationMinutes: 120, costTier: "فاخرة", optimalTimeBlocks: ["الظهر", "المساء", "الليل"], requiresBooking: true },
  { name: "بيلمونت كوفي هاوس المحمدية", nameEn: "BELMONT Coffee House", type: "cafe", area: "المحمدية", currentVisitors: 44, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء", "الليل"], requiresBooking: false },
  { name: "سم كوفي بار", nameEn: "SOME COFFEE BAR", type: "cafe", area: "المروج", currentVisitors: 42, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء", "الليل"], requiresBooking: false },
  { name: "بليس آند بيبول", nameEn: "Place & People", type: "cafe", area: "الملقا", currentVisitors: 40, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء", "الليل"], requiresBooking: false },
  { name: "31 ديسمبر", nameEn: "31 DEC", type: "cafe", area: "المروج", currentVisitors: 40, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء", "الليل"], requiresBooking: false },
  { name: "سيكا كوفي روستري", nameEn: "SICA COFFEE ROASTERY", type: "cafe", area: "الريان", currentVisitors: 40, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "الظهر", "المساء"], requiresBooking: false },
  { name: "كوين آن", nameEn: "Queen Anne", type: "cafe", area: "الملقا", currentVisitors: 40, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء"], requiresBooking: false },
  { name: "نورم", nameEn: "norm", type: "cafe", area: "الملقا", currentVisitors: 40, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء", "الليل"], requiresBooking: false },
  { name: "الوعل البري", nameEn: "Alwaal Albari", type: "dining", area: "العليا", currentVisitors: 39, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الظهر", "المساء", "الليل"], requiresBooking: false },
  { name: "ذا سفت", nameEn: "The Sift", type: "cafe", area: "حطين", currentVisitors: 39, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "الظهر", "المساء"], requiresBooking: false },
  { name: "إنفاكت", nameEn: "Infact", type: "cafe", area: "المحمدية", currentVisitors: 38, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء"], requiresBooking: false },
  { name: "فام", nameEn: "fam.", type: "cafe", area: "المروج", currentVisitors: 37, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء"], requiresBooking: false },
  { name: "حَوي", nameEn: "Hawi", type: "cafe", area: "الملقا", currentVisitors: 37, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء", "الليل"], requiresBooking: false },
  { name: "تشيبرياني دولتشي", nameEn: "Cipriani Dolci", type: "dining", area: "السفارات", currentVisitors: 36, durationMinutes: 120, costTier: "فاخرة", optimalTimeBlocks: ["الظهر", "المساء", "الليل"], requiresBooking: true },
  { name: "كراز سبيشالتي كوفي", nameEn: "Kraz Speciality Coffee", type: "cafe", area: "النزهة", currentVisitors: 34, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء"], requiresBooking: false },
  { name: "ناب القيروان", nameEn: "nāp", type: "cafe", area: "القيروان", currentVisitors: 34, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء", "الليل"], requiresBooking: false },
  { name: "مكث", nameEn: "mkth", type: "cafe", area: "غرناطة", currentVisitors: 33, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء"], requiresBooking: false },
  { name: "دبسي", nameEn: "Dibsy", type: "cafe", area: "المعذر الشمالي", currentVisitors: 33, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء"], requiresBooking: false },
  { name: "وادي حنيفة", nameEn: "Hanifa Valley", type: "nature", area: "وادي حنيفة", currentVisitors: 32, durationMinutes: 150, costTier: "اقتصادية", optimalTimeBlocks: ["الصباح", "المساء"], requiresBooking: false },
  { name: "كورو", nameEn: "Kuuru", type: "dining", area: "العقيق", currentVisitors: 32, durationMinutes: 120, costTier: "فاخرة", optimalTimeBlocks: ["المساء", "الليل"], requiresBooking: true },
  { name: "إكسير البن كافيه", nameEn: "Elixir Bunn Coffee Roasters", type: "cafe", area: "النخيل", currentVisitors: 31, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "الظهر", "المساء"], requiresBooking: false },
  { name: "اتموسفير", nameEn: "ATMOSPHERE", type: "cafe", area: "الملك فهد", currentVisitors: 31, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء", "الليل"], requiresBooking: false },
  { name: "ايفن ذو", nameEn: "Even Thu", type: "cafe", area: "النفل", currentVisitors: 31, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء"], requiresBooking: false },
  { name: "لا أوت", nameEn: "La Haut", type: "dining", area: "أم الحمام الشرقي", currentVisitors: 31, durationMinutes: 120, costTier: "فاخرة", optimalTimeBlocks: ["الظهر", "المساء", "الليل"], requiresBooking: true },
  { name: "باب", nameEn: "Bab", type: "cafe", area: "المحمدية", currentVisitors: 30, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء"], requiresBooking: false },
  { name: "نول كوفي روسترز", nameEn: "Knoll Coffee Roasters", type: "cafe", area: "الازدهار", currentVisitors: 29, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء"], requiresBooking: false },
  { name: "جيم نيشن", nameEn: "GymNation", type: "adventure", area: "الحمراء", currentVisitors: 29, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء"], requiresBooking: false },
  { name: "فوكس سينما", nameEn: "VOX Cinemas", type: "entertainment", area: "العليا", currentVisitors: 28, durationMinutes: 150, costTier: "متوسطة", optimalTimeBlocks: ["الظهر", "المساء", "الليل"], requiresBooking: true },
  { name: "آوت أوف لاين", nameEn: "Out Of Line", type: "cafe", area: "المحمدية", currentVisitors: 27, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء"], requiresBooking: false },
  { name: "كروبس", nameEn: "Crops", type: "dining", area: "النرجس", currentVisitors: 27, durationMinutes: 75, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "الظهر", "المساء"], requiresBooking: false },
  { name: "جست أنذر", nameEn: "JUST ANOTHER.", type: "cafe", area: "حطين", currentVisitors: 25, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء"], requiresBooking: false },
  { name: "حي النرجس", nameEn: "An Narjis District", type: "modern", area: "النرجس", currentVisitors: 25, durationMinutes: 120, costTier: "اقتصادية", optimalTimeBlocks: ["المساء", "الليل"], requiresBooking: false },
  { name: "دا نونا النخيل", nameEn: "DA NONNA", type: "dining", area: "النخيل", currentVisitors: 25, durationMinutes: 120, costTier: "متوسطة", optimalTimeBlocks: ["الظهر", "المساء", "الليل"], requiresBooking: true },
  { name: "شَمْل", nameEn: "Shml", type: "cafe", area: "القيروان", currentVisitors: 25, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء"], requiresBooking: false },
  { name: "جود نيبر", nameEn: "Good Neighbor", type: "dining", area: "العليا", currentVisitors: 25, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الظهر", "المساء"], requiresBooking: false },
  { name: "فيو", nameEn: "VEO", type: "cafe", area: "حطين", currentVisitors: 25, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء"], requiresBooking: false },
  { name: "أوبتيمو", nameEn: "Optimo", type: "modern", area: "الملقا", currentVisitors: 24, durationMinutes: 120, costTier: "متوسطة", optimalTimeBlocks: ["الظهر", "المساء"], requiresBooking: false },
  { name: "إن تو فتنس النخيل", nameEn: "In2Fitness", type: "adventure", area: "النخيل", currentVisitors: 24, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء"], requiresBooking: false },
  { name: "حصيلة", nameEn: "Hasila", type: "cafe", area: "الملقا", currentVisitors: 23, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء"], requiresBooking: false },
  { name: "بِك النخيل", nameEn: "PICK", type: "dining", area: "النخيل", currentVisitors: 23, durationMinutes: 75, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "الظهر", "المساء"], requiresBooking: false },
  { name: "ميازو", nameEn: "Myazū", type: "dining", area: "السليمانية", currentVisitors: 23, durationMinutes: 120, costTier: "فاخرة", optimalTimeBlocks: ["المساء", "الليل"], requiresBooking: true },
  { name: "بيلونغ سبيشالتي كوفي", nameEn: "BELONG Speciality Coffee", type: "cafe", area: "النزهة", currentVisitors: 23, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء"], requiresBooking: false },
  { name: "بيكس - ذا كيف", nameEn: "PEÁKS - The Cave", type: "cafe", area: "المحمدية", currentVisitors: 22, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["المساء", "الليل"], requiresBooking: false },
  { name: "بولينغ إنتركونتيننتال الرياض", nameEn: "InterContinental Riyadh Bowling Alley", type: "entertainment", area: "المعذر", currentVisitors: 21, durationMinutes: 120, costTier: "متوسطة", optimalTimeBlocks: ["الظهر", "المساء", "الليل"], requiresBooking: true },
  { name: "همبلي المعذر الشمالي", nameEn: "Humbly", type: "dining", area: "المعذر الشمالي", currentVisitors: 21, durationMinutes: 120, costTier: "فاخرة", optimalTimeBlocks: ["الظهر", "المساء", "الليل"], requiresBooking: true },
  { name: "فابريكا دي كافيه", nameEn: "Fabrica De Cafe", type: "cafe", area: "حطين", currentVisitors: 21, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء"], requiresBooking: false },
  { name: "أور إلس", nameEn: "OR ELSE", type: "cafe", area: "القدس", currentVisitors: 21, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء"], requiresBooking: false },
  { name: "إنر سيركل", nameEn: "Inner Circle", type: "cafe", area: "النخيل", currentVisitors: 21, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء"], requiresBooking: false },
  { name: "بي تي دبليو باي ذا واي المروج", nameEn: "BTW By The Way", type: "cafe", area: "المروج", currentVisitors: 20, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء"], requiresBooking: false },
  { name: "فليم محمصة وقهوة مختصة", nameEn: "FLAME Specialty Coffee & Roasters", type: "cafe", area: "الريان", currentVisitors: 20, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء"], requiresBooking: false },
  { name: "يا هلا لاونج", nameEn: "YA HALA LOUNGE", type: "entertainment", area: "الملقا", currentVisitors: 20, durationMinutes: 120, costTier: "متوسطة", optimalTimeBlocks: ["المساء", "الليل"], requiresBooking: true },
  { name: "الفلمنكي", nameEn: "Al Falamanki", type: "dining", area: "الملقا", currentVisitors: 20, durationMinutes: 120, costTier: "فاخرة", optimalTimeBlocks: ["الظهر", "المساء", "الليل"], requiresBooking: true },
  { name: "باكس", nameEn: "PAX", type: "cafe", area: "النخيل", currentVisitors: 20, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء"], requiresBooking: false },
  { name: "البهو النرجس", nameEn: "AlBahw Riyadh Narjis", type: "cafe", area: "النرجس", currentVisitors: 19, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء"], requiresBooking: false },
  { name: "شّري", nameEn: "Shari Coffee", type: "cafe", area: "العليا", currentVisitors: 19, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء"], requiresBooking: false },
  { name: "توبيز إستيت كوفي روسترز", nameEn: "TOBY’S ESTATE Coffee Roasters", type: "cafe", area: "حطين", currentVisitors: 19, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "الظهر", "المساء"], requiresBooking: false },
  { name: "تروث كوفي روستري", nameEn: "TRUTH Coffee Roastery", type: "cafe", area: "القدس", currentVisitors: 19, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء"], requiresBooking: false },
  { name: "حي الملقا", nameEn: "Al Malqa District", type: "modern", area: "الملقا", currentVisitors: 18, durationMinutes: 120, costTier: "اقتصادية", optimalTimeBlocks: ["المساء", "الليل"], requiresBooking: false },
  { name: "بيكس النخيل", nameEn: "PEÁKS", type: "cafe", area: "النخيل", currentVisitors: 18, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["المساء", "الليل"], requiresBooking: false },
  { name: "حَـيْ كوفي آند روسترز", nameEn: "HAI Coffee & Roasters", type: "cafe", area: "الروضة", currentVisitors: 18, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء"], requiresBooking: false },
  { name: "بي فت الياسمين", nameEn: "B_FIT", type: "adventure", area: "الياسمين", currentVisitors: 18, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء"], requiresBooking: false },
  { name: "قهوة مُبهرة", nameEn: "Mubhirah Coffee", type: "cafe", area: "التخصصي", currentVisitors: 18, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء"], requiresBooking: false },
  { name: "بانوراما مول", nameEn: "Panorama Mall", type: "shopping", area: "المعذر الشمالي", currentVisitors: 17, durationMinutes: 150, costTier: "متوسطة", optimalTimeBlocks: ["الظهر", "المساء", "الليل"], requiresBooking: false },
  { name: "ليسن فالي", nameEn: "Laysen Valley", type: "modern", area: "أم الحمام الغربي", currentVisitors: 17, durationMinutes: 150, costTier: "فاخرة", optimalTimeBlocks: ["الظهر", "المساء", "الليل"], requiresBooking: false },
  { name: "إن تو فتنس غرناطة", nameEn: "IN2 Fitness", type: "adventure", area: "غرناطة", currentVisitors: 17, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء"], requiresBooking: false },
  { name: "بي فت الريان", nameEn: "B_FIT", type: "adventure", area: "الريان", currentVisitors: 17, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء"], requiresBooking: false },
  { name: "ممشى طريق الملك عبدالله", nameEn: "King Abdullah Road Walk", type: "nature", area: "حي الملك سلمان", currentVisitors: 15, durationMinutes: 90, costTier: "اقتصادية", optimalTimeBlocks: ["الصباح", "المساء"], requiresBooking: false },
  { name: "غندورة", nameEn: "Ghandoura", type: "dining", area: "النزهة", currentVisitors: 15, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الظهر", "المساء"], requiresBooking: false },
  { name: "دا نونا المرقب", nameEn: "DA NONNA", type: "dining", area: "المرقب", currentVisitors: 13, durationMinutes: 120, costTier: "متوسطة", optimalTimeBlocks: ["الظهر", "المساء", "الليل"], requiresBooking: true },
  { name: "سان كارلو شيكتي", nameEn: "San Carlo Cicchetti", type: "dining", area: "السليمانية", currentVisitors: 13, durationMinutes: 120, costTier: "فاخرة", optimalTimeBlocks: ["المساء", "الليل"], requiresBooking: true },
  { name: "بي فت وومن", nameEn: "B_Fit Women", type: "adventure", area: "الريان", currentVisitors: 13, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء"], requiresBooking: false },
  { name: "لوكيل", nameEn: "Locale", type: "cafe", area: "الملك سلمان", currentVisitors: 13, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء"], requiresBooking: false },
  { name: "بِك المغرزات", nameEn: "PICK", type: "dining", area: "المغرزات", currentVisitors: 12, durationMinutes: 75, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "الظهر", "المساء"], requiresBooking: false },
  { name: "هيل سبيشالتي كوفي", nameEn: "Heal. Speciality Coffee", type: "cafe", area: "القدس", currentVisitors: 12, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء"], requiresBooking: false },
  { name: "نمق", nameEn: "namq", type: "cafe", area: "غرناطة", currentVisitors: 10, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء"], requiresBooking: false },
  { name: "سنيور ساسي", nameEn: "Signor Sassi", type: "dining", area: "السليمانية", currentVisitors: 10, durationMinutes: 120, costTier: "فاخرة", optimalTimeBlocks: ["المساء", "الليل"], requiresBooking: true },
  { name: "جون آند ڤينيز", nameEn: "Jon & Vinny's", type: "dining", area: "السليمانية", currentVisitors: 10, durationMinutes: 120, costTier: "فاخرة", optimalTimeBlocks: ["الظهر", "المساء", "الليل"], requiresBooking: true },
  { name: "سمبل", nameEn: "smpl.", type: "cafe", area: "السلام", currentVisitors: 9, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء"], requiresBooking: false },
  { name: "وقت اللياقة", nameEn: "Fitness Time", type: "adventure", area: "حي الملك سلمان", currentVisitors: 9, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء"], requiresBooking: false },
  { name: "محمصة كيرفر", nameEn: "CURVE R", type: "cafe", area: "الربوة", currentVisitors: 9, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء"], requiresBooking: false },
  { name: "دا نونا الريان", nameEn: "DA NONNA", type: "dining", area: "الريان", currentVisitors: 9, durationMinutes: 120, costTier: "متوسطة", optimalTimeBlocks: ["الظهر", "المساء", "الليل"], requiresBooking: true },
  { name: "النخيل مول", nameEn: "Al Nakheel Mall", type: "shopping", area: "المغرزات", currentVisitors: 8, durationMinutes: 150, costTier: "متوسطة", optimalTimeBlocks: ["الظهر", "المساء", "الليل"], requiresBooking: false },
  { name: "موذهلة كوفي آند تولز", nameEn: "Mothhelah Coffee & tools", type: "cafe", area: "الريان", currentVisitors: 7, durationMinutes: 90, costTier: "متوسطة", optimalTimeBlocks: ["الصباح", "المساء"], requiresBooking: false },
];

async function getOrCreateRiyadhDestination(): Promise<number> {
  const existing = await db
    .select({ id: destinations.id })
    .from(destinations)
    .where(eq(destinations.nameAr, "الرياض"))
    .limit(1);

  if (existing[0]) return existing[0].id;

  const inserted = await db
    .insert(destinations)
    .values({
      nameAr: "الرياض",
      nameEn: "Riyadh",
      titleAr: "الرياض - قلب المملكة النابض",
      titleEn: "Riyadh - The Vibrant Heart of the Kingdom",
      descriptionAr:
        "عاصمة تجمع بين التراث العريق والحداثة المتقدمة، ووجهة نابضة للمطاعم والمقاهي وتجارب اللايف ستايل.",
      descriptionEn:
        "A capital blending deep heritage, modern energy, and a fast-moving lifestyle scene of dining, coffee, and premium experiences.",
      images: ["/images/cities/riyadh-hero.jpg"],
    })
    .returning({ id: destinations.id });

  return inserted[0].id;
}

export async function seedRiyadhTrendingPlaces(): Promise<void> {
  const riyadhId = await getOrCreateRiyadhDestination();
  const now = new Date();

  await db
    .insert(trendingPlaces)
    .values(
      riyadhTrendingPlacesSeed.map((place) => ({
        destinationId: riyadhId,
        name: place.name,
        nameEn: place.nameEn,
        type: place.type,
        area: place.area,
        currentVisitors: place.currentVisitors,
        durationMinutes: place.durationMinutes,
        costTier: place.costTier,
        optimalTimeBlocks: place.optimalTimeBlocks,
        requiresBooking: place.requiresBooking,
        updatedAt: now,
      }))
    )
    .onConflictDoUpdate({
      target: [trendingPlaces.name, trendingPlaces.area],
      set: {
        nameEn: sql`excluded.name_en`,
        type: sql`excluded.type`,
        currentVisitors: sql`excluded.current_visitors`,
        durationMinutes: sql`excluded.duration_minutes`,
        costTier: sql`excluded.cost_tier`,
        optimalTimeBlocks: sql`excluded.optimal_time_blocks`,
        requiresBooking: sql`excluded.requires_booking`,
        updatedAt: now,
      },
    });

  console.log(`Seeded ${riyadhTrendingPlacesSeed.length} Riyadh trending places.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedRiyadhTrendingPlaces()
    .catch((error) => {
      console.error("Failed to seed Riyadh trending places:", error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await queryClient.end();
    });
}
