import { z } from "zod";

const imageUrlSchema = z.string().url().max(2048);

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(80)
});

export const productSchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().min(1).max(5000),
  price: z.coerce.number().int().nonnegative(),
  stock: z.coerce.number().int().nonnegative(),
  images: z.array(imageUrlSchema).max(20),
  categoryId: z.string().trim().min(1)
});

export const productUpdateSchema = productSchema.partial();
