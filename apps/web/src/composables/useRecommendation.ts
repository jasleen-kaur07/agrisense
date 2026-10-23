import { recommendations } from "@/lib/api/endpoints";
import { useQuery } from "@/lib/query";

export const useRecommendation = (id: () => string) =>
  useQuery(() => ["recommendation", id()], () => recommendations.get(id()));
