"use client";

import {
  CalendarDays,
  CheckCircle2,
  Gift,
  LockKeyhole,
  Ticket,
  UsersRound,
} from "lucide-react";
import {
  raffleCampaign,
  raffleParticipants,
  raffleTrackingCode,
  salePlateCount,
} from "@/lib/domain/raffle";
import { dateLabel } from "@/lib/domain/finance";
import { useStore } from "./store";
import { Empty } from "./ui";

export function Raffle() {
  const { sales, live } = useStore();
  const participants = raffleParticipants(sales);
  const plates = participants.reduce(
    (total, sale) => total + salePlateCount(sale),
    0,
  );

  return (
    <div className="raffle-page">
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
          <small>compras confirmadas</small>
        </section>
        <section className="surface raffle-metric">
          <Ticket size={17} />
          <span>Entradas válidas</span>
          <strong>{participants.length}</strong>
          <small>um vale por compra</small>
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
                Somente vendas aprovadas e marcadas na promoção.
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
                const tracking = raffleTrackingCode(sale);
                return (
                  <article className="raffle-entry" key={sale.id}>
                    <span className="raffle-entry-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="raffle-entry-main">
                      <strong>{sale.client}</strong>
                      <span>
                        <CheckCircle2 size={13} /> Compra confirmada · {dateLabel(sale.soldOn)}
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

        <aside className="surface raffle-draw-card">
          <span className="raffle-draw-icon">
            <LockKeyhole size={19} />
          </span>
          <span className="eyebrow">SORTEIO</span>
          <h2>Pronto para a apuração</h2>
          <p>
            O sorteio será liberado no dia {raffleCampaign.drawOn}, depois da
            conferência final das entradas.
          </p>
          <button className="button secondary full" type="button" disabled>
            Sortear ganhador
          </button>
          <small className="raffle-draw-note">
            Ação bloqueada até a data da campanha.
          </small>
        </aside>
      </div>
    </div>
  );
}
