import { z } from "zod";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Define the schema for environment variables
const envSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),
  PORT: z
    .string()
    .transform(Number)
    .pipe(z.number().min(1).max(65535))
    .default("3001"),
  HOST: z.string().default("localhost"),
  CORS_ORIGIN: z
    .string()
    .url("CORS_ORIGIN must be a valid URL")
    .default("http://localhost:5173"),
  WS_PORT: z
    .string()
    .transform(Number)
    .pipe(z.number().min(1).max(65535))
    .default("1234"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

export type Env = z.infer<typeof envSchema>;

// Validate and parse environment variables
const parseEnv = (): Env => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error("❌ Invalid environment variables:");
    console.error(error);
    process.exit(1);
  }
};

export const env = parseEnv();
