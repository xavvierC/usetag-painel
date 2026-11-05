"use client";
import { useEffect, useRef, useState } from "react";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Gift,
  LockKeyhole,
  Ticket,
  UsersRound,
} from "lucide-react";
import { raffleCampaign, salePlateCount } from "@/lib/domain/raffle";
import { useStore } from "./store";
import { Empty } from "./ui";

type DrawResult = { name: string; count: number; drawnAt: string };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function Raffle() {
  const { sales, clients, live } = useStore();
  const [winner, setWinner] = useState<DrawResult | null>(null);
  const [busy, setBusy] = useState(true);
  const [animating, setAnimating] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [rollingName, setRollingName] = useState("");
  const [error, setError] = useState("");
  const drawCardRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!live) {
      setBusy(false);
      return;
    }
    let active = true;
    fetch("/api/raffle")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw Error(data.error);
        if (active) setWinner(data.result);
      })
      .catch(() => {
        if (active) setError("Atualize a página para consultar o sorteio.");
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [live]);

  useEffect(() => {
    if (!focusMode) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const frame = window.requestAnimationFrame(() => {
      const card = drawCardRef.current;
      if (!card) return;
      const cardTop = card.getBoundingClientRect().top;
      const fixedHeaderBottom = document.querySelector(".topbar")?.getBoundingClientRect().bottom ?? 0;
      const visibleHeight = Math.max(0, window.innerHeight - fixedHeaderBottom);
      const centerOffset = Math.max(0, (visibleHeight - card.offsetHeight) / 2);
      window.scrollTo({
        top: Math.max(0, window.scrollY + cardTop - fixedHeaderBottom - centerOffset),
        behavior: reducedMotion ? "auto" : "smooth",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusMode]);

  async function draw() {
    if (busy || winner || !live || !clients.length) return;
    if (!window.confirm("Confirmar o sorteio oficial entre todos os clientes cadastrados? O resultado ficará salvo e não poderá ser sorteado novamente.")) return;
    setBusy(true);
    setFocusMode(true);
    setError("");

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const steps = reducedMotion ? 1 : 26;
    setAnimating(true);
    for (let step = 0; step < steps; step += 1) {
      const client = clients[Math.floor(Math.random() * clients.length)];
      setRollingName(client.name);
      if (!reducedMotion) {
        const progress = (step + 1) / steps;
        await wait(58 + Math.round(progress ** 3 * 115));
      }
    }
    setAnimating(false);

    try {
      const response = await fetch("/api/raffle", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      setWinner(data.result);
      setRollingName(data.result.name);
    } catch (err) {
      setRollingName("");
      setError(err instanceof Error ? err.message : "Não foi possível sortear.");
    } finally {
      setBusy(false);
    }
  }

  const participants = clients.map((client) => ({ id: client.id, client: client.name }));
  const plates = sales.reduce(
    (total, sale) => total + salePlateCount(sale),
    0,
  );
  const displayedName = winner?.name ?? rollingName;

  return (
    <div className={`raffle-page ${focusMode ? "is-draw-focus" : ""}`}>
      <section className="surface raffle-hero">
        <div className="raffle-hero-copy">
          <span className="eyebrow">{raffleCampaign.label}</span>
          <h2>Seu ambiente de sorteio</h2>
          <p>
            Acompanhe quem comprou durante a campanha e mantenha as entradas
            confirmadas em um só lugar.
          </p>
          <div className="raffle-hero-meta">
            <span>
              <CalendarDays size={15} /> Inscrições até {raffleCampaign.endsOn}
            </span>
            <span>
              <Gift size={15} /> Sorteio em {raffleCampaign.drawOn}
            </span>
          </div>
        </div>
        <div
          className="raffle-prize"
          aria-label={`Prêmio: ${raffleCampaign.prize}`}
        >
          <Gift size={25} />
          <span>Prêmio</span>
          <strong>{raffleCampaign.prize}</strong>
          <small>{live ? "Campanha ativa" : "Dados de demonstração"}</small>
        </div>
      </section>

      <div className="raffle-metrics">
        <section className="surface raffle-metric">
          <UsersRound size={17} />
          <span>Participantes</span>
          <strong>{participants.length}</strong>
          <small>clientes cadastrados</small>
        </section>
        <section className="surface raffle-metric">
          <Ticket size={17} />
          <span>Entradas válidas</span>
          <strong>{participants.length}</strong>
          <small>uma entrada por cadastro</small>
        </section>
        <section className="surface raffle-metric">
          <Gift size={17} />
          <span>Placas na campanha</span>
          <strong>{plates}</strong>
          <small>unidades registradas</small>
        </section>
      </div>

      <div className="raffle-content">
        <section className="surface raffle-list">
          <div className="surface-title">
            <div>
              <h2>Participantes confirmados</h2>
              <p className="muted">
                Todos os clientes cadastrados, incluindo arquivados. Uma entrada por cadastro.
              </p>
            </div>
            <span className="raffle-count">{participants.length} entradas</span>
          </div>
          {participants.length === 0 ? (
            <Empty
              title="Nenhum participante confirmado"
              detail="As vendas incluídas na promoção aparecerão aqui após serem registradas."
            />
          ) : (
            <div className="raffle-entries">
              {participants.map((sale, index) => {
                const tracking = '';
                return (
                  <article className="raffle-entry" key={sale.id}>
                    <span className="raffle-entry-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="raffle-entry-main">
                      <strong>{sale.client}</strong>
                      <span>
                        <CheckCircle2 size={13} /> Cliente cadastrado
                      </span>
                    </div>
                    <div className="raffle-entry-meta">
                      <span>Vale de participação</span>
                      {tracking && <small>{tracking}</small>}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <aside className="surface raffle-draw-card" ref={drawCardRef}>
          <span className="raffle-draw-icon">
            <LockKeyhole size={19} />
          </span>
          <span className="eyebrow">SORTEIO</span>
          {focusMode && <span className="raffle-focus-prize"><Gift size={14} /><span>Prêmio</span><strong>{raffleCampaign.prize}</strong></span>}
          <h2>{winner ? "Resultado oficial" : focusMode ? animating ? "Sorteio em andamento" : "Apuração oficial" : "Pronto para a apuração"}</h2>
          <p>
            {winner
              ? `${winner.count} participantes · registrado em ${new Date(winner.drawnAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`
              : focusMode
                ? animating
                  ? `Apuração entre ${participants.length} participantes.`
                  : "Registrando o resultado oficial."
                : `O sorteio será liberado no dia ${raffleCampaign.drawOn}, depois da conferência final das entradas.`}
          </p>
          <div className={`raffle-winner ${animating ? "is-rolling" : ""} ${winner ? "is-official" : ""}`} aria-live={animating ? "off" : "polite"} aria-atomic="true" role="status">
            <span className="raffle-winner-mark" aria-hidden="true"><Ticket size={18} /></span>
            <small>{winner ? "GANHADOR OFICIAL" : animating ? "NOMES PASSANDO" : "RESULTADO OFICIAL"}</small>
            <strong key={displayedName}>{displayedName || (busy ? "Apurando…" : "Pronto para sortear")}</strong>
            {animating && <span className="raffle-roll-line" aria-hidden="true"><i /></span>}
          </div>
          {error && <p role="alert" className="error">{error}</p>}
          <button className="button primary full" type="button" disabled={!live || busy || !!winner || !participants.length} onClick={draw}>
            {winner ? "Sorteio realizado" : busy ? animating ? "Apurando nomes…" : "Carregando resultado…" : "Sortear oficialmente"}
          </button>
          <small className="raffle-draw-note">
            O resultado oficial é salvo e só pode ser realizado uma vez.
          </small>
          {focusMode && <button className="raffle-focus-back" type="button" disabled={busy} onClick={() => setFocusMode(false)}><ArrowLeft size={15} /> Voltar para participantes</button>}
        </aside>
      </div>
    </div>
  );
}
