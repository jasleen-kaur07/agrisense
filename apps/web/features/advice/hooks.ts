"use client";

import { useQuery } from "@tanstack/react-query";
import { recommendations } from "@/lib/api/endpoints";

export const useRecommendation = (id: string) =>
  useQuery({ queryKey: ["recommendation", id], queryFn: () => recommendations.get(id) });
