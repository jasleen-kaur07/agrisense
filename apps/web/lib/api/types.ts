/** Types mirror contracts/identity.yaml, farm-advisory.yaml and data.yaml. */

export type Language = "en" | "hi";
export type Season = "KHARIF" | "RABI" | "SUMMER";
export type ExperienceLevel = "BEGINNER" | "INTERMEDIATE" | "EXPERIENCED";
export type DataStatus = "LIVE" | "CACHED" | "UNAVAILABLE";

export interface User {
  id: string;
  email: string;
  displayName?: string | null;
  roles: string[];
  language: Language;
  onboardingCompleted: boolean;
  enabled: boolean;
  createdAt?: string;
}

export interface Profile {
  displayName: string | null;
  language: Language;
  experienceLevel?: ExperienceLevel | null;
  preferredStateKey?: string | null;
  preferredDistrictKey?: string | null;
  onboardingCompleted: boolean;
}

export interface ProfileUpdate {
  displayName?: string;
  language?: Language;
  experienceLevel?: ExperienceLevel;
  preferredStateKey?: string;
  preferredDistrictKey?: string;
  onboardingCompleted?: boolean;
}

export interface Page<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export interface Farm {
  id: string;
  name: string;
  stateKey: string;
  districtKey: string;
  state: string;
  district: string;
  latitude: number;
  longitude: number;
  createdAt: string;
}
export interface FarmCreate {
  name: string;
  stateKey: string;
  districtKey: string;
}

export interface SoilRecord {
  nitrogen?: number | null;
  phosphorus?: number | null;
  potassium?: number | null;
  ph?: number | null;
  testedOn?: string | null;
}
export interface Field {
  id: string;
  farmId: string;
  farmName?: string;
  name: string;
  areaAcres: number;
  soil?: SoilRecord | null;
  soilSource?: "USER" | null;
  createdAt: string;
}
export interface FieldWrite {
  name: string;
  areaAcres: number;
  soil?: SoilRecord;
}

export interface StateInfo {
  stateKey: string;
  name: string;
  districtCount: number;
}
export interface District {
  stateKey: string;
  districtKey: string;
  state: string;
  district: string;
  latitude: number;
  longitude: number;
  coordSource?: string;
}
export interface SeasonInfo {
  season: Season;
  next: Season;
  months: number[];
  rule: string;
}

export interface RegionalCrop {
  rank: number;
  crop: string;
  prevalencePct: number;
  districtPct?: number | null;
  statePct: number;
}
export interface RegionalCoverage {
  districtRecords: number;
  yearsCovered: number[];
  stateFallbackUsed: boolean;
  districtWeight: number;
  firstYear: number;
  lastYear: number;
}
export interface RegionalGuide {
  kind: "REGIONAL_PATTERN";
  state: string;
  district: string;
  season: Season;
  basis: string;
  asOfYear?: number;
  crops: RegionalCrop[];
  yearRoundCrops?: string[];
  coverage: RegionalCoverage;
  caveats: string[];
  sources?: string[];
}

export interface WeatherCurrent {
  time?: string;
  temperatureC?: number;
  humidityPct?: number;
  precipitationMm?: number;
  windKmh?: number;
  weatherCode?: number;
}
export interface WeatherDaily {
  date: string;
  tempMaxC?: number;
  tempMinC?: number;
  precipitationSumMm?: number;
  precipitationProbabilityMaxPct?: number | null;
  weatherCode?: number;
}
export interface Weather {
  status: DataStatus;
  source: string;
  attribution: string;
  fetchedAt?: string | null;
  timezone?: string | null;
  current?: WeatherCurrent | null;
  daily?: WeatherDaily[];
  message?: string | null;
}

export interface Recommendation {
  id: string;
  fieldId?: string | null;
  fieldName?: string;
  kind: "REGIONAL_PATTERN";
  season: Season;
  location: { state?: string; district?: string; stateKey?: string; districtKey?: string };
  regional: RegionalGuide;
  weather: Weather;
  soilUsed?: boolean;
  dataVersions?: { regionalStatsLastYear?: number; engineConfig?: Record<string, unknown> };
  limitations: string[];
  createdAt: string;
}

export interface Comparison {
  crops: string[];
  rows: { label: string; values: (string | null)[]; source?: string }[];
  notes: string[];
}

export interface ActionPlanItem {
  kind: "DATA_INSIGHT" | "CHECKLIST" | "OFFICIAL_RESOURCE";
  title: string;
  detail: string;
  source: {
    type: "REGIONAL_DATA" | "WEATHER_FORECAST" | "OFFICIAL_PORTAL" | "GENERAL";
    label: string;
    url?: string | null;
  };
}
export interface ActionPlan {
  crop: string;
  items: ActionPlanItem[];
  disclaimer: string;
}

export interface Alert {
  id: string;
  type: "HEAVY_RAIN" | "HIGH_TEMPERATURE" | "RECHECK_GUIDE";
  severity: "INFO" | "WATCH";
  title: string;
  message: string;
  fieldId?: string | null;
  source?: string;
  createdAt: string;
  read: boolean;
}

export type FeedbackCategory = "BUG" | "IDEA" | "DATA_ISSUE" | "OTHER";
export interface FeedbackCreate {
  category: FeedbackCategory;
  message: string;
  rating?: number;
}
/** The contract leaves the admin feedback item shape open; this is tolerant. */
export interface FeedbackItem {
  id?: string;
  category?: string;
  message?: string;
  rating?: number | null;
  createdAt?: string;
  [key: string]: unknown;
}

export interface AdminStats {
  users?: number;
  farms?: number;
  fields?: number;
  recommendations?: number;
  feedback?: number;
}
export interface DataSummary {
  districts?: number;
  supportedDistricts?: number;
  statRows?: number;
  firstYear?: number;
  lastYear?: number;
  weatherCacheEntries?: number;
  datasetLicenseStatus?: string;
}
