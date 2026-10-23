import { api } from "./client";
import type {
  ActionPlan, AdminStats, Alert, Comparison, CropPrediction, CropPredictionInput, DataSummary, District, Farm, FarmCreate, FeedbackCreate,
  FeedbackItem, Field, FieldWrite, Page, Profile, ProfileUpdate, Recommendation, RegionalGuide, Season,
  SeasonInfo, SoilRecord, StateInfo, User, Weather,
} from "./types";

export const auth = {
  register: (b: { email: string; password: string; displayName?: string; language?: string }) =>
    api.post<User>("/auth/register", b),
  login: (b: { email: string; password: string }) => api.post<User>("/auth/login", b),
  logout: () => api.post<void>("/auth/logout"),
  forgot: (email: string) => api.post<void>("/auth/forgot", { email }),
  reset: (token: string, newPassword: string) => api.post<void>("/auth/reset", { token, newPassword }),
  me: (noRedirect = false) => api.get<User>("/auth/me", undefined, { noRedirect }),
};

export const profile = {
  get: () => api.get<Profile>("/profile"),
  update: (b: ProfileUpdate) => api.put<Profile>("/profile", b),
};

export const farms = {
  list: () => api.get<Farm[]>("/farms"),
  create: (b: FarmCreate) => api.post<Farm>("/farms", b),
  update: (id: string, b: FarmCreate) => api.put<Farm>(`/farms/${id}`, b),
  remove: (id: string) => api.delete<void>(`/farms/${id}`),
};

export const fields = {
  list: () => api.get<Field[]>("/fields"),
  create: (farmId: string, b: FieldWrite) => api.post<Field>(`/farms/${farmId}/fields`, b),
  update: (id: string, b: FieldWrite) => api.put<Field>(`/fields/${id}`, b),
  remove: (id: string) => api.delete<void>(`/fields/${id}`),
  saveSoil: (id: string, b: SoilRecord) => api.put<Field>(`/fields/${id}/soil`, b),
  removeSoil: (id: string) => api.delete<void>(`/fields/${id}/soil`),
};

export const locations = {
  states: () => api.get<StateInfo[]>("/locations/states"),
  districts: (state: string) => api.get<District[]>("/locations/districts", { state }),
  search: (q: string, limit = 10) => api.get<District[]>("/locations/search", { q, limit }),
  nearest: (lat: number, lon: number) => api.get<District>("/locations/nearest", { lat, lon }),
  one: (stateKey: string, districtKey: string) =>
    api.get<District>(`/locations/${encodeURIComponent(stateKey)}/${encodeURIComponent(districtKey)}`),
};

export const seasons = { current: () => api.get<SeasonInfo>("/seasons/current") };

export const regional = {
  guide: (state: string, district: string, season: Season) =>
    api.get<RegionalGuide>("/regional/guide", { state, district, season }),
};

export const weather = {
  get: (state: string, district: string) => api.get<Weather>("/weather", { state, district }),
};

export const recommendations = {
  create: (b: { fieldId: string; season?: Season; mode?: "REGIONAL" }, idempotencyKey: string) =>
    api.post<Recommendation>("/recommendations", b, { headers: { "Idempotency-Key": idempotencyKey } }),
  list: (page = 0, size = 20, fieldId?: string) =>
    api.get<Page<Recommendation>>("/recommendations", { page, size, fieldId }),
  get: (id: string) => api.get<Recommendation>(`/recommendations/${id}`),
  remove: (id: string) => api.delete<void>(`/recommendations/${id}`),
  compare: (id: string, crops: string[]) =>
    api.get<Comparison>(`/recommendations/${id}/compare`, { crops: crops.join(",") }),
  plan: (id: string, crop: string) => api.post<ActionPlan>(`/recommendations/${id}/plan`, { crop }),
};

export const alerts = {
  list: (unreadOnly = false) => api.get<Alert[]>("/alerts", { unreadOnly }),
  markRead: (id: string) => api.post<void>(`/alerts/${id}/read`),
};

export const feedback = { send: (b: FeedbackCreate) => api.post<void>("/feedback", b) };

export const admin = {
  users: (page = 0, size = 20, q?: string) => api.get<Page<User>>("/admin/users", { page, size, q }),
  patchUser: (id: string, b: { enabled?: boolean; roles?: string[] }) => api.patch<User>(`/admin/users/${id}`, b),
  recommendations: (page = 0, size = 20) => api.get<Page<Recommendation>>("/admin/recommendations", { page, size }),
  feedback: async (): Promise<FeedbackItem[]> => {
    const r = await api.get<FeedbackItem[] | Page<FeedbackItem>>("/admin/feedback");
    return Array.isArray(r) ? r : (r?.items ?? []);
  },
  stats: () => api.get<AdminStats>("/admin/stats"),
  dataSummary: () => api.get<DataSummary>("/admin/data/summary"),
};

export const predictions = {
  crop: (b: CropPredictionInput) => api.post<CropPrediction>("/predictions/crop", b),
};
