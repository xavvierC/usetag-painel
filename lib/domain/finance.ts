export type SaleStatus = "approved" | "pending" | "analysis" | "cancelled";
export type SaleItem = {
  model: "google" | "instagram";
  color: "blue" | "black" | null;
  quantity: number;
  isGift: boolean;
};
export type Sale = {
  id: string;
  clientId: string;
  client: string;
  amountCents: number;
  soldOn: string;
  rateBps: number;
  status: SaleStatus;
  archived: boolean;
  version: number;
  receivedCents: number;
  items: SaleItem[];
};
export type Transaction = {
  id: string;
  description: string;
  direction: "in" | "out";
  amountCents: number;
  date: string;
  confirmed: boolean;
  derived?: boolean;
};
export type Goal = {
  amountCents: number;
  startsOn: string;
  endsOn: string;
  name: string;
};
export const statusLabels: Record<SaleStatus, string> = {
  approved: "Aprovada",
  pending: "Pendente",
  analysis: "Em análise",
  cancelled: "Cancelada",
};

export function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}
export function cents(input: string) {
  const normalized = input.trim().replace(/^R\$\s*/, "");
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(normalized))
    throw new Error("Use um valor como 299,00.");
  const [whole, fraction = ""] = normalized.replaceAll(".", "").split(",");
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(result) || result <= 0 || result > 100_000_000_00)
    throw new Error("Informe um valor positivo dentro do limite.");
  return result;
}
export function commission(amount: number, bps = 500) {
  if (
    !Number.isSafeInteger(amount) ||
    amount < 0 ||
    !Number.isInteger(bps) ||
    bps < 0 ||
    bps > 10000
  )
    throw new Error("Valor ou taxa inválidos.");
  return Number((BigInt(amount) * BigInt(bps) + 5000n) / 10000n);
}
export function obligation(sale: Sale) {
  return sale.status === "approved"
    ? commission(sale.amountCents, sale.rateBps)
    : 0;
}
export function outstanding(sale: Sale) {
  return Math.max(0, obligation(sale) - sale.receivedCents);
}
export function adjustment(sale: Sale) {
  return Math.max(0, sale.receivedCents - obligation(sale));
}
export function dateLabel(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date(`${date}T12:00:00-03:00`));
}
export function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function isDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value
  );
}
export function summary(sales: Sale[], start: string, end: string) {
  const cohort = sales.filter((s) => s.soldOn >= start && s.soldOn <= end);
  const active = cohort.filter((s) => s.status === "approved" && !s.archived);
  const amount = active.reduce((n, s) => n + s.amountCents, 0);
  return {
    amount,
    count: active.length,
    ticket: active.length ? Math.round(amount / active.length) : 0,
    generated: cohort.reduce((n, s) => n + obligation(s), 0),
    received: cohort.reduce((n, s) => n + s.receivedCents, 0),
    pending: cohort.reduce((n, s) => n + outstanding(s), 0),
    adjustments: cohort.reduce((n, s) => n + adjustment(s), 0),
  };
}
export function allocatePayment(
  sales: Sale[],
  allocations: { saleId: string; amountCents: number }[],
  amount: number,
) {
  if (
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    new Set(allocations.map((a) => a.saleId)).size !== allocations.length ||
    !allocations.length ||
    allocations.reduce((n, a) => n + a.amountCents, 0) !== amount
  )
    throw new Error("A soma das alocações deve ser igual ao recebimento.");
  for (const a of allocations) {
    const sale = sales.find((s) => s.id === a.saleId);
    if (
      !sale ||
      !Number.isSafeInteger(a.amountCents) ||
      a.amountCents <= 0 ||
      a.amountCents > outstanding(sale)
    )
      throw new Error("Recebimento excede o saldo disponível.");
  }
  return sales.map((s) => ({
    ...s,
    receivedCents:
      s.receivedCents +
      (allocations.find((a) => a.saleId === s.id)?.amountCents ?? 0),
  }));
}
export function csv(rows: unknown[][]) {
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((value) => {
            let cell = String(value ?? "");
            if (
              /^[\s\u0000-\u001f]*[=+@-]/.test(cell) ||
              /^[\t\r\n]/.test(cell)
            )
              cell = "'" + cell;
            return '"' + cell.replaceAll('"', '""') + '"';
          })
          .join(";"),
      )
      .join("\r\n")
  );
}
