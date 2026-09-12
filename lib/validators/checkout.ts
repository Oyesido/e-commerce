import { z } from "zod";

export const checkoutSchema = z.object({
  shippingName: z.string().trim().min(2).max(120),
  shippingEmail: z.string().trim().email().transform((value) => value.toLowerCase()),
  shippingPhone: z.string().trim().min(7).max(30),
  shippingAddress: z.string().trim().min(5).max(500)
});
