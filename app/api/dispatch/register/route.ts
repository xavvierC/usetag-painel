import {
  configured,
  json,
  supabaseServer,
  trustedOrigin,
} from "@/lib/supabase/server";
import {
  dispatchIssues,
  formatCep,
  formatCpf,
  formatPhone,
  type Dispatch,
} from "@/lib/domain/dispatch";
import { dispatchSchema } from "@/lib/validation/dispatch";
import { z } from "zod";

const requestSchema = z
  .object({
    saleId: z.string().uuid(),
    data: dispatchSchema,
  })
  .strict();

function commandError(error: unknown) {
  const code = typeof error === "object" && error && "code" in error
    ? String(error.code)
    : "";
  return code === "40001"
    ? json({ error: "Essa venda já foi alterada. Atualize e revise novamente." }, 409)
    : json({ error: "Não foi possível registrar a venda agora." }, 503);
}

export async function POST(request: Request) {
  if (!trustedOrigin(request)) return json({ error: "Origem inválida." }, 403);
  if (!configured()) return json({ error: "Configure o ambiente antes de registrar." }, 503);
  if (Number(request.headers.get("content-length") ?? 0) > 30000)
    return json({ error: "Solicitação inválida." }, 413);

  const db = await supabaseServer();
  const { data: auth, error: authError } = await db.auth.getUser();
  if (authError || !auth.user)
    return json({ error: "Entre novamente para continuar." }, 401);

  try {
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) return json({ error: "Revise os dados da venda." }, 400);

    const { saleId, data } = parsed.data as { saleId: string; data: Dispatch };
    const issues = dispatchIssues(data);
    const items = data.items.filter((item) => item.quantity !== 0);
    if (data.amountCents === null) issues.push("Informar o valor pago.");
    if (!data.soldOn) issues.push("Informar a data do pagamento.");
    if (!items.length) issues.push("Informar ao menos uma placa.");
    if (items.some((item) => item.quantity === null || item.quantity < 1))
      issues.push("Confirmar a quantidade de todas as placas.");
    if (issues.length) return json({ error: "A venda ainda precisa de revisão.", issues }, 422);

    const { data: existingSale, error: existingSaleError } = await db
      .from("sales")
      .select("id")
      .eq("owner_id", auth.user.id)
      .eq("id", saleId)
      .maybeSingle();
    if (existingSaleError) return commandError(existingSaleError);
    if (existingSale)
      return json({
        ok: true,
        saleId,
        alreadyRegistered: true,
        receiptUploadConfigured: Boolean(process.env.SUPABASE_SECRET_KEY),
      });

    const cpf = formatCpf(data.cpf);
    const { data: matches, error: clientLookupError } = await db
      .from("clients")
      .select("id,name,phone,email,street,number,complement,district,city,uf,cep,archived")
      .eq("owner_id", auth.user.id)
      .eq("cpf", cpf)
      .limit(1);
    if (clientLookupError) return commandError(clientLookupError);
    const current = matches?.[0] as Record<string, string | boolean> | undefined;
    const clientId = current?.id ? String(current.id) : crypto.randomUUID();
    const value = <T,>(next: T, old: T | undefined) =>
      typeof next === "string" && next.trim() === "" ? old ?? next : next;

    const clientCommand = {
      action: "client.save" as const,
      id: clientId,
      name: data.name.trim(),
      cpf,
      phone: value(formatPhone(data.phone), current?.phone as string | undefined),
      email: value(data.email.trim(), current?.email as string | undefined),
      street: value(data.address.trim(), current?.street as string | undefined),
      number: String(current?.number ?? ""),
      complement: String(current?.complement ?? ""),
      district: String(current?.district ?? ""),
      city: String(current?.city ?? ""),
      uf: String(current?.uf ?? ""),
      cep: value(formatCep(data.cep), current?.cep as string | undefined),
      archived: false,
    };
    const { error: clientError } = await db.rpc("panel_command", {
      p: clientCommand,
      k: crypto.randomUUID(),
    });
    if (clientError) return commandError(clientError);

    const saleCommand = {
      action: "sale.save" as const,
      clientId,
      id: saleId,
      client: data.name.trim(),
      amountCents: data.amountCents!,
      soldOn: data.soldOn!,
      status: data.paymentStatus ?? "approved",
      version: 1,
      items: items.map((item) => ({
        model: item.model.toLowerCase() as "google" | "instagram" | "uber",
        color: item.color
          ? (item.color === "Azul" ? "blue" : "black")
          : null,
        quantity: item.quantity!,
        isGift: item.gift,
      })),
    };
    const { error: saleError } = await db.rpc("panel_command", {
      p: saleCommand,
      k: crypto.randomUUID(),
    });
    if (saleError) return commandError(saleError);

    return json({
      ok: true,
      saleId,
      clientId,
      receiptUploadConfigured: Boolean(process.env.SUPABASE_SECRET_KEY),
    });
  } catch {
    return json({ error: "Não foi possível registrar a venda agora." }, 503);
  }
}
