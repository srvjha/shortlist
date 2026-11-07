import { z } from "zod";

const plan = z.enum(["season_pass", "pro"]);

export const createRedemptionBody = z.object({ code: z.string().trim().min(1).max(40) });

export const promoCodeParams = z.object({ promoCodeId: z.uuid() });

export const createPromoCodeBody = z.object({
  code: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9-]{3,32}$/, "Use 3 to 32 letters, numbers or hyphens"),
  kind: z.enum(["promo", "ambassador"]).default("promo"),
  plan: plan.default("season_pass"),
  months: z.number().int().min(1).max(12),
  maxRedemptions: z.number().int().min(1).max(10_000).optional(),
  expiresAt: z.coerce.date().optional(),
  owner: z.string().trim().max(80).optional(),
  note: z.string().trim().max(200).optional(),
});

export const updatePromoCodeBody = z.object({ active: z.boolean() });

export const promoCodeListResponse = z.object({
  codes: z.array(
    z.object({
      id: z.uuid(),
      code: z.string(),
      kind: z.enum(["promo", "ambassador"]),
      plan: z.enum(["season_pass", "pro", "lifetime"]),
      months: z.number().int(),
      maxRedemptions: z.number().int().nullable(),
      expiresAt: z.date().nullable(),
      active: z.boolean(),
      owner: z.string().nullable(),
      note: z.string().nullable(),
      createdAt: z.date(),
      redemptions: z.number().int(),
      madeResume: z.number().int(),
      tailored: z.number().int(),
      paid: z.number().int(),
      lastRedeemedAt: z.date().nullable(),
    }),
  ),
  recent: z.array(
    z.object({
      code: z.string(),
      userId: z.uuid(),
      email: z.string(),
      name: z.string(),
      redeemedAt: z.date(),
    }),
  ),
});
