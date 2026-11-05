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
  const [previewWinner, setPreviewWinner] = useState<string | null>(null);
  const [rollingName, setRollingName] = useState("");
  const [loading, setLoading] = useState(true);
  const [animating, setAnimating] = useState(false);
  const [drawingOfficial, setDrawingOfficial] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [error, setError] = useState("");
  const drawCardRef = useRef<HTMLElement>(null);
  const participants = [...clients].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR"),
  );
  const plates = sales.reduce((total, sale) => total + salePlateCount(sale), 0);

  useEffect(() => {
    if (!live) {
      setLoading(false);
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
        if (active) setError("Não foi possível consultar o resultado. Atualize a página.");
      })
      .finally(() => {
        if (active) setLoading(false);
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

  async function rollNames() {
    setAnimating(true);
    setPreviewWinner(null);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const steps = reducedMotion ? 1 : 26;
    for (let step = 0; step < steps; step += 1) {
      const person = participants[Math.floor(Math.random() * participants.length)];
      setRollingName(person.name);
      if (!reducedMotion) {
        const progress = (step + 1) / steps;
        await wait(58 + Math.round(progress ** 3 * 115));
      }
    }
    setAnimating(false);
  }

  async function previewDraw() {
    if (animating || drawingOfficial || !participants.length) return;
    const selected = participants[Math.floor(Math.random() * participants.length)];
    setFocusMode(true);
    await rollNames();
    setRollingName(selected.name);
    setPreviewWinner(selected.name);
  }

  async function drawOfficially() {
    if (
      animating ||
      loading ||
      winner ||
      !participants.length ||
      !window.confirm(
        "Confirmar o sorteio oficial entre todos os clientes cadastrados? O resultado ficará salvo e não poderá ser sorteado novamente.",
      )
    )
      return;
    setDrawingOfficial(true);
    setFocusMode(true);
    setError("");
    await rollNames();
    try {
      const response = await fetch("/api/raffle", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      setWinner(data.result);
      setRollingName(data.result.name);
      setPreviewWinner(null);
    } catch (err) {
      setRollingName("");
      setError(err instanceof Error ? err.message : "Não foi possível concluir o sorteio.");
    } finally {
      setDrawingOfficial(false);
    }
  }

  function clearPreview() {
    setPreviewWinner(null);
    setRollingName("");
  }

  const displayedName =
    winner?.name ??
    (animating ? rollingName : previewWinner ?? rollingName) ??
    "";

  return (
    <div className={`raffle-page ${focusMode ? "is-draw-focus" : ""}`}>
      <section className="surface raffle-hero">
        <div className="raffle-hero-copy">
          <span className="eyebrow">{raffleCampaign.label}</span>
          <h2>Seu ambiente de sorteio</h2>
          <p>Todos os clientes cadastrados participam, incluindo os arquivados. Uma entrada por cadastro.</p>
          <div className="raffle-hero-meta">
            <span><CalendarDays size={15} /> Inscrições até {raffleCampaign.endsOn}</span>
            <span><Gift size={15} /> Sorteio em {raffleCampaign.drawOn}</span>
          </div>
        </div>
        <div className="raffle-prize" aria-label={`Prêmio: ${raffleCampaign.prize}`}>
          <Gift size={25} />
          <span>Prêmio</span>
          <strong>{raffleCampaign.prize}</strong>
          <small>{live ? "Campanha ativa" : "Dados de demonstração"}</small>
        </div>
      </section>

      <div className="raffle-metrics">
        <section className="surface raffle-metric"><UsersRound size={17} /><span>Participantes</span><strong>{participants.length}</strong><small>clientes cadastrados</small></section>
        <section className="surface raffle-metric"><Ticket size={17} /><span>Entradas válidas</span><strong>{participants.length}</strong><small>uma entrada por cadastro</small></section>
        <section className="surface raffle-metric"><Gift size={17} /><span>Placas na campanha</span><strong>{plates}</strong><small>unidades registradas</small></section>
      </div>

      <div className="raffle-content">
        <section className="surface raffle-list">
          <div className="surface-title">
            <div><h2>Participantes</h2><p className="muted">Cada cadastro aparece uma vez, inclusive os arquivados.</p></div>
            <span className="raffle-count">{participants.length} entradas</span>
          </div>
          {participants.length === 0 ? <Empty title="Nenhum participante cadastrado" detail="Cadastre clientes para incluí-los na lista do sorteio." /> : (
            <div className="raffle-entries">
              {participants.map((person, index) => (
                <article className="raffle-entry" key={person.id}>
                  <span className="raffle-entry-number">{String(index + 1).padStart(2, "0")}</span>
                  <div className="raffle-entry-main"><strong>{person.name}</strong><span><CheckCircle2 size={13} />{person.archived ? "Cadastro arquivado" : "Cliente cadastrado"}</span></div>
                  <div className="raffle-entry-meta"><span>Vale de participação</span></div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="surface raffle-draw-card" ref={drawCardRef}>
          <span className="raffle-draw-icon"><LockKeyhole size={19} /></span>
          <span className="eyebrow">SORTEIO</span>
          {focusMode && <span className="raffle-focus-prize"><Gift size={14} /><span>Prêmio</span><strong>{raffleCampaign.prize}</strong></span>}
          <h2>{winner ? "Resultado oficial" : "Apuração do sorteio"}</h2>
          <p>{winner ? `${winner.count} participantes · registrado em ${new Date(winner.drawnAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}` : focusMode ? drawingOfficial ? "Apuração oficial em andamento." : "Prévia de teste · não altera o sorteio oficial." : "Teste a animação e o palco centralizado sem salvar. O sorteio oficial registra o resultado uma única vez."}</p>
          <div className={`raffle-winner ${animating ? "is-rolling" : ""} ${winner ? "is-official" : previewWinner ? "is-preview" : ""}`} aria-live={animating ? "off" : "polite"} aria-atomic="true">
            <span className="raffle-winner-mark" aria-hidden="true"><Ticket size={18} /></span>
            <small>{winner ? "GANHADOR OFICIAL" : previewWinner ? "TESTE · NÃO REGISTRADO" : animating ? "NOMES PASSANDO" : "GANHADOR"}</small>
            <strong key={displayedName}>{displayedName || (loading ? "Carregando…" : "Pronto para sortear")}</strong>
            {animating && <span className="raffle-roll-line" aria-hidden="true"><i /></span>}
            {previewWinner && !winner && <span className="raffle-preview-caption">Prévia local · nenhum resultado foi salvo</span>}
          </div>
          {error && <p role="alert" className="error">{error}</p>}
          {!focusMode && <button className="button secondary full" type="button" disabled={!live || loading || animating || drawingOfficial || !!winner || !participants.length} onClick={previewDraw}>
            {animating && !drawingOfficial ? "Testando…" : "Testar animação"}
          </button>}
          {!focusMode && previewWinner && !winner && <button className="raffle-clear-test" type="button" onClick={clearPreview}>Limpar teste</button>}
          {(!focusMode || drawingOfficial || !!winner) && <button className="button primary full" type="button" disabled={!live || loading || animating || drawingOfficial || !!winner || !participants.length} onClick={drawOfficially}>
            {drawingOfficial ? "Sorteando oficialmente…" : winner ? "Sorteio realizado" : "Sortear oficialmente"}
          </button>}
          <small className="raffle-draw-note">O teste não altera os dados. O sorteio oficial fica salvo e só pode ser realizado uma vez.</small>
          {focusMode && <button className="raffle-focus-back" type="button" disabled={animating || drawingOfficial} onClick={() => setFocusMode(false)}><ArrowLeft size={15} /> Voltar para participantes</button>}
        </aside>
      </div>
    </div>
  );
}
