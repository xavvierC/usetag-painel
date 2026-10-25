"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowUpDown,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Download,
  LayoutDashboard,
  Menu,
  Plus,
  Package,
  Search,
  Settings2,
  ShoppingBag,
  Sparkles,
  Target,
  Users,
  Wallet,
  X,
  FileText,
  ShieldCheck,
  Database,
  Zap,
  ArrowRight,
  SlidersHorizontal,
} from "lucide-react";
import { useStore } from "./store";
import { Brand, Empty, Modal } from "./ui";
import { SalesTable } from "./sales-table";
import { SaleForm } from "./sale-form";
import { DispatchEditor } from "./dispatch-editor";
import { Clients } from "./clients";
import {
  allocatePayment,
  adjustment,
  cents,
  commission,
  csv,
  dateLabel,
  isDate,
  money,
  obligation,
  outstanding,
  summary,
  today,
  type Sale,
} from "@/lib/domain/finance";

const navigation = [
  ["dashboard", "Visão geral", LayoutDashboard],
  ["vendas", "Vendas", ShoppingBag],
  ["clientes", "Clientes", Users],
  ["comissoes", "Comissões", CircleDollarSign],
  ["financeiro", "Financeiro", Wallet],
  ["metas", "Metas", Target],
  ["expedicao", "Pedidos", FileText],
  ["assistente", "Assistente IA", Sparkles],
] as const;
export function Panel({ section }: { section: string }) {
  const {
    sales,
    saveSale,
    archiveSale,
    goal,
    transactions,
    live,
    busy,
    profile,
  } = useStore();
  const [menu, setMenu] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState("meta");
  const [start, setStart] = useState(goal.startsOn);
  const [end, setEnd] = useState(goal.endsOn);
  const [status, setStatus] = useState("all");
  const [archived, setArchived] = useState(false);
  const [editing, setEditing] = useState<Sale | undefined>();
  const [formOpen, setFormOpen] = useState(false);
  const [archive, setArchive] = useState<Sale>();
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (!menu) return;
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenu(false);
        menuButton.current?.focus();
      }
    }
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [menu]);
  useEffect(() => {
    setMenu(false);
  }, [section]);
  function changePeriod(next: string) {
    setPeriod(next);
    if (next === "custom") return;
    if (next === "meta") {
      setStart(goal.startsOn);
      setEnd(goal.endsOn);
      return;
    }
    const t = today();
    const d = new Date(`${t}T12:00:00Z`);
    if (next === "week")
      d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    if (next === "month") d.setUTCDate(1);
    setStart(d.toISOString().slice(0, 10));
    setEnd(t);
  }
  const datesValid = isDate(start) && isDate(end) && start <= end;
  const stats = summary(
    sales,
    datesValid ? start : "9999",
    datesValid ? end : "0000",
  );
  const goalStats = summary(sales, goal.startsOn, goal.endsOn);
  const totalPlates = sales
    .filter((sale) => sale.status === "approved" && !sale.archived)
    .reduce(
      (total, sale) =>
        total + sale.items.reduce((items, item) => items + item.quantity, 0),
      0,
    );
  const progress = goal.amountCents
    ? Math.min(100, (goalStats.amount / goal.amountCents) * 100)
    : 0;
  const filtered = sales
    .filter(
      (s) =>
        s.archived === archived &&
        s.soldOn >= start &&
        s.soldOn <= end &&
        s.client
          .toLocaleLowerCase("pt-BR")
          .includes(query.toLocaleLowerCase("pt-BR")) &&
        (status === "all" || s.status === status),
    )
    .sort(
      (a, b) => b.soldOn.localeCompare(a.soldOn) || b.id.localeCompare(a.id),
    );
  const title =
    section === "configuracoes"
      ? "Configurações"
      : (navigation.find((n) => n[0] === section)?.[1] ?? "Visão geral");
  const descriptions: Record<string, string> = {
    dashboard: "Suas vendas em perspectiva. Seu próximo objetivo à vista.",
    vendas: "Cada venda, cada detalhe, tudo no lugar.",
    clientes: "As pessoas por trás dos seus resultados.",
    comissoes: "Acompanhe o que você gerou e o que já recebeu.",
    financeiro: "Clareza sobre o dinheiro que entrou e saiu.",
    metas: "Um objetivo claro. Um passo de cada vez.",
    expedicao: "Do atendimento ao pedido organizado.",
    assistente: "Transforme os dados do cliente em uma mensagem pronta.",
    configuracoes: "Seu espaço, suas preferências e conexões.",
  };
  function exportSales() {
    const text = csv([
      ["Cliente", "Data", "Valor (R$)", "Comissão (R$)", "Situação"],
      ...filtered.map((s) => [
        s.client,
        dateLabel(s.soldOn),
        (s.amountCents / 100).toFixed(2).replace(".", ","),
        (obligation(s) / 100).toFixed(2).replace(".", ","),
        s.status,
      ]),
    ]);
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `usetag-vendas-filtradas${live ? "" : "-demo"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setNotice("CSV das vendas filtradas exportado.");
  }
  const newSale = () => {
    setEditing(undefined);
    setFormOpen(true);
  };
  const editSale = (sale: Sale) => {
    setEditing(sale);
    setFormOpen(true);
  };
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Ir para o conteúdo
      </a>
      <header className="topbar">
        <div className="topbar-brand">
          <button
            ref={menuButton}
            className="icon-button mobile-toggle"
            aria-label={menu ? "Fechar navegação" : "Abrir navegação"}
            aria-expanded={menu}
            aria-controls="sidebar"
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X size={22} /> : <Menu size={22} />}
          </button>
          <Link href="/dashboard" aria-label="USETAG, início">
            <Brand />
          </Link>
          <span className="brand-divider" />
          <span className="workspace-name">Vendas e Comissão</span>
        </div>
        <div className="topbar-actions">
          <span className="demo-chip">
            <i />
            {live ? "Ambiente privado" : "Demonstração"}
          </span>
          <Link
            className="icon-button"
            href="/metas"
            aria-label="Ver metas e período"
          >
            <CalendarDays size={19} />
          </Link>
          <span className="topbar-separator" />
          <Link
            href="/configuracoes"
            className="profile"
            aria-label="Configurações de Eduardo"
          >
            <span className="avatar">E</span>
            <span>
              {profile.name}
              <small>Comercial USETAG</small>
            </span>
            <ChevronDown size={14} />
          </Link>
        </div>
      </header>
      {menu && (
        <button
          className="nav-scrim"
          aria-label="Fechar navegação"
          onClick={() => setMenu(false)}
        />
      )}
      <aside id="sidebar" className={"sidebar " + (menu ? "is-open" : "")}>
        <span className="nav-label">ESPAÇO DE TRABALHO</span>
        <nav aria-label="Navegação principal">
          {navigation.map(([route, label, Icon]) => (
            <Link
              key={route}
              href={"/" + route}
              className={section === route ? "nav-link active" : "nav-link"}
              aria-current={section === route ? "page" : undefined}
            >
              <Icon size={19} strokeWidth={1.65} />
              <span>{label}</span>
              {section === route && <span className="nav-active-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span className="tip-icon">
              <Zap size={17} />
            </span>
            <strong>Seu próximo resultado</strong>
            <p>
              Começa com uma conversa.
              <br />
              Acompanhe cada conquista.
            </p>
            <Link href="/metas">
              Acompanhar meta <ArrowUpRight size={14} />
            </Link>
          </div>
          <Link
            href="/configuracoes"
            className={
              "nav-link " + (section === "configuracoes" ? "active" : "")
            }
          >
            <Settings2 size={19} />
            Configurações
          </Link>
          <div className="sidebar-foot">
            <span className="dot" />{" "}
            {live ? "Ambiente privado" : "Ambiente de demonstração"}{" "}
            <span>v0.1</span>
          </div>
        </div>
      </aside>
      <main id="main-content" className="main">
        <div className="page-heading">
          <div>
            <div className="breadcrumb">
              Seu espaço <ChevronRight size={12} /> {title}
            </div>
            <h1>
              {title}
              <span className="heading-dot">.</span>
            </h1>
            <p>{descriptions[section]}</p>
          </div>
          <button className="button primary" onClick={newSale}>
            <Plus size={17} /> Nova venda
          </button>
        </div>
        <div className="demo-banner" hidden={live}>
          <span>
            <span className="dot" />
            Prévia interativa com dados fictícios · alterações somente nesta
            sessão
          </span>
          <Link href="/configuracoes">
            Configurar ambiente <ArrowUpRight size={14} />
          </Link>
        </div>
        {!["configuracoes", "expedicao", "assistente", "metas"].includes(
          section,
        ) && (
          <div className="toolbar">
            <div className="period-select">
              <CalendarDays size={16} />
              <label className="sr-only" htmlFor="period">
                Período das vendas
              </label>
              <select
                id="period"
                value={period}
                onChange={(e) => changePeriod(e.target.value)}
              >
                <option value="meta">Período da meta</option>
                <option value="today">Hoje</option>
                <option value="week">Esta semana</option>
                <option value="month">Este mês</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>
            {period === "custom" ? (
              <div className="date-fields">
                <label>
                  De
                  <input
                    type="date"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                  />
                </label>
                <label>
                  Até
                  <input
                    type="date"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                  />
                </label>
              </div>
            ) : (
              <span className="toolbar-date">
                {dateLabel(start)} — {dateLabel(end)}
              </span>
            )}
            <span className="timezone">Horário de Brasília</span>
          </div>
        )}
        {!datesValid && (
          <p className="error" role="alert">
            Informe um intervalo de datas válido.
          </p>
        )}
        {section === "dashboard" && (
          <div className="dashboard-grid">
            <div className="dashboard-main">
              <div className="metrics">
                <Metric
                  label="Vendas no período"
                  value={money(stats.amount)}
                  detail={`${stats.count} vendas aprovadas`}
                  icon={ShoppingBag}
                />
                <Metric
                  label="Comissão gerada"
                  value={money(stats.generated)}
                  detail="Taxa preservada em cada venda"
                  icon={CircleDollarSign}
                />
                <Metric
                  label="Meta do período"
                  value={money(goal.amountCents)}
                  detail={`Até ${dateLabel(goal.endsOn)}`}
                  icon={Target}
                />
                <Metric
                  label="A receber"
                  value={money(stats.pending)}
                  detail="Comissões das vendas do período"
                  icon={Wallet}
                  accent
                />
              </div>
              <div className="charts-row">
                <SalesChart sales={sales} start={start} end={end} />
                <section className="surface goal-card">
                  <div className="surface-title">
                    <h2>Sua próxima conquista</h2>
                    <Target size={17} />
                  </div>
                  <div
                    className="progress-ring"
                    style={
                      {
                        "--progress": `${progress * 3.6}deg`,
                      } as React.CSSProperties
                    }
                  >
                    <div>
                      <Target size={29} />
                      <strong>
                        {progress.toFixed(1).replace(".", ",")}
                        <span>%</span>
                      </strong>
                    </div>
                  </div>
                  <span className="muted">Falta pouco a cada venda</span>
                  <strong className="goal-remaining">
                    {money(Math.max(0, goal.amountCents - goalStats.amount))}
                  </strong>
                  <p>restantes para atingir a meta</p>
                  <Link href="/metas" className="text-button">
                    Ver minha meta <ArrowRight size={14} />
                  </Link>
                </section>
              </div>
              <section className="surface recent-sales">
                <div className="surface-title">
                  <div>
                    <h2>Vendas recentes</h2>
                    <p className="muted">
                      Seus últimos passos em direção à meta.
                    </p>
                  </div>
                  <Link className="text-button" href="/vendas">
                    Ver todas <ArrowUpRight size={15} />
                  </Link>
                </div>
                <SalesTable sales={filtered.slice(0, 5)} />
                <div className="table-footer">
                  <span>{filtered.length} venda(s) no filtro</span>
                  <span>Comissão sobre vendas aprovadas</span>
                </div>
              </section>
              <div className="bottom-insights">
                <div>
                  <span className="insight-icon">
                    <ArrowDownLeft size={17} />
                  </span>
                  <div>
                    <span>Recebido na coorte de vendas</span>
                    <strong>{money(stats.received)}</strong>
                  </div>
                </div>
                <div>
                  <span className="insight-icon">
                    <ArrowUpDown size={17} />
                  </span>
                  <div>
                    <span>Ticket médio do período</span>
                    <strong>{money(stats.ticket)}</strong>
                  </div>
                </div>
                <div>
                  <span className="insight-icon">
                    <ShieldCheck size={17} />
                  </span>
                  <div>
                    <span>Caixa pessoal confirmado</span>
                    <strong>
                      {money(
                        transactions
                          .filter((t) => t.confirmed)
                          .reduce(
                            (n, t) =>
                              n +
                              (t.direction === "in" ? 1 : -1) * t.amountCents,
                            0,
                          ),
                      )}
                    </strong>
                  </div>
                </div>
                <div>
                  <span className="insight-icon">
                    <Package size={17} />
                  </span>
                  <div>
                    <span>Placas vendidas</span>
                    <strong>{totalPlates.toLocaleString("pt-BR")}</strong>
                  </div>
                </div>
              </div>
            </div>
            <DispatchEditor compact />
          </div>
        )}
        {section === "vendas" && (
          <section className="surface">
            <div className="surface-title">
              <h2>
                Todas as vendas <span className="count">{filtered.length}</span>
              </h2>
              <button className="button secondary" onClick={exportSales}>
                <Download size={16} />
                Exportar CSV
              </button>
            </div>
            <div className="filters">
              <label className="search-field">
                <Search size={17} />
                <input
                  aria-label="Buscar cliente"
                  placeholder="Buscar por cliente…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <label className="select-field">
                <SlidersHorizontal size={16} />
                <select
                  aria-label="Filtrar situação"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="all">Todas as situações</option>
                  <option value="approved">Aprovadas</option>
                  <option value="pending">Pendentes</option>
                  <option value="analysis">Em análise</option>
                  <option value="cancelled">Canceladas</option>
                </select>
              </label>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={archived}
                  onChange={(e) => setArchived(e.target.checked)}
                />
                Arquivadas
              </label>
            </div>
            <SalesTable
              sales={datesValid ? filtered : []}
              all
              onEdit={editSale}
              onArchive={(s) => {
                if (!s.archived) {
                  setArchive(s);
                  return;
                }
                archiveSale(s, false).catch((e) => setNotice(e.message));
              }}
            />
          </section>
        )}
        {section === "clientes" && <Clients />}
        {section === "comissoes" && <Commissions start={start} end={end} />}
        {section === "financeiro" && <Finance start={start} end={end} />}
        {section === "metas" && <Goals />}
        {(section === "expedicao" || section === "assistente") && (
          <DispatchEditor />
        )}
        {section === "configuracoes" && <Settings />}
        <footer className="main-footer">
          <span>
            USETAG <span className="muted">/</span> Seu comercial, organizado.
          </span>
          <span>Comissão prevista não é saldo disponível.</span>
        </footer>
        {notice && (
          <p className="toast" role="status">
            <Check size={16} />
            {notice}
            <button
              className="icon-button"
              onClick={() => setNotice("")}
              aria-label="Fechar aviso"
            >
              <X size={14} />
            </button>
          </p>
        )}
      </main>
      {formOpen && (
        <SaleForm
          sale={editing}
          onClose={() => setFormOpen(false)}
          onSave={async (next) => {
            await saveSale(next);
            setNotice(
              live ? "Venda registrada." : "Venda atualizada na demonstração.",
            );
          }}
        />
      )}
      {archive && (
        <Modal
          title="Arquivar esta venda?"
          onClose={() => setArchive(undefined)}
        >
          <p>
            A venda de <strong>{archive.client}</strong> sairá da listagem
            ativa. A comissão e os recebimentos serão preservados. Você poderá
            restaurá-la depois.
          </p>
          <div className="modal-actions">
            <button
              className="button secondary"
              onClick={() => setArchive(undefined)}
            >
              Voltar
            </button>
            <button
              className="button primary"
              disabled={busy}
              onClick={async () => {
                try {
                  await archiveSale(archive, true);
                  setArchive(undefined);
                } catch (e) {
                  setNotice(
                    e instanceof Error
                      ? e.message
                      : "Não foi possível arquivar.",
                  );
                }
              }}
            >
              Arquivar venda
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Wallet;
  accent?: boolean;
}) {
  return (
    <section className={"surface metric " + (accent ? "metric-accent" : "")}>
      <div>
        <span className="metric-icon">
          <Icon size={17} />
        </span>
        <h2>{label}</h2>
      </div>
      <strong>{value}</strong>
      <p>{detail}</p>
    </section>
  );
}

function SalesChart({
  sales,
  start,
  end,
}: {
  sales: Sale[];
  start: string;
  end: string;
}) {
  const valid = isDate(start) && isDate(end) && start <= end;
  const span = valid
    ? Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1
    : 1;
  const buckets = Array.from({ length: Math.min(7, span) }, (_, i) => {
    const d = new Date(`${start}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + Math.floor((i * span) / Math.min(7, span)));
    const a = valid ? d.toISOString().slice(0, 10) : "2026-10-23";
    const next = new Date(d);
    next.setUTCDate(
      next.getUTCDate() +
        Math.floor(((i + 1) * span) / Math.min(7, span)) -
        Math.floor((i * span) / Math.min(7, span)),
    );
    const b = next.toISOString().slice(0, 10);
    return {
      date: a,
      value: sales
        .filter(
          (s) =>
            s.status === "approved" &&
            !s.archived &&
            s.soldOn >= a &&
            s.soldOn < b,
        )
        .reduce((n, s) => n + s.amountCents, 0),
    };
  });
  const top = Math.max(10000, ...buckets.map((b) => b.value));
  const max = Math.ceil(top / 10000) * 10000;
  return (
    <section className="surface chart-card">
      <div className="surface-title">
        <div>
          <h2>Evolução de vendas</h2>
          <p className="muted">Vendas aprovadas no período</p>
        </div>
        <span className="legend">
          <i /> Valor vendido
        </span>
      </div>
      <div
        className="chart-area"
        role="img"
        aria-label={buckets
          .map((b) => `${dateLabel(b.date)}: ${money(b.value)}`)
          .join("; ")}
      >
        <div className="chart-axis">
          {[1, 0.75, 0.5, 0.25, 0].map((n) => (
            <span key={n}>
              {new Intl.NumberFormat("pt-BR", {
                maximumFractionDigits: 0,
              }).format((max * n) / 100)}
            </span>
          ))}
        </div>
        <div className="chart-plot">
          <div className="chart-grid">
            {[1, 2, 3, 4, 5].map((n) => (
              <i key={n} />
            ))}
          </div>
          <div className="chart-bars">
            {buckets.map((b, i) => (
              <div className="bar-column" key={b.date}>
                <div
                  className={"chart-bar " + (b.value ? "has-value" : "")}
                  style={{ height: `${Math.max(1, (b.value / max) * 100)}%` }}
                >
                  <span>{money(b.value)}</span>
                </div>
                <span className="bar-date">
                  {b.date.slice(8, 10)}/{b.date.slice(5, 7)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="chart-caption">
        <span>Valores em reais (R$)</span>
        <span>Dados de demonstração</span>
      </div>
    </section>
  );
}

function Commissions({ start, end }: { start: string; end: string }) {
  const { sales, registerPayment, live, busy } = useStore();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [alloc, setAlloc] = useState<Record<string, string>>({});
  const cohort = sales.filter((s) => s.soldOn >= start && s.soldOn <= end);
  const stats = summary(sales, start, end);
  return (
    <>
      <div className="metrics">
        <Metric
          label="Direito de comissão"
          value={money(stats.generated)}
          detail="Vendas do período, inclusive arquivadas"
          icon={CircleDollarSign}
        />
        <Metric
          label="Recebido na coorte"
          value={money(stats.received)}
          detail="Situação atual das vendas do período"
          icon={ArrowDownLeft}
        />
        <Metric
          label="A receber"
          value={money(stats.pending)}
          detail="Saldo disponível para alocação"
          icon={Wallet}
          accent
        />
        <Metric
          label="Ajustes a resolver"
          value={money(stats.adjustments)}
          detail="Excedentes de vendas canceladas/editadas"
          icon={ArrowUpDown}
        />
      </div>
      <section className="surface section-gap">
        <div className="surface-title">
          <div>
            <h2>Suas comissões</h2>
            <p className="muted">
              Saldos atuais por venda · taxa preservada no fechamento
            </p>
          </div>
          <button className="button primary" onClick={() => setOpen(true)}>
            <Plus size={16} />
            Registrar recebimento
          </button>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th className="numeric">Venda</th>
                <th className="numeric">Comissão</th>
                <th className="numeric">Recebido</th>
                <th className="numeric">Pendente</th>
                <th className="numeric">Ajuste</th>
              </tr>
            </thead>
            <tbody>
              {cohort.map((s) => (
                <tr key={s.id}>
                  <td>
                    {s.client}
                    {s.archived && <small>Arquivada</small>}
                  </td>
                  <td className="numeric">{money(s.amountCents)}</td>
                  <td className="numeric">{money(obligation(s))}</td>
                  <td className="numeric">{money(s.receivedCents)}</td>
                  <td className="numeric commission-value">
                    {money(outstanding(s))}
                  </td>
                  <td className="numeric">{money(adjustment(s))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!cohort.length && (
          <Empty
            title="Sem comissões neste período"
            detail="As comissões aparecem após registrar as vendas."
          />
        )}
      </section>
      {open && (
        <Modal title="Registrar recebimento" onClose={() => setOpen(false)}>
          <p className="notice">
            {live ? "" : "Demonstração · "}Escolha quanto recebeu de cada venda.
            O total gera uma única entrada no caixa pessoal.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              try {
                const allocations = Object.entries(alloc)
                  .filter(([, v]) => v.trim())
                  .map(([saleId, v]) => ({ saleId, amountCents: cents(v) }));
                const amount = cents(String(f.get("amount")));
                const date = String(f.get("date"));
                if (!isDate(date)) throw Error("Data inválida.");
                await registerPayment(allocations, amount, date);
                setOpen(false);
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : "Confira os valores.",
                );
              }
            }}
          >
            <div className="form-grid">
              <label>
                Total recebido (R$)
                <input
                  name="amount"
                  required
                  inputMode="decimal"
                  placeholder="42,64"
                />
              </label>
              <label>
                Data do recebimento
                <input
                  name="date"
                  type="date"
                  required
                  defaultValue={today()}
                />
              </label>
            </div>
            <h3 className="form-subheading">Distribuir entre comissões</h3>
            {sales
              .filter((s) => outstanding(s) > 0)
              .map((s) => (
                <label className="allocation" key={s.id}>
                  <span>
                    {s.client}
                    <small>Disponível: {money(outstanding(s))}</small>
                  </span>
                  <input
                    inputMode="decimal"
                    placeholder="0,00"
                    value={alloc[s.id] ?? ""}
                    onChange={(e) =>
                      setAlloc({ ...alloc, [s.id]: e.target.value })
                    }
                  />
                </label>
              ))}
            <p className="muted">
              A soma distribuída deve ser exatamente igual ao total recebido.
            </p>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </button>
              <button className="button primary" disabled={busy}>
                {live ? "Registrar recebimento" : "Registrar na demonstração"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function Finance({ start, end }: { start: string; end: string }) {
  const { transactions, addTransaction, live, busy } = useStore();
  const draftId = useRef(crypto.randomUUID());
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const visible = transactions.filter((t) => t.date >= start && t.date <= end);
  const income = visible
    .filter((t) => t.confirmed && t.direction === "in")
    .reduce((n, t) => n + t.amountCents, 0);
  const expense = visible
    .filter((t) => t.confirmed && t.direction === "out")
    .reduce((n, t) => n + t.amountCents, 0);
  return (
    <>
      <div className="metrics three">
        <Metric
          label="Entradas confirmadas"
          value={money(income)}
          detail="Pela data do recebimento"
          icon={ArrowDownLeft}
        />
        <Metric
          label="Saídas confirmadas"
          value={money(expense)}
          detail="Despesas pessoais do período"
          icon={ArrowUpRight}
        />
        <Metric
          label="Saldo no período"
          value={money(income - expense)}
          detail="Comissões previstas não entram no saldo"
          icon={Wallet}
          accent
        />
      </div>
      <section className="surface section-gap">
        <div className="surface-title">
          <h2>Movimentações pessoais</h2>
          <button className="button primary" onClick={() => setOpen(true)}>
            <Plus size={16} />
            Nova movimentação
          </button>
        </div>
        {visible.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Situação</th>
                  <th className="numeric">Valor</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((t) => (
                  <tr key={t.id}>
                    <td>
                      {t.description}
                      {t.derived && (
                        <small>Gerada pelo recebimento de comissão</small>
                      )}
                    </td>
                    <td>{dateLabel(t.date)}</td>
                    <td>{t.direction === "in" ? "Entrada" : "Saída"}</td>
                    <td>
                      <span
                        className={
                          "badge " + (t.confirmed ? "approved" : "pending")
                        }
                      >
                        {t.confirmed ? "Confirmada" : "Prevista"}
                      </span>
                    </td>
                    <td className="numeric">
                      {t.direction === "out" ? "− " : ""}
                      {money(t.amountCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="Seu caixa começa por aqui"
            detail="Recebimentos de comissão e movimentações pessoais aparecerão nesta lista."
          />
        )}
      </section>
      {open && (
        <Modal title="Nova movimentação" onClose={() => setOpen(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              try {
                const date = String(f.get("date"));
                if (!isDate(date)) throw Error("Informe uma data válida.");
                const amountCents = cents(String(f.get("amount")));
                await addTransaction({
                  id: draftId.current,
                  description: String(f.get("description")),
                  date,
                  amountCents,
                  direction: f.get("direction") === "in" ? "in" : "out",
                  confirmed: f.get("confirmed") === "yes",
                });
                draftId.current = crypto.randomUUID();
                setOpen(false);
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : "Confira os campos.",
                );
              }
            }}
          >
            <p className="notice">
              {live
                ? "Lançamento no caixa pessoal."
                : "Demonstração · lançamentos em memória, sem persistência."}
            </p>
            <div className="form-grid">
              <label className="span-2">
                Descrição
                <input name="description" required maxLength={160} />
              </label>
              <label>
                Valor (R$)
                <input name="amount" required inputMode="decimal" />
              </label>
              <label>
                Data
                <input
                  type="date"
                  name="date"
                  required
                  defaultValue={today()}
                />
              </label>
              <label>
                Tipo
                <select name="direction">
                  <option value="out">Saída / despesa</option>
                  <option value="in">Entrada / outro recebimento</option>
                </select>
              </label>
              <label>
                Situação
                <select name="confirmed">
                  <option value="yes">Confirmada</option>
                  <option value="no">Prevista</option>
                </select>
              </label>
            </div>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="modal-actions">
              <button className="button primary" disabled={busy}>
                {live ? "Registrar movimentação" : "Adicionar na demonstração"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function Goals() {
  const { goal, updateGoal, sales, live, busy } = useStore();
  const [feedback, setFeedback] = useState("");
  const amount = summary(sales, goal.startsOn, goal.endsOn).amount;
  const percentage = goal.amountCents
    ? Math.min(100, (amount / goal.amountCents) * 100)
    : 0;
  return (
    <section className="surface goals-page">
      <span className="eyebrow">FOCO NO PRÓXIMO PASSO</span>
      <h2>{goal.name}</h2>
      <p className="muted">
        {dateLabel(goal.startsOn)} a {dateLabel(goal.endsOn)}
      </p>
      <div className="goal-large-values">
        <strong>{money(amount)}</strong>
        <span>de {money(goal.amountCents)}</span>
      </div>
      <progress max="100" value={percentage} aria-label="Progresso da meta" />
      <p>
        {percentage.toFixed(1).replace(".", ",")}% concluídos · faltam{" "}
        <strong>{money(Math.max(0, goal.amountCents - amount))}</strong>
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          try {
            const startsOn = String(f.get("start"));
            const endsOn = String(f.get("end"));
            if (!isDate(startsOn) || !isDate(endsOn) || startsOn > endsOn)
              throw Error("Confira o intervalo de datas.");
            await updateGoal({
              name: String(f.get("name")),
              amountCents: cents(String(f.get("amount"))),
              startsOn,
              endsOn,
            });
            setFeedback(
              live
                ? "Meta salva."
                : "Meta atualizada nesta sessão de demonstração.",
            );
          } catch (err) {
            setFeedback(
              err instanceof Error ? err.message : "Confira os campos.",
            );
          }
        }}
      >
        <h3 className="form-subheading">Ajustar minha meta</h3>
        <div className="form-grid">
          <label>
            Nome
            <input
              name="name"
              required
              maxLength={100}
              defaultValue={goal.name}
            />
          </label>
          <label>
            Objetivo em vendas (R$)
            <input
              name="amount"
              required
              inputMode="decimal"
              defaultValue={(goal.amountCents / 100)
                .toFixed(2)
                .replace(".", ",")}
            />
          </label>
          <label>
            Início
            <input
              name="start"
              type="date"
              required
              defaultValue={goal.startsOn}
            />
          </label>
          <label>
            Fim
            <input name="end" type="date" required defaultValue={goal.endsOn} />
          </label>
        </div>
        <button className="button primary section-gap" disabled={busy}>
          {live ? "Salvar meta" : "Aplicar na demonstração"}
        </button>
        {feedback && (
          <p role="status" className="notice">
            {feedback}
          </p>
        )}
      </form>
    </section>
  );
}
function Settings() {
  const { live, busy, profile, updateProfile, importData } = useStore();
  const [feedback, setFeedback] = useState("");
  return (
    <div className="settings-grid">
      <section className="surface">
        <div className="surface-title">
          <h2>Seu perfil comercial</h2>
          <Users size={18} />
        </div>
        <dl className="definition-list">
          <div>
            <dt>Nome</dt>
            <dd>{profile.name}</dd>
          </div>
          <div>
            <dt>Empresa</dt>
            <dd>USETAG</dd>
          </div>
          <div>
            <dt>Comissão padrão inicial</dt>
            <dd>{profile.rateBps / 100}%</dd>
          </div>
          <div>
            <dt>Fuso horário</dt>
            <dd>America/Sao_Paulo</dd>
          </div>
          <div>
            <dt>Ambiente atual</dt>
            <dd>
              <span className={"badge " + (live ? "approved" : "pending")}>
                {live ? "Privado" : "Demonstração em memória"}
              </span>
            </dd>
          </div>
        </dl>
        <form
          className="section-gap"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            try {
              const rate = Number(String(f.get("rate")).replace(",", "."));
              const bps = Math.round(rate * 100);
              if (!Number.isFinite(rate) || bps < 0 || bps > 10000)
                throw Error("Informe uma taxa entre 0% e 100%.");
              await updateProfile(String(f.get("name")), bps);
              setFeedback(
                live ? "Perfil salvo." : "Perfil alterado nesta demonstração.",
              );
            } catch (err) {
              setFeedback(
                err instanceof Error ? err.message : "Não foi possível salvar.",
              );
            }
          }}
        >
          <div className="form-grid">
            <label>
              Nome de exibição
              <input
                name="name"
                required
                maxLength={100}
                defaultValue={profile.name}
              />
            </label>
            <label>
              Comissão padrão (%)
              <input
                name="rate"
                required
                inputMode="decimal"
                defaultValue={profile.rateBps / 100}
              />
            </label>
          </div>
          <p className="notice">
            A taxa padrão vale para novas vendas. As taxas históricas permanecem
            preservadas.
          </p>
          <button className="button primary" disabled={busy}>
            {live ? "Salvar perfil" : "Aplicar na demonstração"}
          </button>
          {feedback && (
            <p role="status" className="notice">
              {feedback}
            </p>
          )}
        </form>
        {live && (
          <button
            className="button secondary section-gap"
            onClick={async () => {
              const r = await fetch("/api/session", { method: "DELETE" });
              if (r.ok) location.reload();
              else setFeedback("Não foi possível sair. Tente novamente.");
            }}
          >
            Sair da conta
          </button>
        )}
      </section>
      <section className="surface">
        <div className="surface-title">
          <h2>Conexões do ambiente</h2>
          <Database size={18} />
        </div>
        <p className="muted">
          {live
            ? "Você está conectado ao ambiente privado."
            : "A prévia usa dados fictícios. Para operar com dados reais, configure o ambiente privado e valide as integrações."}
        </p>
        <dl className="definition-list">
          <div>
            <dt>Banco e autenticação</dt>
            <dd>
              <span className={"badge " + (live ? "approved" : "pending")}>
                {live ? "Conectado" : "Configuração pendente"}
              </span>
            </dd>
          </div>
          <div>
            <dt>Comprovantes privados</dt>
            <dd>
              <span className="badge pending">Configuração pendente</span>
            </dd>
          </div>
          <div>
            <dt>Provedor de IA</dt>
            <dd>
              <span className="badge pending">Não configurado</span>
            </dd>
          </div>
          <div>
            <dt>Estruturação manual</dt>
            <dd>
              <span className="badge approved">Disponível</span>
            </dd>
          </div>
        </dl>
        <p className="notice">
          As credenciais são configuradas por variáveis de ambiente. Não cole
          chaves em pedidos ou anotações.
        </p>
        {live && (
          <form
            className="section-gap"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget).get("importFile");
              try {
                if (!(f instanceof File) || f.size > 65536)
                  throw Error("Use um JSON privado de até 64 KB.");
                const parsed = JSON.parse(await f.text());
                if (parsed.action !== "import.run")
                  throw Error("Arquivo de importação inválido.");
                await importData(parsed);
                setFeedback(
                  "Importação concluída. Repetir o mesmo arquivo não duplica os registros.",
                );
              } catch (err) {
                setFeedback(
                  err instanceof Error
                    ? err.message
                    : "Não foi possível importar.",
                );
              }
            }}
          >
            <h3>Importação privada</h3>
            <p className="notice">
              Importe somente o arquivo privado preparado para este painel.
              Confira a lista antes de confirmar. A importação é transacional.
            </p>
            <label>
              Arquivo JSON
              <input
                type="file"
                name="importFile"
                accept="application/json,.json"
                required
              />
            </label>
            <button className="button secondary section-gap" disabled={busy}>
              Confirmar importação
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
