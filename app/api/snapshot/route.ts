import { configured, json, supabaseServer } from "@/lib/supabase/server";
import type { Goal, Sale, Transaction } from "@/lib/domain/finance";
export async function GET() {
  if (!configured()) return json({ error: "Ambiente não configurado." }, 503);
  const db = await supabaseServer();
  const { data: user, error: authError } = await db.auth.getUser();
  if (authError || !user.user)
    return json({ error: "Entre novamente para continuar." }, 401);
  const results = await Promise.all([
    db
      .from("sales")
      .select(
        "*,clients(name),sale_items(*),commissions(id,entitlement_cents,commission_allocations(amount_cents))",
      )
      .eq("owner_id", user.user.id)
      .order("sold_on", { ascending: false })
      .limit(1000),
    db
      .from("financial_transactions")
      .select("*")
      .eq("owner_id", user.user.id)
      .order("occurred_on", { ascending: false })
      .limit(1000),
    db.from("goals").select("*").eq("owner_id", user.user.id).maybeSingle(),
    db
      .from("profiles")
      .select("name,rate_bps")
      .eq("owner_id", user.user.id)
      .maybeSingle(),
    db
      .from("clients")
      .select("*")
      .eq("owner_id", user.user.id)
      .order("name")
      .limit(1000),
  ]);
  if (results.some((r) => r.error))
    return json(
      {
        error:
          "Não foi possível carregar os dados. Confira as migrações e tente novamente.",
      },
      503,
    );
  const sales: Sale[] = (results[0].data ?? []).map((row) => ({
    id: row.id,
    clientId: row.client_id,
    client: row.clients?.name ?? "Cliente",
    amountCents: Number(row.amount_cents),
    soldOn: row.sold_on,
    rateBps: row.commission_rate_bps,
    status: row.payment_status,
    archived: !!row.archived_at,
    version: row.version,
    receivedCents: (Array.isArray(row.commissions)
      ? row.commissions
      : row.commissions
        ? [row.commissions]
        : []
    )
      .flatMap(
        (c: { commission_allocations: { amount_cents: number }[] }) =>
          c.commission_allocations ?? [],
      )
      .reduce(
        (n: number, a: { amount_cents: number }) => n + Number(a.amount_cents),
        0,
      ),
    items: (row.sale_items ?? []).map(
      (i: {
        model: "google" | "instagram";
        color: "blue" | "black" | null;
        quantity: number;
        is_gift: boolean;
      }) => ({
        model: i.model,
        color: i.color,
        quantity: i.quantity,
        isGift: i.is_gift,
      }),
    ),
  }));
  const transactions: Transaction[] = (results[1].data ?? []).map((row) => ({
    id: row.id,
    description: row.description,
    direction: row.direction,
    amountCents: Number(row.amount_cents),
    date: row.occurred_on,
    confirmed: row.status === "confirmed",
    derived: !!row.payment_id,
  }));
  const g = results[2].data;
  const goal: Goal | null = g
    ? {
        name: g.name,
        amountCents: Number(g.amount_cents),
        startsOn: g.starts_on,
        endsOn: g.ends_on,
      }
    : null;
  return json({
    clients: (results[4].data ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      cpf: c.cpf ?? "",
      phone: c.phone ?? "",
      email: c.email ?? "",
      street: c.street ?? "",
      number: c.number ?? "",
      complement: c.complement ?? "",
      district: c.district ?? "",
      city: c.city ?? "",
      uf: c.uf ?? "",
      cep: c.cep ?? "",
      archived: !!c.archived_at,
    })),
    sales,
    transactions,
    goal,
    profile: results[3].data,
    limited: sales.length === 1000 || transactions.length === 1000,
  });
}
