import { z } from "zod";
import { isDate } from "../domain/finance";
const uuid = z.string().uuid();
const amount = z.number().int().min(1).max(10_000_000_000);
const date = z.string().refine(isDate, "Data inválida");
const item = z
  .object({
    model: z.enum(["google", "instagram", "uber"]),
    color: z.enum(["blue", "black"]).nullable(),
    quantity: z.number().int().min(1).max(100000),
    isGift: z.boolean(),
  })
  .strict()
  .refine((i) => i.model !== "google" || i.color !== null, "Google exige cor");
export const commandSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("client.save"),
      id: uuid,
      name: z.string().trim().min(1).max(160),
      cpf: z.string().max(30),
      phone: z.string().max(30),
      email: z.union([z.literal(""), z.string().email().max(254)]),
      street: z.string().max(200),
      number: z.string().max(30),
      complement: z.string().max(200),
      district: z.string().max(100),
      city: z.string().max(100),
      uf: z.string().max(2),
      cep: z.string().max(20),
      archived: z.boolean(),
    })
    .strict(),
  z
    .object({
      action: z.literal("import.run"),
      importKey: uuid,
      sales: z
        .array(
          z
            .object({
              client: z.string().trim().min(1).max(160),
              amountCents: amount,
              soldOn: date,
              status: z.enum(["approved", "pending", "analysis", "cancelled"]),
              items: z.array(item).min(1).max(100),
            })
            .strict(),
        )
        .min(1)
        .max(100),
      goal: z
        .object({
          name: z.string().min(1).max(100),
          amountCents: amount,
          startsOn: date,
          endsOn: date,
        })
        .strict()
        .refine((g) => g.startsOn <= g.endsOn),
    })
    .strict(),
  z
    .object({
      action: z.literal("sale.save"),
      clientId: uuid.nullable(),
      id: uuid,
      client: z.string().trim().min(1).max(160),
      amountCents: amount,
      soldOn: date,
      status: z.enum(["approved", "pending", "analysis", "cancelled"]),
      version: z.number().int().min(1),
      items: z.array(item).min(1).max(100),
    })
    .strict(),
  z
    .object({
      action: z.literal("sale.archive"),
      id: uuid,
      version: z.number().int().min(1),
      archived: z.boolean(),
    })
    .strict(),
  z
    .object({
      action: z.literal("payment.create"),
      amountCents: amount,
      date,
      allocations: z
        .array(z.object({ saleId: uuid, amountCents: amount }).strict())
        .min(1)
        .max(100),
    })
    .strict(),
  z
    .object({
      action: z.literal("cash.create"),
      id: uuid,
      description: z.string().trim().min(1).max(160),
      amountCents: amount,
      date,
      direction: z.enum(["in", "out"]),
      confirmed: z.boolean(),
    })
    .strict(),
  z
    .object({
      action: z.literal("goal.save"),
      name: z.string().trim().min(1).max(100),
      amountCents: amount,
      startsOn: date,
      endsOn: date,
    })
    .strict()
    .refine((g) => g.startsOn <= g.endsOn, "Confira o período"),
  z
    .object({
      action: z.literal("profile.save"),
      name: z.string().trim().min(1).max(100),
      rateBps: z.number().int().min(0).max(10000),
    })
    .strict(),
]);
export const requestSchema = z
  .object({ key: uuid, command: commandSchema })
  .strict();
