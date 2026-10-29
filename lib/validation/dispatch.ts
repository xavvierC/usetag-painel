import { z } from "zod";
const text = z.string().max(1200);
export const dispatchSchema = z
  .object({
    name: text,
    cpf: text,
    phone: text,
    email: text,
    address: text,
    cep: text,
    shipping: text,
    note: text,
    declaredTotal: z.number().int().min(0).max(1000000).nullable(),
    amountCents: z.number().int().min(1).max(10000000000).nullable(),
    soldOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    paymentStatus: z
      .enum(["approved", "pending", "analysis", "cancelled"])
      .nullable(),
    items: z
      .array(
        z
          .object({
            model: z.enum(["Google", "Instagram", "Uber", ""]),
            color: z.enum(["Azul", "Preto", ""]),
            quantity: z.number().int().min(0).max(100000).nullable(),
            gift: z.boolean(),
          })
          .strict(),
      )
      .max(100),
    warnings: z.array(z.string().max(300)).max(20),
  })
  .strict();
