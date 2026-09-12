import { z } from "zod";

export const cartItemInputSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive().max(100)
});

export const cartRequestSchema = z.object({
  productId: z.string().min(1).optional(),
  quantity: z.coerce.number().int().positive().max(100).optional(),
  mode: z.enum(["add", "set"]).default("add"),
  items: z.array(cartItemInputSchema).max(100).optional()
}).refine((value) => Boolean(value.items) || (Boolean(value.productId) && value.quantity !== undefined), {
  message: "A product and quantity, or a merge item list, is required."
});

export const removeCartItemSchema = z.object({
  productId: z.string().min(1)
});
