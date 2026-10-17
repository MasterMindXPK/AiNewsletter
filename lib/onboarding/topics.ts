import type { Topic } from "@/lib/types";

export const TOPIC_KEYS = [
  "world",
  "politics",
  "business",
  "economy",
  "energy",
  "technology",
  "science",
  "health",
  "sports",
  "entertainment",
  "culture",
  "education",
  "environment",
  "crime",
  "lifestyle",
  "travel",
  "opinion",
] as const satisfies readonly Topic[];

export const TOPIC_META: Record<Topic, { label: string; descriptor: string }> = {
  world: { label: "World", descriptor: "Global events and diplomacy" },
  politics: { label: "Politics", descriptor: "Governments, elections and policy" },
  business: { label: "Business", descriptor: "Companies, markets and deals" },
  economy: { label: "Economy", descriptor: "Inflation, rates and growth" },
  energy: { label: "Energy", descriptor: "Oil, power and fuel prices" },
  technology: { label: "Technology", descriptor: "Software, AI and gadgets" },
  science: { label: "Science", descriptor: "Discoveries and space" },
  health: { label: "Health", descriptor: "Medicine and public health" },
  sports: { label: "Sports", descriptor: "Cricket, football and more" },
  entertainment: { label: "Entertainment", descriptor: "Film, music and TV" },
  culture: { label: "Culture", descriptor: "Arts, books and ideas" },
  education: { label: "Education", descriptor: "Schools, exams and universities" },
  environment: { label: "Environment", descriptor: "Climate and the natural world" },
  crime: { label: "Crime and law", descriptor: "Courts, security and justice" },
  lifestyle: { label: "Lifestyle", descriptor: "Food, home and wellbeing" },
  travel: { label: "Travel", descriptor: "Places, airlines and visas" },
  opinion: { label: "Opinion", descriptor: "Columns and editorials" },
};

export const TOPIC_GROUPS: { title: string; topics: Topic[] }[] = [
  { title: "News and power", topics: ["world", "politics", "crime", "opinion"] },
  { title: "Money and work", topics: ["business", "economy", "energy"] },
  {
    title: "Science and society",
    topics: ["technology", "science", "health", "education", "environment"],
  },
  {
    title: "Life and leisure",
    topics: ["sports", "entertainment", "culture", "lifestyle", "travel"],
  },
];

export const TOPIC_SUGGESTIONS: Record<Topic, string[]> = {
  world: ["Middle East", "China", "Climate summit"],
  politics: ["Elections", "Budget", "Foreign policy"],
  business: ["PSX", "Startups", "Exports", "Bitcoin"],
  economy: ["Inflation", "IMF", "Interest rates", "Rupee"],
  energy: ["Oil prices", "Solar power", "Petrol price", "Circular debt"],
  technology: ["AI regulation", "Tesla", "Cybersecurity", "Startups"],
  science: ["Space", "Quantum computing", "Climate science"],
  health: ["Dengue", "Nutrition", "Mental health"],
  sports: ["Cricket", "PSL", "Football", "Olympics"],
  entertainment: ["Pakistani drama", "Bollywood", "Netflix"],
  culture: ["Books", "Urdu poetry", "Art"],
  education: ["Scholarships", "Exams", "Studying abroad"],
  environment: ["Floods", "Air quality", "Solar power"],
  crime: ["Cybercrime", "Supreme Court"],
  lifestyle: ["Food", "Fitness", "Home"],
  travel: ["Visa rules", "Airlines", "Northern areas"],
  opinion: ["Editorials", "Economy columns"],
};

export const SITUATION_TAGS = [
  "student",
  "commutes by car",
  "uses public transport",
  "small business owner",
  "investor",
  "renter",
  "homeowner",
  "parent",
  "freelancer",
  "farmer",
  "exporter/importer",
  "remote worker",
] as const;

export const PROFESSION_PRESETS = [
  "Student",
  "Software engineer",
  "Teacher",
  "Doctor",
  "Business owner",
  "Finance professional",
  "Government employee",
  "Journalist",
  "Lawyer",
  "Engineer",
  "Freelancer",
  "Farmer",
];

export const INDUSTRY_PRESETS = [
  "Technology",
  "Finance and banking",
  "Healthcare",
  "Education",
  "Retail and e-commerce",
  "Manufacturing",
  "Agriculture",
  "Energy",
  "Media",
  "Government",
  "Construction and real estate",
  "Logistics and transport",
];

export const CITY_SUGGESTIONS = [
  "Karachi",
  "Lahore",
  "Islamabad",
  "Rawalpindi",
  "Faisalabad",
  "Multan",
  "Peshawar",
  "Quetta",
  "Dubai",
  "London",
  "New York",
  "Toronto",
];

export const COUNTRY_CODES = [
  "PK",
  "IN",
  "BD",
  "AE",
  "SA",
  "GB",
  "US",
  "CA",
  "AU",
  "DE",
  "TR",
  "MY",
] as const;

export type CountryCode = (typeof COUNTRY_CODES)[number];

export const COUNTRY_NAMES: Record<CountryCode, string> = {
  PK: "Pakistan",
  IN: "India",
  BD: "Bangladesh",
  AE: "United Arab Emirates",
  SA: "Saudi Arabia",
  GB: "United Kingdom",
  US: "United States",
  CA: "Canada",
  AU: "Australia",
  DE: "Germany",
  TR: "Turkey",
  MY: "Malaysia",
};

export function isCountryCode(value: string | undefined): value is CountryCode {
  return value !== undefined && (COUNTRY_CODES as readonly string[]).includes(value);
}

export const READING_DEPTHS = ["brief", "standard", "deep"] as const;

export const DEPTH_OPTIONS: {
  value: (typeof READING_DEPTHS)[number];
  label: string;
  description: string;
  time: string;
}[] = [
  {
    value: "brief",
    label: "Brief",
    description: "Headlines with one line of context each.",
    time: "About 3 minutes",
  },
  {
    value: "standard",
    label: "Standard",
    description: "Short summaries and the key background.",
    time: "About 10 minutes",
  },
  {
    value: "deep",
    label: "Deep",
    description: "Fuller analysis and how stories connect.",
    time: "About 20 minutes",
  },
];

export const LANGUAGE_CODES = ["en", "ur"] as const;

export const LANGUAGE_LABELS: Record<(typeof LANGUAGE_CODES)[number], string> = {
  en: "English",
  ur: "Urdu",
};

export const WEIGHT_TOPIC = 0.8;
export const WEIGHT_KEYWORD = 0.9;
export const WEIGHT_BASELINE = 0.1;
export const MIN_TOPICS = 3;
export const MAX_KEYWORDS = 12;
