import { z } from "zod";

export const feedbackSchema = (t: (k: string) => string) =>
  z.object({
    category: z.enum(["BUG", "IDEA", "DATA_ISSUE", "OTHER"]),
    message: z.string().trim().min(5, t("validation.feedbackMin")).max(2000, t("validation.feedbackMax")),
    rating: z.string(),
  });
