import { z } from "zod";

export const bulkPlanInputSchema = z.object({
  items: z
    .array(
      z.object({
        variantId: z.string().min(1).max(128),
        quantity: z.number().int().min(1).max(1000),
        additionalQuantity: z.number().int().min(0).max(999).optional(),
        lineTotal: z
          .number()
          .finite()
          .positive()
          .max(1_000_000)
          .refine(
            (n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.00001,
            "Use at most two decimal places",
          ),
      }).refine(i => (i.additionalQuantity ?? 0) < i.quantity, "Additional vials must be fewer than the total vial count"),
    )
    .min(1)
    .max(50)
    .refine(
      (items) => new Set(items.map((i) => i.variantId)).size === items.length,
      "Combine duplicate vial sizes into one line",
    ),
  supplementalDocumentKeys: z.array(z.enum(["peptide_reference"])).optional(),
  shippingAmount: z.number().finite().min(0).max(10000),
  taxAmount: z.number().finite().min(0).max(10000).default(0),
  fulfillmentNote: z.string().trim().min(1).max(5000),
  allowBackorder: z.boolean().default(false),
  existingOrderNumber: z.string().trim().max(100).optional(),
});
export type BulkPlanInput = z.infer<typeof bulkPlanInputSchema>;
export interface BulkPlanLine {
  productId: string;
  productName: string;
  productSlug: string;
  category: string;
  variantId: string;
  variantName: string;
  sku: string;
  quantity: number;
  additionalQuantity?: number;
  unitPrice: number;
  totalPrice: number;
}
export interface BulkPlan {
  items: BulkPlanLine[];
  subtotal: number;
  shippingAmount: number;
  taxAmount: number;
  total: number;
  fulfillmentNote: string;
  allowBackorder: boolean;
  existingOrderNumber?: string;
  supplementalDocumentKeys?: ("peptide_reference")[];
  documents: { label: string; url: string; filename: string }[];
}
export const money = (n: number) =>
  Math.round((n + Number.EPSILON) * 100) / 100;
export function bulkTotals(
  items: { totalPrice: number }[],
  shipping: number,
  tax: number,
) {
  const subtotal = money(items.reduce((n, i) => n + i.totalPrice, 0));
  return {
    subtotal,
    shippingAmount: money(shipping),
    taxAmount: money(tax),
    total: money(subtotal + shipping + tax),
  };
}
export const bulkAddressSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  address1: z.string().trim().min(1).max(160),
  address2: z.string().trim().max(160).optional(),
  city: z.string().trim().min(1).max(100),
  province: z.enum([
    "AB",
    "BC",
    "MB",
    "NB",
    "NL",
    "NS",
    "NT",
    "NU",
    "ON",
    "PE",
    "QC",
    "SK",
    "YT",
  ]),
  postalCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/),
  country: z.literal("CA"),
  phone: z.string().trim().max(40).optional(),
});
export type BulkAddress = z.infer<typeof bulkAddressSchema>;
