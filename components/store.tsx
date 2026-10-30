"use client";
import { createContext, useContext, useState, useEffect, useRef } from "react";
import { demoGoal, demoSales } from "@/lib/demo";
import {
  allocatePayment,
  today,
  type Sale,
  type Goal,
  type Transaction,
  type CommissionSettlement,
} from "@/lib/domain/finance";
import { Brand } from "./ui";
import { blankClient, type Client } from "@/lib/domain/client";
type Store = {
  clients: Client[];
  saveClient: (client: Client) => Promise<void>;
  sales: Sale[];
  goal: Goal;
  transactions: Transaction[];
  live: boolean;
  busy: boolean;
  profile: {
    name: string;
    rateBps: number;
    commissionSettlement?: CommissionSettlement;
  };
  saveSale: (sale: Sale) => Promise<void>;
  archiveSale: (sale: Sale, archived: boolean) => Promise<void>;
  registerPayment: (
    alloc: { saleId: string; amountCents: number }[],
    amount: number,
    date: string,
  ) => Promise<void>;
  addTransaction: (transaction: Transaction) => Promise<void>;
  updateGoal: (goal: Goal) => Promise<void>;
  updateProfile: (name: string, rateBps: number) => Promise<void>;
  importData: (data: Record<string, unknown>) => Promise<void>;
};
const Context = createContext<Store | null>(null);
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [sales, setSales] = useState(demoSales);
  const [clients, setClients] = useState<Client[]>(() =>
    demoSales.map((s) => ({ ...blankClient(s.clientId), name: s.client })),
  );
  const [goal, setGoal] = useState(demoGoal);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [mode, setMode] = useState<
    "loading" | "demo" | "live" | "login" | "error"
  >("loading");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState<Store["profile"]>({
    name: "Eduardo",
    rateBps: 500,
  });
  const commandActive = useRef(false);
  const pendingKeys = useRef(new Map<string, string>());
  async function refresh() {
    const r = await fetch("/api/snapshot", {
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    const d = await r.json();
    if (!r.ok) throw Error(d.error ?? "Não foi possível carregar.");
    if (d.limited)
      throw Error(
        "O volume excedeu o limite inicial de 1.000 registros. Ajuste a paginação antes de continuar.",
      );
    setSales(d.sales);
    setClients(d.clients);
    setTransactions(d.transactions);
    setGoal(
      d.goal ?? {
        name: "Defina sua primeira meta",
        amountCents: 0,
        startsOn: today(),
        endsOn: today(),
      },
    );
    setProfile({
      name: d.profile?.name ?? "Eduardo",
      rateBps: d.profile?.rate_bps ?? 500,
      commissionSettlement: d.profile?.commission_settlement ?? undefined,
    });
  }
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const r = await fetch("/api/session", {
          cache: "no-store",
          signal: AbortSignal.timeout(20000),
        });
        const d = await r.json();
        if (!active) return;
        if (d.mode === "demo") {
          setMode("demo");
          return;
        }
        if (d.mode === "login") {
          setMode("login");
          return;
        }
        if (d.mode !== "live")
          throw Error("Não foi possível verificar o ambiente.");
        await refresh();
        if (active) setMode("live");
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Falha de conexão.");
          setMode("error");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  async function command(payload: Record<string, unknown>) {
    if (commandActive.current) throw Error("Aguarde a operação atual.");
    commandActive.current = true;
    setBusy(true);
    try {
      const serialized = JSON.stringify(payload);
      const key = pendingKeys.current.get(serialized) ?? crypto.randomUUID();
      pendingKeys.current.set(serialized, key);
      const response = await fetch("/api/command", {
        method: "POST",
        signal: AbortSignal.timeout(20000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, command: payload }),
      });
      const d = await response.json();
      if (!response.ok) throw Error(d.error ?? "Não foi possível salvar.");
      pendingKeys.current.delete(serialized);
      try {
        await refresh();
      } catch {
        setMode("error");
        setError(
          "A operação foi registrada, mas a atualização falhou. Recarregue para consultar o resultado antes de repetir.",
        );
      }
    } finally {
      commandActive.current = false;
      setBusy(false);
    }
  }
  async function saveSale(sale: Sale) {
    if (mode === "live") {
      await command({
        action: "sale.save",
        id: sale.id,
        client: sale.client,
        clientId: clients.some((c) => c.id === sale.clientId)
          ? sale.clientId
          : null,
        amountCents: sale.amountCents,
        soldOn: sale.soldOn,
        status: sale.status,
        version: sale.version,
        items: sale.items,
      });
      return;
    }
    setSales((current) =>
      current.some((s) => s.id === sale.id)
        ? current.map((s) => (s.id === sale.id ? sale : s))
        : [...current, sale],
    );
    setClients((current) =>
      current.some((c) => c.id === sale.clientId)
        ? current
        : [...current, { ...blankClient(sale.clientId), name: sale.client }],
    );
  }
  async function archiveSale(sale: Sale, archived: boolean) {
    if (mode === "live") {
      await command({
        action: "sale.archive",
        id: sale.id,
        version: sale.version,
        archived,
      });
      return;
    }
    setSales((current) =>
      current.map((s) =>
        s.id === sale.id ? { ...s, archived, version: s.version + 1 } : s,
      ),
    );
  }
  async function registerPayment(
    allocations: { saleId: string; amountCents: number }[],
    amountCents: number,
    date: string,
  ) {
    if (mode === "live") {
      await command({
        action: "payment.create",
        amountCents,
        date,
        allocations,
      });
      return;
    }
    const next = allocatePayment(sales, allocations, amountCents);
    setSales(next);
    setTransactions((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        description: "Recebimento de comissão",
        direction: "in",
        amountCents,
        date,
        confirmed: true,
        derived: true,
      },
    ]);
  }
  async function addTransaction(transaction: Transaction) {
    if (mode === "live") {
      await command({
        action: "cash.create",
        id: transaction.id,
        description: transaction.description,
        amountCents: transaction.amountCents,
        date: transaction.date,
        direction: transaction.direction,
        confirmed: transaction.confirmed,
      });
      return;
    }
    setTransactions((current) => [...current, transaction]);
  }
  async function updateGoal(next: Goal) {
    if (mode === "live") {
      await command({ action: "goal.save", ...next });
      return;
    }
    setGoal(next);
  }
  async function updateProfile(name: string, rateBps: number) {
    if (mode === "live") {
      await command({ action: "profile.save", name, rateBps });
      return;
    }
    setProfile({ name, rateBps });
  }
  async function importData(data: Record<string, unknown>) {
    if (mode !== "live")
      throw Error("A importação privada exige o ambiente conectado.");
    await command(data);
  }
  async function saveClient(client: Client) {
    if (mode === "live") {
      await command({ action: "client.save", ...client });
      return;
    }
    setClients((current) =>
      current.some((c) => c.id === client.id)
        ? current.map((c) => (c.id === client.id ? client : c))
        : [...current, client],
    );
    setSales((current) =>
      current.map((s) =>
        s.clientId === client.id ? { ...s, client: client.name } : s,
      ),
    );
  }
  if (mode === "loading" || mode === "error")
    return (
      <main className="access-page">
        <Brand />
        <h1>
          {mode === "loading"
            ? "Preparando seu espaço…"
            : "Não foi possível carregar"}
        </h1>
        <p>{mode === "loading" ? "Verificando o ambiente." : error}</p>
        {mode === "error" && (
          <button className="button primary" onClick={() => location.reload()}>
            Tentar novamente
          </button>
        )}
      </main>
    );
  if (mode === "login") return <Login />;
  return (
    <Context.Provider
      value={{
        sales,
        goal,
        transactions,
        live: mode === "live",
        busy,
        profile,
        saveSale,
        archiveSale,
        registerPayment,
        addTransaction,
        updateGoal,
        updateProfile,
        importData,
        clients,
        saveClient,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useStore() {
  const store = useContext(Context);
  if (!store) throw Error("Store missing");
  return store;
}
function Login() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  return (
    <main className="access-page">
      <Brand />
      <h1>Seu comercial começa aqui.</h1>
      <p>Entre para acessar suas vendas, comissões e pedidos.</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setLoading(true);
          setError("");
          try {
            const r = await fetch("/api/session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: f.get("email"),
                password: f.get("password"),
                remember: f.get("remember") === "on",
              }),
            });
            const d = await r.json();
            if (!r.ok) throw Error(d.error);
            location.reload();
          } catch (err) {
            setError(
              err instanceof Error ? err.message : "Não foi possível entrar.",
            );
          } finally {
            setLoading(false);
          }
        }}
      >
        <label>
          E-mail
          <input type="email" name="email" autoComplete="username" required />
        </label>
        <label>
          Senha
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
          />
        </label>
        <label className="check-label remember-label">
          <input type="checkbox" name="remember" defaultChecked />
          Manter conectado neste dispositivo
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button className="button primary full" disabled={loading}>
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
