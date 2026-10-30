import { z } from "zod";
import type { AiMealCandidate } from "@/lib/nutrition";

export const DetectedItemSchema = z.object({
  name: z.string().min(1, "Tên món ăn không được để trống"),
  standardizedName: z.string().optional(),
  portionG: z.number().positive("Khối lượng phải lớn hơn 0"),
  calories: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
  fiber: z.number().nonnegative(),
  confidence: z.number().min(0).max(1),
  preparationMethod: z.string().optional(),
  ingredients: z.array(z.string()).optional(),
  notes: z.string().optional(),
  uncertainties: z.array(z.string()).optional(),
});

export const MealAnalysisResponseSchema = z.object({
  mealTypeInferred: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional(),
  confidenceOverall: z.number().min(0).max(1),
  candidates: z.array(DetectedItemSchema).min(1, "Cần phát hiện ít nhất 1 món ăn"),
  observations: z.string().optional(),
  nutritionalInsight: z.string().optional(),
});

export type MealAnalysisResult = z.infer<typeof MealAnalysisResponseSchema>;

export interface IAiVisionProvider {
  readonly providerName: string;
  readonly modelName: string;
  analyzeFoodImage(params: {
    imageBase64: string;
    mimeType: string;
    userNote?: string;
  }): Promise<MealAnalysisResult>;
}

