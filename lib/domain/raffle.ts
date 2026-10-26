import type { Sale } from "./finance";

export const raffleCampaign = {
  label: "Promoção USETAG",
  endsOn: "03/11/2026",
  drawOn: "05/11/2026",
  prize: "10 plaquinhas Google",
} as const;

const participantMarker = "Participante do sorteio";

export function raffleParticipants(sales: Sale[]) {
  return sales
    .filter(
      (sale) =>
        !sale.archived &&
        sale.status === "approved" &&
        sale.note?.includes(participantMarker),
    )
    .sort(
      (a, b) => b.soldOn.localeCompare(a.soldOn) || b.id.localeCompare(a.id),
    );
}

export function raffleTrackingCode(sale: Sale) {
  return sale.note?.match(/Código de rastreio:\s*([A-Z0-9]+)/i)?.[1] ?? "";
}

export function salePlateCount(sale: Sale) {
  return sale.items.reduce((total, item) => total + item.quantity, 0);
}
