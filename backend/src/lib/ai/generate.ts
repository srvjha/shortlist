import { recordStep } from "../../middleware/request-metrics.js";
import { APICallError, type LanguageModelUsage, NoObjectGeneratedError, generateObject } from "ai";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import { db } from "../../db/index.js";
import { aiRuns } from "../../db/schema/index.js";
import { loadUserAiKey } from "../../modules/ai-keys/ai-keys.service.js";
import { AppError } from "../errors.js";
import { userKeyError } from "./key-errors.js";
import { logger } from "../logger.js";
import { type AiProvider, type ModelTier, resolveModel } from "./models.js";
import { costUsdMicros } from "./pricing.js";
import { type QuotaKind, reserveAiRun } from "../../modules/usage/quotas.js";

type AiStep = (typeof aiRuns.$inferInsert)["step"];

function tokenUsage(usage: LanguageModelUsage) {
  return {
    inputTokens: usage.inputTokens ?? 0,
    cachedInputTokens: usage.inputTokenDetails?.cacheReadTokens ?? 0,
    outputTokens: usage.outputTokens ?? 0,
  };
}

export type GenerateStructuredInput<S extends z.ZodType> = {
  userId: string;
  step: AiStep;
  tier: ModelTier;
  schema: S;
  system: string;
  prompt: string;
  // Attached documents, e.g. an uploaded PDF resume.
  files?: { data: Buffer; mediaType: string; filename?: string }[];
  resumeId?: string;
  jobId?: string;
  userKey?: { provider: AiProvider; apiKey: string; modelId?: string };
  // The plan limit this call counts against. Unset for calls the quota doesn't cover.
  quota?: QuotaKind;
  timeoutMs?: number;
};

// Every AI call goes through here so it is logged in ai_runs with tokens, cost and latency.
export async function generateStructured<S extends z.ZodType>(
  input: GenerateStructuredInput<S>,
): Promise<{ data: z.infer<S>; runId: string }> {
  // The user's own key, when they've added one in Settings, is used instead of ours.
  const userKey = input.userKey ?? (await loadUserAiKey(input.userId));
  const { model, provider, modelId } = resolveModel(input.tier, userKey);
  const started = Date.now();
  const base = {
    byok: Boolean(userKey),
    userId: input.userId,
    step: input.step,
    model: `${provider}:${modelId}`,
    resumeId: input.resumeId ?? null,
    jobId: input.jobId ?? null,
  };
  // On our key, the run is reserved before the model is called, so it already counts while the model works.
  const reserved = input.quota && !userKey ? await reserveAiRun(input.userId, input.quota, input.step) : undefined;
  const record = (values: Omit<typeof aiRuns.$inferInsert, keyof typeof base>) =>
    reserved
      ? db
          .update(aiRuns)
          .set({ ...base, ...values })
          .where(eq(aiRuns.id, reserved))
          .returning({ id: aiRuns.id })
      : db
          .insert(aiRuns)
          .values({ ...base, ...values })
          .returning({ id: aiRuns.id });

  try {
    const content = [
      { type: "text" as const, text: input.prompt },
      ...(input.files ?? []).map((file) => ({
        type: "file" as const,
        data: file.data,
        mediaType: file.mediaType,
        ...(file.filename && { filename: file.filename }),
      })),
    ];
    const result = await generateObject({
      model,
      schema: input.schema,
      system: input.system,
      messages: [{ role: "user", content }],
      // A hung model call fails here, which records the run as failed and frees its reservation.
      abortSignal: AbortSignal.timeout(input.timeoutMs ?? 90_000),
      // Strict mode makes OpenAI return every field, so output always matches the schema.
      // AI output schemas must therefore use nullable fields, never optional ones.
      providerOptions: { openai: { strictJsonSchema: true } },
    });

    recordStep("ai_ms", Date.now() - started);
    const usage = tokenUsage(result.usage);

    const [run] = await record({
      status: "succeeded",
      ...usage,
      costUsdMicros: costUsdMicros(modelId, usage),
      latencyMs: Date.now() - started,
    });

    return { data: result.object as z.infer<S>, runId: run!.id };
  } catch (err) {
    // Errors from a user's key are logged by status only: provider messages can echo parts of the key.
    if (userKey) {
      logger.warn(
        { step: input.step, model: base.model, status: APICallError.isInstance(err) ? err.statusCode : undefined },
        "AI generation failed on user key",
      );
    } else {
      // Not the whole error: APICallError carries the request body (resume, profile, PDF) as a field.
      const { name, message, stack } = err instanceof Error ? err : new Error(String(err));
      const status = APICallError.isInstance(err) ? err.statusCode : undefined;
      logger.error(
        { err: { name, message, stack }, status, step: input.step, model: base.model },
        "AI generation failed",
      );
    }
    // The model ran and answered, but not in the schema's shape; its tokens are still spent.
    const spent = NoObjectGeneratedError.isInstance(err) && err.usage ? tokenUsage(err.usage) : undefined;
    await record({
      status: "failed",
      ...(spent && { ...spent, costUsdMicros: costUsdMicros(modelId, spent) }),
      latencyMs: Date.now() - started,
      error: userKey ? "user key request failed" : err instanceof Error ? err.message : String(err),
    });
    if (userKey) throw userKeyError(provider, err);
    throw new AppError(502, "AI_FAILED", "The AI model could not complete this request. Try again.");
  }
}
