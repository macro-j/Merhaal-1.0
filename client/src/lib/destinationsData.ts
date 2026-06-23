export type DestinationCategory =
  | "heritage"
  | "modern"
  | "dining"
  | "nature"
  | "entertainment"
  | "shopping"
  | "family"
  | "adventure"
  | "luxury";

export type TimeBlock = "morning" | "afternoon" | "evening" | "night";

export type BudgetTier = "budget" | "midRange" | "luxury";

export type AudienceFit = "families" | "couples" | "friends" | "solo" | "business";

export type InterestTag =
  | "culture"
  | "heritage"
  | "shopping"
  | "entertainment"
  | "family"
  | "kids"
  | "food"
  | "restaurants"
  | "adventure"
  | "sports"
  | "nature"
  | "relaxation";

export type DestinationPlace = {
  id: string;
  name: string;
  arabicName: string;
  englishName: string;
  category: DestinationCategory;
  area: string;
  recommendedTime: TimeBlock[];
  budgetLevel: BudgetTier[];
  bestFor: AudienceFit[];
  interests: InterestTag[];
  mapSearchQuery: string;
  shortDescription: string;
  planningNotes: string;
};

export type DestinationKnowledge = {
  canonicalName: string;
  arabicName: string;
  englishName: string;
  aliases: string[];
  places: DestinationPlace[];
};

const RIYADH: DestinationKnowledge = {
  canonicalName: "Riyadh",
  arabicName: "الرياض",
  englishName: "Riyadh",
  aliases: ["riyadh", "الرياض", "ar riyadh", "ar-riyadh", "arriyadh"],
  places: [
    {
      id: "riyadh-at-turaif",
      name: "At-Turaif World Heritage Site, Diriyah",
      arabicName: "حي الطريف بالدرعية",
      englishName: "At-Turaif World Heritage Site, Diriyah",
      category: "heritage",
      area: "Diriyah",
      recommendedTime: ["morning", "evening"],
      budgetLevel: ["budget", "midRange", "luxury"],
      bestFor: ["families", "couples", "friends", "solo"],
      interests: ["culture", "heritage"],
      mapSearchQuery: "At-Turaif World Heritage Site, Diriyah",
      shortDescription:
        "موقع تراث عالمي يضم أزقة طينية وقصوراً تاريخية تروي نشأة الدولة السعودية الأولى.",
      planningNotes:
        "الأفضل صباحاً أو قبل الغروب لتفادي الحر، ويجاور مطل البجيري مما يسهل دمج العشاء أو القهوة بعد الجولة.",
    },
    {
      id: "riyadh-bujairi",
      name: "Bujairi Terrace, Diriyah",
      arabicName: "مطل البجيري",
      englishName: "Bujairi Terrace, Diriyah",
      category: "dining",
      area: "Diriyah",
      recommendedTime: ["evening", "night"],
      budgetLevel: ["midRange", "luxury"],
      bestFor: ["families", "couples", "friends"],
      interests: ["food", "restaurants", "entertainment", "culture"],
      mapSearchQuery: "Bujairi Terrace, Diriyah",
      shortDescription:
        "وجهة طعام راقية تطل على حي الطريف وتضم مطاعم عالمية ومحلية بأجواء مسائية مميزة.",
      planningNotes: "مثالي للعشاء مباشرة بعد زيارة الطريف، احجز مسبقاً في المطاعم الراقية.",
    },
    {
      id: "riyadh-boulevard-world",
      name: "Boulevard World Riyadh",
      arabicName: "بوليفارد وورلد",
      englishName: "Boulevard World Riyadh",
      category: "entertainment",
      area: "Hittin / Riyadh Season Zone",
      recommendedTime: ["evening", "night"],
      budgetLevel: ["midRange", "luxury"],
      bestFor: ["families", "friends", "couples"],
      interests: ["entertainment", "shopping", "family", "food"],
      mapSearchQuery: "Boulevard World Riyadh",
      shortDescription:
        "وجهة ترفيهية ضخمة تحاكي مدن العالم ببحيرة وعروض ومطاعم متنوعة ضمن موسم الرياض.",
      planningNotes: "أنشطة مسائية فقط، تحقق من مواعيد التشغيل الموسمية قبل التخطيط.",
    },
    {
      id: "riyadh-via",
      name: "VIA Riyadh",
      arabicName: "ڤيا رياض",
      englishName: "VIA Riyadh",
      category: "luxury",
      area: "Northern Riyadh",
      recommendedTime: ["evening", "night"],
      budgetLevel: ["luxury"],
      bestFor: ["couples", "friends", "business"],
      interests: ["entertainment", "shopping", "food", "restaurants"],
      mapSearchQuery: "VIA Riyadh",
      shortDescription:
        "وجهة لايف ستايل فاخرة تضم مطاعم عالمية راقية وسينما بوتيك ومتاجر مختارة.",
      planningNotes: "مناسب لأمسية فاخرة، يلائم تفضيلات الإقامة الفاخرة وذوّاقي الطعام.",
    },
    {
      id: "riyadh-kafd",
      name: "King Abdullah Financial District (KAFD)",
      arabicName: "مركز الملك عبدالله المالي",
      englishName: "King Abdullah Financial District",
      category: "modern",
      area: "Northern Riyadh",
      recommendedTime: ["afternoon", "evening"],
      budgetLevel: ["midRange", "luxury"],
      bestFor: ["business", "couples", "friends"],
      interests: ["entertainment", "shopping", "food"],
      mapSearchQuery: "King Abdullah Financial District, Riyadh",
      shortDescription:
        "حي مالي حديث بناطحات سحاب أيقونية وممشى معلق ومطاعم ومقاهٍ عصرية.",
      planningNotes: "يجمع بين الأنشطة العصرية والطعام، مناسب بعد الظهر والمساء.",
    },
    {
      id: "riyadh-suhail",
      name: "Suhail Riyadh",
      arabicName: "مطعم سهيل الرياض",
      englishName: "Suhail Restaurant, Riyadh",
      category: "dining",
      area: "Northern Riyadh",
      recommendedTime: ["evening", "night"],
      budgetLevel: ["luxury"],
      bestFor: ["couples", "business", "friends"],
      interests: ["food", "restaurants"],
      mapSearchQuery: "Suhail Restaurant, Riyadh",
      shortDescription:
        "مطعم فاخر يقدم مطبخاً عالمياً راقياً بإطلالة مميزة، خيار مثالي لعشاء استثنائي.",
      planningNotes: "للميزانية الفاخرة فقط، يتطلب حجزاً مسبقاً.",
    },
    {
      id: "riyadh-myazu",
      name: "Myazu Riyadh",
      arabicName: "ميازو الرياض",
      englishName: "Myazu Riyadh",
      category: "dining",
      area: "Al Olaya",
      recommendedTime: ["evening", "night"],
      budgetLevel: ["luxury"],
      bestFor: ["couples", "business", "friends"],
      interests: ["food", "restaurants"],
      mapSearchQuery: "Myazu Riyadh",
      shortDescription:
        "مطعم ياباني راقٍ معروف بأطباقه الفاخرة وأجوائه الأنيقة في قلب العليا.",
      planningNotes: "خيار عشاء فاخر، يناسب الميزانية العالية وعشاق المطبخ الآسيوي.",
    },
    {
      id: "riyadh-wadi-hanifah",
      name: "Wadi Hanifah, Riyadh",
      arabicName: "وادي حنيفة",
      englishName: "Wadi Hanifah",
      category: "nature",
      area: "Western Riyadh / Diriyah",
      recommendedTime: ["morning", "evening"],
      budgetLevel: ["budget", "midRange", "luxury"],
      bestFor: ["families", "friends", "solo", "couples"],
      interests: ["nature", "relaxation", "family"],
      mapSearchQuery: "Wadi Hanifah, Riyadh",
      shortDescription:
        "وادٍ أخضر ممتد بمسارات للمشي وبحيرات ومناطق خضراء مثالية للاسترخاء وسط الطبيعة.",
      planningNotes: "ممتع صباحاً أو قبل المغرب، قريب من الدرعية فيسهل دمجه بيوم الطريف.",
    },
    {
      id: "riyadh-national-museum",
      name: "National Museum of Saudi Arabia",
      arabicName: "المتحف الوطني السعودي",
      englishName: "National Museum of Saudi Arabia",
      category: "heritage",
      area: "Al Murabba",
      recommendedTime: ["morning", "afternoon"],
      budgetLevel: ["budget", "midRange", "luxury"],
      bestFor: ["families", "solo", "couples", "friends"],
      interests: ["culture", "heritage", "family", "kids"],
      mapSearchQuery: "National Museum of Saudi Arabia, Riyadh",
      shortDescription:
        "متحف وطني يعرض تاريخ الجزيرة العربية والمملكة عبر قاعات تفاعلية ومقتنيات نادرة.",
      planningNotes: "نشاط داخلي مكيّف مناسب لفترة الظهيرة الحارة وللعائلات.",
    },
    {
      id: "riyadh-kingdom-centre",
      name: "Kingdom Centre Tower",
      arabicName: "برج المملكة",
      englishName: "Kingdom Centre Tower",
      category: "modern",
      area: "Al Olaya",
      recommendedTime: ["evening", "night"],
      budgetLevel: ["midRange", "luxury"],
      bestFor: ["families", "couples", "friends"],
      interests: ["shopping", "entertainment", "food"],
      mapSearchQuery: "Kingdom Centre Tower, Riyadh",
      shortDescription:
        "برج أيقوني يضم جسر السماء بإطلالة بانورامية على الرياض ومركز تسوق راقٍ.",
      planningNotes: "أجمل عند الغروب أو ليلاً لمشاهدة المدينة من جسر السماء.",
    },
  ],
};

const JEDDAH: DestinationKnowledge = {
  canonicalName: "Jeddah",
  arabicName: "جدة",
  englishName: "Jeddah",
  aliases: ["jeddah", "جدة", "jedda", "jiddah"],
  places: [
    {
      id: "jeddah-al-balad",
      name: "Historic Jeddah (Al-Balad)",
      arabicName: "جدة التاريخية البلد",
      englishName: "Historic Jeddah Al-Balad",
      category: "heritage",
      area: "Al-Balad",
      recommendedTime: ["morning", "evening"],
      budgetLevel: ["budget", "midRange", "luxury"],
      bestFor: ["families", "couples", "friends", "solo"],
      interests: ["culture", "heritage"],
      mapSearchQuery: "Al-Balad, Historic Jeddah",
      shortDescription:
        "حي تاريخي مسجّل في التراث العالمي ببيوت الروشان الخشبية والأسواق العتيقة.",
      planningNotes: "أجمل صباحاً أو مساءً، تجوّل سيراً واجمعه مع مطعم قريب في البلد.",
    },
    {
      id: "jeddah-yacht-club",
      name: "Jeddah Yacht Club",
      arabicName: "نادي جدة لليخوت",
      englishName: "Jeddah Yacht Club",
      category: "luxury",
      area: "Jeddah Waterfront",
      recommendedTime: ["evening", "night"],
      budgetLevel: ["luxury"],
      bestFor: ["couples", "friends", "business"],
      interests: ["entertainment", "food", "restaurants", "relaxation"],
      mapSearchQuery: "Jeddah Yacht Club",
      shortDescription:
        "وجهة بحرية فاخرة بمراسٍ لليخوت ومطاعم راقية وأجواء مسائية أنيقة على البحر الأحمر.",
      planningNotes: "أمسية فاخرة على الواجهة، مثالي للميزانية العالية وعشاء راقٍ.",
    },
    {
      id: "jeddah-waterfront",
      name: "Jeddah Waterfront",
      arabicName: "واجهة جدة البحرية",
      englishName: "Jeddah Waterfront",
      category: "family",
      area: "Jeddah Corniche",
      recommendedTime: ["evening", "night"],
      budgetLevel: ["budget", "midRange", "luxury"],
      bestFor: ["families", "friends", "couples"],
      interests: ["family", "nature", "relaxation", "entertainment"],
      mapSearchQuery: "Jeddah Waterfront",
      shortDescription:
        "كورنيش حديث ممتد بمسارات مشي ونوافير ومناطق ألعاب ومطاعم على البحر الأحمر.",
      planningNotes: "أفضل وقت المساء لاعتدال الجو، مناسب جداً للعائلات.",
    },
    {
      id: "jeddah-fakieh-aquarium",
      name: "Fakieh Aquarium",
      arabicName: "فقيه أكواريوم",
      englishName: "Fakieh Aquarium, Jeddah",
      category: "family",
      area: "Jeddah Corniche",
      recommendedTime: ["afternoon", "evening"],
      budgetLevel: ["budget", "midRange", "luxury"],
      bestFor: ["families", "friends"],
      interests: ["family", "kids", "entertainment"],
      mapSearchQuery: "Fakieh Aquarium, Jeddah",
      shortDescription:
        "حوض أحياء بحرية يضم مئات الأنواع وعروض الدلافين، تجربة مثالية للأطفال والعائلات.",
      planningNotes: "نشاط داخلي مناسب للظهيرة، قريب من الكورنيش فيسهل دمجه بيوم بحري.",
    },
    {
      id: "jeddah-khayal",
      name: "Khayal Restaurant Jeddah",
      arabicName: "مطعم خيال جدة",
      englishName: "Khayal Restaurant, Jeddah",
      category: "dining",
      area: "Northern Jeddah",
      recommendedTime: ["evening", "night"],
      budgetLevel: ["luxury"],
      bestFor: ["couples", "business", "friends"],
      interests: ["food", "restaurants"],
      mapSearchQuery: "Khayal Restaurant, Jeddah",
      shortDescription:
        "مطعم فاخر يقدم تجربة طعام راقية بأجواء أنيقة، خيار مميز لعشاء استثنائي في جدة.",
      planningNotes: "للميزانية الفاخرة، يُفضّل الحجز المسبق.",
    },
    {
      id: "jeddah-angelina",
      name: "Angelina Jeddah",
      arabicName: "أنجلينا جدة",
      englishName: "Angelina, Jeddah",
      category: "dining",
      area: "Jeddah Waterfront / Mall",
      recommendedTime: ["afternoon", "evening"],
      budgetLevel: ["midRange", "luxury"],
      bestFor: ["couples", "families", "friends"],
      interests: ["food", "restaurants", "relaxation"],
      mapSearchQuery: "Angelina, Jeddah",
      shortDescription:
        "مقهى ومطعم باريسي شهير معروف بالشوكولاتة الساخنة والحلويات الراقية.",
      planningNotes: "مثالي لاستراحة قهوة وحلى بعد الظهر أو مساءً.",
    },
    {
      id: "jeddah-red-sea-mall",
      name: "Red Sea Mall Jeddah",
      arabicName: "رد سي مول جدة",
      englishName: "Red Sea Mall, Jeddah",
      category: "shopping",
      area: "Northern Jeddah",
      recommendedTime: ["afternoon", "evening"],
      budgetLevel: ["midRange", "luxury"],
      bestFor: ["families", "friends", "couples"],
      interests: ["shopping", "entertainment", "family", "food"],
      mapSearchQuery: "Red Sea Mall, Jeddah",
      shortDescription:
        "أحد أكبر مراكز التسوق في جدة بعلامات عالمية ومنطقة ترفيه ومطاعم متنوعة.",
      planningNotes: "نشاط داخلي مكيّف مناسب للظهيرة الحارة والتسوق.",
    },
    {
      id: "jeddah-al-rahma-mosque",
      name: "Al Rahma Mosque (Floating Mosque)",
      arabicName: "مسجد الرحمة جدة",
      englishName: "Al Rahma Mosque, Jeddah",
      category: "heritage",
      area: "Jeddah Corniche",
      recommendedTime: ["morning", "evening"],
      budgetLevel: ["budget", "midRange", "luxury"],
      bestFor: ["families", "couples", "solo"],
      interests: ["culture", "heritage", "relaxation"],
      mapSearchQuery: "Al Rahma Mosque, Jeddah",
      shortDescription:
        "المسجد العائم على مياه البحر الأحمر، معلم معماري خلاب خصوصاً وقت الغروب.",
      planningNotes: "زيارة قصيرة تُدمج بسهولة مع جولة الكورنيش، أجمل عند الغروب.",
    },
  ],
};

const TAIF: DestinationKnowledge = {
  canonicalName: "Taif",
  arabicName: "الطائف",
  englishName: "Taif",
  aliases: ["taif", "الطائف", "al taif", "al-taif", "at taif"],
  places: [
    {
      id: "taif-al-hada",
      name: "Al Hada Mountain",
      arabicName: "جبل الهدا",
      englishName: "Al Hada Mountain, Taif",
      category: "nature",
      area: "Al Hada",
      recommendedTime: ["morning", "afternoon"],
      budgetLevel: ["budget", "midRange", "luxury"],
      bestFor: ["families", "couples", "friends"],
      interests: ["nature", "adventure", "relaxation"],
      mapSearchQuery: "Al Hada, Taif",
      shortDescription:
        "جبل شهير بطريقه الملتوي وإطلالاته الخلابة وأجوائه الباردة وتلفريك الهدا.",
      planningNotes: "أجمل صباحاً لصفاء الرؤية، يُدمج مع الشفا في يوم جبلي واحد.",
    },
    {
      id: "taif-al-shafa",
      name: "Al Shafa",
      arabicName: "الشفا",
      englishName: "Al Shafa, Taif",
      category: "nature",
      area: "Al Shafa",
      recommendedTime: ["morning", "afternoon"],
      budgetLevel: ["budget", "midRange", "luxury"],
      bestFor: ["families", "couples", "friends"],
      interests: ["nature", "relaxation", "adventure"],
      mapSearchQuery: "Al Shafa, Taif",
      shortDescription:
        "مرتفعات خضراء بمزارع الفواكه والورد وأجواء جبلية باردة ومطلات بانورامية.",
      planningNotes: "قريب من الهدا، مثالي لرحلة جبلية تجمع الطبيعة والمزارع.",
    },
    {
      id: "taif-al-rudaf-park",
      name: "Al Rudaf Park",
      arabicName: "منتزه الردف",
      englishName: "Al Rudaf Park, Taif",
      category: "family",
      area: "Central Taif",
      recommendedTime: ["afternoon", "evening"],
      budgetLevel: ["budget", "midRange"],
      bestFor: ["families", "friends"],
      interests: ["family", "kids", "nature", "relaxation"],
      mapSearchQuery: "Al Rudaf Park, Taif",
      shortDescription:
        "حديقة واسعة بصخور جرانيتية ومساحات خضراء ومناطق ألعاب مناسبة للعائلات.",
      planningNotes: "نشاط عائلي مسائي قريب من وسط المدينة.",
    },
    {
      id: "taif-shubra-palace",
      name: "Shubra Palace",
      arabicName: "قصر شبرا",
      englishName: "Shubra Palace, Taif",
      category: "heritage",
      area: "Central Taif",
      recommendedTime: ["morning", "afternoon"],
      budgetLevel: ["budget", "midRange", "luxury"],
      bestFor: ["families", "couples", "solo"],
      interests: ["culture", "heritage"],
      mapSearchQuery: "Shubra Palace, Taif",
      shortDescription:
        "قصر تاريخي بطراز معماري مميز يضم متحفاً يوثّق تاريخ الطائف والمنطقة.",
      planningNotes: "نشاط ثقافي داخلي مناسب لوسط النهار، قريب من قلب الطائف.",
    },
    {
      id: "taif-rose-farms",
      name: "Taif Rose Farms",
      arabicName: "مزارع الورد الطائفي",
      englishName: "Taif Rose Farm",
      category: "nature",
      area: "Al Hada / Al Shafa",
      recommendedTime: ["morning"],
      budgetLevel: ["budget", "midRange", "luxury"],
      bestFor: ["families", "couples", "friends"],
      interests: ["nature", "culture", "relaxation"],
      mapSearchQuery: "Taif Rose Farm",
      shortDescription:
        "مزارع الورد الطائفي الشهير حيث يُقطف ويُقطّر، تجربة عطرية أصيلة خاصة في الربيع.",
      planningNotes: "الأفضل صباحاً وموسم الورد ربيعاً، يُدمج مع يوم الجبال.",
    },
    {
      id: "taif-terra-mall",
      name: "Terra Mall Taif",
      arabicName: "تيرا مول الطائف",
      englishName: "Terra Mall, Taif",
      category: "shopping",
      area: "Central Taif",
      recommendedTime: ["afternoon", "evening"],
      budgetLevel: ["midRange", "luxury"],
      bestFor: ["families", "friends", "couples"],
      interests: ["shopping", "entertainment", "food", "family"],
      mapSearchQuery: "Terra Mall, Taif",
      shortDescription:
        "مركز تسوق عصري بعلامات تجارية ومطاعم ومنطقة ترفيه مناسبة للعائلات.",
      planningNotes: "نشاط داخلي مكيّف مناسب للظهيرة أو المساء.",
    },
    {
      id: "taif-heart-of-taif",
      name: "Heart of Taif",
      arabicName: "قلب الطائف",
      englishName: "Heart of Taif",
      category: "entertainment",
      area: "Central Taif",
      recommendedTime: ["evening", "night"],
      budgetLevel: ["budget", "midRange", "luxury"],
      bestFor: ["families", "friends", "couples"],
      interests: ["entertainment", "shopping", "food", "family"],
      mapSearchQuery: "Heart of Taif",
      shortDescription:
        "وجهة ترفيهية حيوية بمطاعم ومقاهٍ وفعاليات وأجواء مسائية نابضة وسط الطائف.",
      planningNotes: "أمسية مناسبة للعائلات والأصدقاء بعد يوم في الجبال.",
    },
  ],
};

const ABHA: DestinationKnowledge = {
  canonicalName: "Abha",
  arabicName: "أبها",
  englishName: "Abha",
  aliases: ["abha", "أبها", "aseer", "asir", "عسير"],
  places: [
    {
      id: "abha-high-city",
      name: "High City Abha",
      arabicName: "المدينة العالية أبها",
      englishName: "High City, Abha",
      category: "entertainment",
      area: "Al Soudah Road",
      recommendedTime: ["afternoon", "evening"],
      budgetLevel: ["midRange", "luxury"],
      bestFor: ["families", "couples", "friends"],
      interests: ["entertainment", "nature", "family", "food"],
      mapSearchQuery: "High City, Abha",
      shortDescription:
        "وجهة جبلية مرتفعة بإطلالات بانورامية ومطاعم ومقاهٍ ومناطق ترفيه فوق الغيوم.",
      planningNotes: "أجمل قبل الغروب لمشاهدة بحر الغيوم، يُدمج مع السودة.",
    },
    {
      id: "abha-al-soudah",
      name: "Al Soudah",
      arabicName: "السودة",
      englishName: "Al Soudah, Abha",
      category: "nature",
      area: "Al Soudah",
      recommendedTime: ["morning", "afternoon"],
      budgetLevel: ["budget", "midRange", "luxury"],
      bestFor: ["families", "couples", "friends", "solo"],
      interests: ["nature", "adventure", "relaxation"],
      mapSearchQuery: "Al Soudah, Abha",
      shortDescription:
        "أعلى قمم المملكة بغاباتها الكثيفة وأجوائها الباردة وإطلالاتها على السحب.",
      planningNotes: "صباحاً لصفاء الجو، نقطة انطلاق للتلفريك والمشي بين الأشجار.",
    },
    {
      id: "abha-soudah-cable-car",
      name: "Al Soudah Cable Car",
      arabicName: "تلفريك السودة",
      englishName: "Al Soudah Cable Car",
      category: "adventure",
      area: "Al Soudah",
      recommendedTime: ["morning", "afternoon"],
      budgetLevel: ["midRange", "luxury"],
      bestFor: ["families", "couples", "friends"],
      interests: ["adventure", "nature", "family", "kids"],
      mapSearchQuery: "Al Soudah Cable Car, Abha",
      shortDescription:
        "تلفريك يهبط من قمم السودة نحو رجال ألمع بإطلالات جبلية مذهلة على المنحدرات.",
      planningNotes: "تحقق من مواعيد التشغيل والطقس، يُدمج مع السودة ورجال ألمع.",
    },
    {
      id: "abha-al-muftaha",
      name: "Al Muftaha Village",
      arabicName: "قرية المفتاحة",
      englishName: "Al Muftaha Village, Abha",
      category: "heritage",
      area: "Central Abha",
      recommendedTime: ["afternoon", "evening"],
      budgetLevel: ["budget", "midRange"],
      bestFor: ["families", "couples", "solo", "friends"],
      interests: ["culture", "heritage", "entertainment"],
      mapSearchQuery: "Al Muftaha Village, Abha",
      shortDescription:
        "حي فني وثقافي بمعارض ومسرح وعمارة عسيرية ملوّنة يحتفي بالإبداع المحلي.",
      planningNotes: "يُدمج مع شارع الفن المجاور في جولة ثقافية مسائية.",
    },
    {
      id: "abha-art-street",
      name: "Art Street Abha",
      arabicName: "شارع الفن أبها",
      englishName: "Art Street, Abha",
      category: "entertainment",
      area: "Central Abha",
      recommendedTime: ["evening", "night"],
      budgetLevel: ["budget", "midRange"],
      bestFor: ["couples", "friends", "families", "solo"],
      interests: ["culture", "entertainment", "relaxation"],
      mapSearchQuery: "Art Street, Abha",
      shortDescription:
        "ممشى فني نابض باللوحات والجداريات والمقاهي والفعاليات الثقافية المسائية.",
      planningNotes: "أمسية ثقافية مثالية، قريب من قرية المفتاحة.",
    },
    {
      id: "abha-abu-kheyal-park",
      name: "Abu Kheyal Park",
      arabicName: "منتزه أبو خيال",
      englishName: "Abu Kheyal Park, Abha",
      category: "family",
      area: "Abha Lake",
      recommendedTime: ["afternoon", "evening"],
      budgetLevel: ["budget", "midRange"],
      bestFor: ["families", "friends"],
      interests: ["family", "kids", "nature", "relaxation"],
      mapSearchQuery: "Abu Kheyal Park, Abha",
      shortDescription:
        "منتزه مطل على سد أبها بإطلالات خضراء ومناطق جلوس وألعاب مناسبة للعائلات.",
      planningNotes: "نشاط عائلي مسائي مطل على بحيرة أبها.",
    },
    {
      id: "abha-rijal-almaa",
      name: "Rijal Almaa Heritage Village",
      arabicName: "قرية رجال ألمع التراثية",
      englishName: "Rijal Almaa Heritage Village",
      category: "heritage",
      area: "Rijal Almaa",
      recommendedTime: ["morning", "afternoon"],
      budgetLevel: ["budget", "midRange", "luxury"],
      bestFor: ["families", "couples", "solo", "friends"],
      interests: ["culture", "heritage"],
      mapSearchQuery: "Rijal Almaa Heritage Village",
      shortDescription:
        "قرية تراثية مدرجة بمبانيها الحجرية الملونة المتراصة على سفح الجبل، أيقونة عسير.",
      planningNotes: "تبعد عن وسط أبها فخصّص لها نصف يوم، تُدمج مع نزول التلفريك.",
    },
  ],
};

const ALULA: DestinationKnowledge = {
  canonicalName: "AlUla",
  arabicName: "العلا",
  englishName: "AlUla",
  aliases: ["alula", "al ula", "al-ula", "العلا", "ula"],
  places: [
    {
      id: "alula-hegra",
      name: "Hegra (Madain Salih)",
      arabicName: "الحجر مدائن صالح",
      englishName: "Hegra, AlUla",
      category: "heritage",
      area: "Hegra Archaeological Zone",
      recommendedTime: ["morning", "afternoon"],
      budgetLevel: ["midRange", "luxury"],
      bestFor: ["families", "couples", "friends", "solo"],
      interests: ["culture", "heritage", "adventure"],
      mapSearchQuery: "Hegra, AlUla",
      shortDescription:
        "أول موقع سعودي في التراث العالمي، مقابر نبطية منحوتة في الصخر تعود لآلاف السنين.",
      planningNotes: "تُزار بجولة منظّمة (Rawi)، الأفضل صباحاً لتفادي حرارة الظهيرة.",
    },
    {
      id: "alula-elephant-rock",
      name: "Elephant Rock (Jabal AlFil)",
      arabicName: "جبل الفيل العلا",
      englishName: "Elephant Rock, AlUla",
      category: "nature",
      area: "AlUla Valley",
      recommendedTime: ["evening", "night"],
      budgetLevel: ["budget", "midRange", "luxury"],
      bestFor: ["families", "couples", "friends"],
      interests: ["nature", "relaxation", "family"],
      mapSearchQuery: "Elephant Rock, AlUla",
      shortDescription:
        "تكوين صخري طبيعي على شكل فيل بمنطقة جلوس رملية، ساحر وقت الغروب والأمسيات.",
      planningNotes: "أجمل عند الغروب مع جلسات خارجية، نشاط مسائي مريح.",
    },
    {
      id: "alula-maraya",
      name: "Maraya AlUla",
      arabicName: "مرايا العلا",
      englishName: "Maraya, AlUla",
      category: "luxury",
      area: "Ashar Valley",
      recommendedTime: ["evening", "night"],
      budgetLevel: ["luxury"],
      bestFor: ["couples", "business", "friends"],
      interests: ["entertainment", "culture", "food", "restaurants"],
      mapSearchQuery: "Maraya, AlUla",
      shortDescription:
        "أكبر مبنى مكسو بالمرايا في العالم، صرح ثقافي يستضيف عروضاً ومطعماً راقياً بإطلالة وادي عشار.",
      planningNotes: "أمسية فاخرة، تحقق من جدول العروض والحجوزات مسبقاً.",
    },
    {
      id: "alula-old-town",
      name: "AlUla Old Town",
      arabicName: "البلدة القديمة في العلا",
      englishName: "AlUla Old Town",
      category: "heritage",
      area: "AlUla Old Town",
      recommendedTime: ["evening", "night"],
      budgetLevel: ["budget", "midRange", "luxury"],
      bestFor: ["families", "couples", "friends", "solo"],
      interests: ["culture", "heritage", "food"],
      mapSearchQuery: "AlUla Old Town",
      shortDescription:
        "بلدة طينية تاريخية بأزقتها المرمّمة ومتاجرها الحرفية ومقاهيها، نابضة في المساء.",
      planningNotes: "أجمل مساءً بالإضاءة الدافئة، تُدمج مع عشاء في المنطقة.",
    },
    {
      id: "alula-dadan-ikmah",
      name: "Dadan and Jabal Ikmah",
      arabicName: "دادان وجبل عكمة",
      englishName: "Dadan and Jabal Ikmah, AlUla",
      category: "heritage",
      area: "Dadan",
      recommendedTime: ["morning", "afternoon"],
      budgetLevel: ["midRange", "luxury"],
      bestFor: ["couples", "solo", "friends", "families"],
      interests: ["culture", "heritage"],
      mapSearchQuery: "Dadan, AlUla",
      shortDescription:
        "عاصمة مملكتي دادان ولحيان وجبل عكمة المكتبة المفتوحة بنقوشه الأثرية النادرة.",
      planningNotes: "جولة أثرية صباحية تُدمج مع الحجر في يوم تراثي.",
    },
    {
      id: "alula-harrat-viewpoint",
      name: "Harrat Viewpoint",
      arabicName: "مطل الحرة العلا",
      englishName: "Harrat Uwayrid Viewpoint, AlUla",
      category: "nature",
      area: "Harrat Uwayrid",
      recommendedTime: ["evening", "night"],
      budgetLevel: ["midRange", "luxury"],
      bestFor: ["couples", "friends", "solo"],
      interests: ["nature", "adventure", "relaxation"],
      mapSearchQuery: "Harrat Viewpoint, AlUla",
      shortDescription:
        "مطل بركاني مرتفع يطل على واحة العلا، مثالي لغروب الشمس ورصد النجوم ليلاً.",
      planningNotes: "أمسية طبيعية، الطريق جبلي فخطّط للوصول قبل الغروب.",
    },
    {
      id: "alula-oasis-trail",
      name: "Oasis Heritage Trail",
      arabicName: "مسار الواحة العلا",
      englishName: "AlUla Oasis Heritage Trail",
      category: "nature",
      area: "AlUla Oasis",
      recommendedTime: ["morning", "evening"],
      budgetLevel: ["budget", "midRange", "luxury"],
      bestFor: ["families", "couples", "friends", "solo"],
      interests: ["nature", "heritage", "relaxation"],
      mapSearchQuery: "AlUla Oasis Heritage Trail",
      shortDescription:
        "مسار مظلل وسط نخيل الواحة ومزارع الحمضيات، نزهة هادئة تربط البلدة القديمة بالطبيعة.",
      planningNotes: "ممتع صباحاً أو قبل الغروب، يُدمج مع البلدة القديمة.",
    },
  ],
};

export const DESTINATIONS_KNOWLEDGE: DestinationKnowledge[] = [
  RIYADH,
  JEDDAH,
  TAIF,
  ABHA,
  ALULA,
];

export function normalizeText(value: string): string {
  return (value || "")
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0640]/g, "") // Arabic diacritics + tatweel
    .replace(/[إأآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}\s]/gu, " ") // drop punctuation
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Resolve a user-entered destination (Arabic or English, with aliases) into the
 * matching curated knowledge object. Returns null when the destination is unknown.
 */
export function resolveDestination(destination: string): DestinationKnowledge | null {
  const needle = normalizeText(destination);
  if (!needle) return null;

  for (const knowledge of DESTINATIONS_KNOWLEDGE) {
    const candidates = [
      knowledge.canonicalName,
      knowledge.arabicName,
      knowledge.englishName,
      ...knowledge.aliases,
    ].map(normalizeText);

    if (candidates.some((c) => c === needle || needle.includes(c) || c.includes(needle))) {
      return knowledge;
    }
  }

  return null;
}

export function normalizeAccommodation(accommodationType: string): BudgetTier {
  const value = normalizeText(accommodationType);
  if (
    value.includes("فاخر") ||
    value.includes("luxury") ||
    value.includes("luxurious") ||
    value.includes("premium")
  ) {
    return "luxury";
  }
  if (
    value.includes("اقتصادي") ||
    value.includes("budget") ||
    value.includes("economy") ||
    value.includes("economic")
  ) {
    return "budget";
  }
  return "midRange";
}

/**
 * Interpret the TOTAL trip budget into a quality tier by estimating the daily
 * discretionary budget after accounting for accommodation and meals. The tier is
 * a feasibility/quality signal, not a spending target.
 */
export function getBudgetTier(
  totalBudgetSar: number,
  durationDays: number,
  accommodationType: string,
  mealsPerDay: number
): BudgetTier {
  const days = Math.max(1, Math.floor(durationDays) || 1);
  const dailyBudget = (Number(totalBudgetSar) || 0) / days;

  const accommodation = normalizeAccommodation(accommodationType);
  const accommodationDailyCost =
    accommodation === "luxury" ? 1200 : accommodation === "midRange" ? 500 : 200;

  // Three meals consume more of the daily budget, leaving less for experiences.
  const mealsLoad = mealsPerDay >= 3 ? 0.85 : 1;

  const discretionary = (dailyBudget - accommodationDailyCost) * mealsLoad;

  if (discretionary >= 1500) return "luxury";
  if (discretionary >= 500) return "midRange";
  return "budget";
}

const INTEREST_SYNONYMS: Array<{ tags: InterestTag[]; matchers: string[] }> = [
  { tags: ["culture", "heritage"], matchers: ["ثقافه", "تراث", "culture", "heritage"] },
  {
    tags: ["shopping", "entertainment"],
    matchers: ["تسوق", "ترفيه", "shopping", "entertainment"],
  },
  { tags: ["family", "kids"], matchers: ["عائلي", "اطفال", "family", "kids", "children"] },
  {
    tags: ["food", "restaurants"],
    matchers: ["طعام", "مطاعم", "food", "restaurants", "dining"],
  },
  {
    tags: ["adventure", "sports"],
    matchers: ["مغامرات", "رياضه", "adventure", "sports", "nature", "طبيعه"],
  },
];

/**
 * Map the raw UI interest labels (Arabic or English) into canonical interest tags
 * used for grounding and validation.
 */
export function normalizeInterests(interests: string[]): InterestTag[] {
  const result = new Set<InterestTag>();
  for (const interest of interests || []) {
    const value = normalizeText(interest);
    for (const entry of INTEREST_SYNONYMS) {
      if (entry.matchers.some((m) => value.includes(normalizeText(m)))) {
        entry.tags.forEach((t) => result.add(t));
      }
    }
  }
  return Array.from(result);
}

const TIME_BLOCK_LABELS: Record<TimeBlock, string> = {
  morning: "صباحاً",
  afternoon: "ظهراً/عصراً",
  evening: "مساءً",
  night: "ليلاً",
};

const BUDGET_TIER_LABELS: Record<BudgetTier, string> = {
  budget: "اقتصادي",
  midRange: "متوسط",
  luxury: "فاخر",
};

function formatPlace(place: DestinationPlace): string {
  const times = place.recommendedTime.map((t) => TIME_BLOCK_LABELS[t]).join("، ");
  const tiers = place.budgetLevel.map((t) => BUDGET_TIER_LABELS[t]).join("/");
  return [
    `- ${place.englishName} (${place.arabicName})`,
    `  area: ${place.area} | category: ${place.category} | best time: ${times} | budget: ${tiers}`,
    `  interests: ${place.interests.join(", ")} | mapSearchQuery: "${place.mapSearchQuery}"`,
    `  note: ${place.shortDescription} ${place.planningNotes}`,
  ].join("\n");
}

/**
 * Render a single destination's curated knowledge as a compact, prompt-friendly
 * block grouped by area so the model can plan geographically.
 */
export function formatDestinationKnowledgeForPrompt(
  knowledge: DestinationKnowledge
): string {
  const byArea = new Map<string, DestinationPlace[]>();
  for (const place of knowledge.places) {
    const list = byArea.get(place.area) ?? [];
    list.push(place);
    byArea.set(place.area, list);
  }

  const sections: string[] = [];
  for (const [area, places] of byArea) {
    sections.push(`AREA: ${area}\n${places.map(formatPlace).join("\n")}`);
  }

  return `CURATED KNOWLEDGE FOR ${knowledge.englishName} (${knowledge.arabicName}):\n${sections.join(
    "\n\n"
  )}`;
}

const UNKNOWN_DESTINATION_PROMPT = `This destination is NOT in the curated knowledge base.
Do NOT invent generic or vague places. Use ONLY real, specific, searchable landmarks,
districts, and restaurants that you are highly confident actually exist in this destination.
If unsure about a place, choose a different well-known real place instead of guessing.`;

/**
 * Returns the knowledge block to inject into the prompt for a destination, or a
 * strict fallback instruction when the destination is unknown.
 */
export function getDestinationKnowledgeForPrompt(destination: string): string {
  const knowledge = resolveDestination(destination);
  if (!knowledge) return UNKNOWN_DESTINATION_PROMPT;
  return formatDestinationKnowledgeForPrompt(knowledge);
}

export const FORBIDDEN_PHRASES_AR = [
  "مطعم محلي",
  "مطعم تقليدي",
  "مطعم القرية",
  "سوق شعبي",
  "مقهى محلي",
  "منطقة ترفيهية",
  "مكان سياحي",
  "معلم سياحي",
  "تجربة محلية",
  "زيارة السوق",
];

export const FORBIDDEN_PHRASES_EN = [
  "local restaurant",
  "traditional restaurant",
  "popular cafe",
  "popular café",
  "local market",
  "tourist attraction",
  "entertainment area",
  "famous place",
  "hidden gem",
];

export const FORBIDDEN_PHRASES = [...FORBIDDEN_PHRASES_AR, ...FORBIDDEN_PHRASES_EN];

/**
 * Detects forbidden generic phrases in a piece of text (case/diacritic-insensitive).
 */
export function findForbiddenPhrases(text: string): string[] {
  const normalized = normalizeText(text);
  const hits: string[] = [];
  for (const phrase of FORBIDDEN_PHRASES) {
    if (normalized.includes(normalizeText(phrase))) {
      hits.push(phrase);
    }
  }
  return hits;
}

/**
 * Find the curated knowledge place referenced by a free-text location/title, or
 * null when none matches.
 */
export function findKnowledgePlace(
  text: string,
  knowledge: DestinationKnowledge
): DestinationPlace | null {
  const normalized = normalizeText(text);
  if (!normalized) return null;

  return (
    knowledge.places.find((place) => {
      const candidates = [
        place.name,
        place.arabicName,
        place.englishName,
        place.mapSearchQuery,
      ].map(normalizeText);

      return candidates.some(
        (candidate) =>
          candidate.length > 2 &&
          (normalized.includes(candidate) || candidate.includes(normalized))
      );
    }) ?? null
  );
}

/**
 * Whether a free-text location/title references a curated knowledge place.
 */
export function matchesKnowledgePlace(
  text: string,
  knowledge: DestinationKnowledge
): boolean {
  return findKnowledgePlace(text, knowledge) !== null;
}
