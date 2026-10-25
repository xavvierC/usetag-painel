import type { Sale, Goal } from "./domain/finance";
// Fictional identities; amounts reproduce the approved visual reference only.
export const demoSales: Sale[] = [
  {
    id: "demo-1",
    clientId: "client-1",
    client: "Cliente Exemplo A",
    amountCents: 29900,
    soldOn: "2026-10-23",
    rateBps: 500,
    status: "approved",
    archived: false,
    version: 1,
    receivedCents: 0,
    items: [
      { model: "google", color: "blue", quantity: 15, isGift: false },
      { model: "google", color: "black", quantity: 15, isGift: false },
    ],
  },
  {
    id: "demo-2",
    clientId: "client-2",
    client: "Cliente Exemplo B",
    amountCents: 55380,
    soldOn: "2026-10-23",
    rateBps: 500,
    status: "approved",
    archived: false,
    version: 1,
    receivedCents: 0,
    items: [
      { model: "google", color: "blue", quantity: 25, isGift: false },
      { model: "google", color: "black", quantity: 25, isGift: false },
    ],
  },
];
export const demoGoal: Goal = {
  amountCents: 300000,
  startsOn: "2026-10-23",
  endsOn: "2026-10-28",
  name: "Rumo aos R$ 3 mil",
};
