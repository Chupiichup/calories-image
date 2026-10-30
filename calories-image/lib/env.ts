import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional().or(z.literal("")),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional().or(z.literal("")),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().or(z.literal("")),
  AI_PROVIDER: z.enum(["gemini", "openai", "mock"]).default("mock"),
  AI_PROVIDER_MODEL: z.string().optional(),
  AI_PROVIDER_API_KEY: z.string().optional().or(z.literal("")),
  AI_PROVIDER_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  MAX_ANALYSIS_FILE_SIZE_MB: z.coerce.number().positive().default(5),
  ENABLE_IMAGE_RETENTION: z.coerce.boolean().default(false),
});

export type EnvConfig = z.infer<typeof envSchema>;

let cachedEnv: EnvConfig | null = null;

export function getEnv(): EnvConfig {
  if (cachedEnv) return cachedEnv;

  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    AI_PROVIDER: process.env.AI_PROVIDER || (process.env.AI_PROVIDER_API_KEY ? "gemini" : "mock"),
    AI_PROVIDER_MODEL: process.env.AI_PROVIDER_MODEL,
    AI_PROVIDER_API_KEY: process.env.AI_PROVIDER_API_KEY,
    AI_PROVIDER_TIMEOUT_MS: process.env.AI_PROVIDER_TIMEOUT_MS || 30000,
    MAX_ANALYSIS_FILE_SIZE_MB: process.env.MAX_ANALYSIS_FILE_SIZE_MB || 5,
    ENABLE_IMAGE_RETENTION: process.env.ENABLE_IMAGE_RETENTION === "true",
  });

  if (!parsed.success) {
    console.error("Environment configuration error:", parsed.error.format());
    throw new Error("Invalid application environment configuration.");
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key && url.startsWith("http") && !url.includes("your-project"));
}

