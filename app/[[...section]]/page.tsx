import { notFound } from "next/navigation";
import { Panel } from "@/components/panel";
export const dynamic = "force-dynamic";
const sections = [
  "dashboard",
  "vendas",
  "clientes",
  "comissoes",
  "financeiro",
  "metas",
  "expedicao",
  "sorteio",
  "assistente",
  "configuracoes",
];
export default async function Page({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  const { section } = await params;
  const current = section?.[0] ?? "dashboard";
  if ((section?.length ?? 0) > 1 || !sections.includes(current)) notFound();
  return <Panel section={current} />;
}
