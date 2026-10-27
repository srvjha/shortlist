import { z } from "zod";

// Treats empty values like `KEY=` in .env as unset.
const emptyAsUnset = (value: unknown) => (value === "" ? undefined : value);
const optionalString = z.preprocess(emptyAsUnset, z.string().trim().min(1).optional());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  DATABASE_URL: z.url(),
  // Rate limit counters. Required in production; development falls back to in-memory counters.
  FRONTEND_URL: z.url().default("http://localhost:3000"),

  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url().default("http://localhost:4000"),
  // Set in production (e.g. ".example.com") so app. and api. subdomains share the session cookie.
  COOKIE_DOMAIN: optionalString,
  // Shared with the frontend's server, so it can pass a share-page visitor's own IP for rate limiting.
  PROXY_SECRET: z.preprocess(emptyAsUnset, z.string().trim().min(32).optional()),
  // One-click guest accounts. Defaults to on in development and off in production.
  ENABLE_GUEST_LOGIN: z.preprocess(emptyAsUnset, z.stringbool().optional()),
  GOOGLE_CLIENT_ID: optionalString,
  GOOGLE_CLIENT_SECRET: optionalString,
  GITHUB_CLIENT_ID: optionalString,
  GITHUB_CLIENT_SECRET: optionalString,
  CHATGPT_CLIENT_ID: optionalString,
  CHATGPT_CLIENT_SECRET: optionalString,
  CHATGPT_DISCOVERY_URL: z.preprocess(
    emptyAsUnset,
    z.url().default("https://auth.openai.com/.well-known/openid-configuration"),
  ),

  AI_PROVIDER: z.enum(["openai", "anthropic", "openrouter"]).default("openai"),
  AI_MODEL_FAST: optionalString,
  AI_MODEL_SMART: optionalString,
  OPENAI_API_KEY: optionalString,
  ANTHROPIC_API_KEY: optionalString,
  OPENROUTER_API_KEY: optionalString,
  // Encrypts users' own AI keys. Falls back to a key derived from BETTER_AUTH_SECRET.
  AI_KEY_ENCRYPTION_SECRET: optionalString,

  STORAGE_DRIVER: z.enum(["local", "r2"]).default("local"),
  LOCAL_STORAGE_DIR: z.string().default("./storage"),
  R2_ACCOUNT_ID: optionalString,
  R2_ACCESS_KEY_ID: optionalString,
  R2_SECRET_ACCESS_KEY: optionalString,
  R2_BUCKET: optionalString,

  // URL of the separate compiler service. Required in production; unset in development compiles in-process.
  COMPILER_URL: optionalString,
  TECTONIC_BIN: z.string().default("tectonic"),
  // true in production images where the TeX bundle is pre-downloaded; compiles then never touch the network.
  TECTONIC_ONLY_CACHED: z.preprocess(emptyAsUnset, z.stringbool().default(false)),
  COMPILE_TIMEOUT_MS: z.coerce.number().int().positive().default(20_000),
  COMPILE_CONCURRENCY: z.coerce.number().int().positive().default(2),

  // Optional; raises Jina Reader's rate limit when fetching job posts from URLs.
  JINA_API_KEY: optionalString,

  // Product analytics and API metrics. Empty: nothing is sent.
  POSTHOG_KEY: optionalString,
  POSTHOG_HOST: z.preprocess(emptyAsUnset, z.url().default("https://us.i.posthog.com")),
  // Read access for the admin dashboard's traffic page (PostHog's query and replay APIs).
  POSTHOG_PERSONAL_API_KEY: optionalString,
  POSTHOG_PROJECT_ID: optionalString,
  POSTHOG_APP_HOST: z.preprocess(emptyAsUnset, z.url().default("https://us.posthog.com")),

  // Comma-separated emails that can open the admin dashboard. They must be verified by the sign-in provider.
  ADMIN_EMAILS: z.preprocess(
    emptyAsUnset,
    z
      .string()
      .default("")
      .transform((value) =>
        value
          .split(",")
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean),
      ),
  ),

  RAZORPAY_KEY_ID: optionalString,
  RAZORPAY_KEY_SECRET: optionalString,
  RAZORPAY_WEBHOOK_SECRET: optionalString,
  // Monthly plan created in the Razorpay dashboard for Pro.
  RAZORPAY_PRO_PLAN_ID: optionalString,
  // "test" switches to the RAZORPAY_TEST_* values, so live credentials stay in place while testing.
  RAZORPAY_MODE: z.preprocess(emptyAsUnset, z.enum(["live", "test"]).default("live")),
  RAZORPAY_TEST_KEY_ID: optionalString,
  RAZORPAY_TEST_KEY_SECRET: optionalString,
  RAZORPAY_TEST_WEBHOOK_SECRET: optionalString,
  RAZORPAY_TEST_PRO_PLAN_ID: optionalString,
  // Who takes payments in India. Moving India to Polar needs INR prices on the Polar products.
  PAYMENTS_INDIA: z.preprocess(emptyAsUnset, z.enum(["razorpay", "polar"]).default("razorpay")),
  // Development only: pretend every visitor is in this country (like US), to test the other provider locally.
  PAYMENTS_TEST_COUNTRY: z.preprocess(
    emptyAsUnset,
    z
      .string()
      .regex(/^[A-Z]{2}$/)
      .optional(),
  ),
  // Polar takes payments from outside India. Sandbox and production have separate tokens, products and webhooks.
  POLAR_SERVER: z.preprocess(emptyAsUnset, z.enum(["sandbox", "production"]).default("production")),
  POLAR_ACCESS_TOKEN: optionalString,
  POLAR_WEBHOOK_SECRET: optionalString,
  // One-time products in Polar, each with a USD price.
  POLAR_SEASON_PASS_PRODUCT_ID: optionalString,
  POLAR_PRO_PRODUCT_ID: optionalString,
});

const parsed = envSchema
  .refine(
    (e) =>
      e.STORAGE_DRIVER !== "r2" || (e.R2_ACCOUNT_ID && e.R2_ACCESS_KEY_ID && e.R2_SECRET_ACCESS_KEY && e.R2_BUCKET),
    { message: "STORAGE_DRIVER=r2 needs R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET" },
  )
  .refine(
    (e) => e.RAZORPAY_MODE !== "test" || !e.RAZORPAY_TEST_KEY_ID || e.RAZORPAY_TEST_KEY_ID.startsWith("rzp_test_"),
    {
      message: "RAZORPAY_TEST_KEY_ID must be a test key (rzp_test_...)",
    },
  )
  .refine((e) => e.NODE_ENV !== "production" || e.COMPILER_URL, {
    message: "COMPILER_URL is required in production so untrusted LaTeX never runs next to app secrets",
  })
  .safeParse(process.env);

if (!parsed.success) {
  console.error(`Invalid environment variables:\n${z.prettifyError(parsed.error)}`);
  process.exit(1);
}

const settings = parsed.data;
export const env =
  settings.RAZORPAY_MODE === "test"
    ? {
        ...settings,
        RAZORPAY_KEY_ID: settings.RAZORPAY_TEST_KEY_ID,
        RAZORPAY_KEY_SECRET: settings.RAZORPAY_TEST_KEY_SECRET,
        RAZORPAY_WEBHOOK_SECRET: settings.RAZORPAY_TEST_WEBHOOK_SECRET,
        RAZORPAY_PRO_PLAN_ID: settings.RAZORPAY_TEST_PRO_PLAN_ID,
      }
    : settings;
