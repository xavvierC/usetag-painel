"use client";
import {
  ArrowDown,
  ArrowUpRight,
  ArchiveRestore,
  Archive,
  Pencil,
  ShoppingBag,
} from "lucide-react";
import {
  dateLabel,
  money,
  commission,
  statusLabels,
  type Sale,
} from "@/lib/domain/finance";
import { Empty } from "./ui";
export function SalesTable({
  sales,
  all = false,
  onEdit,
  onArchive,
}: {
  sales: Sale[];
  all?: boolean;
  onEdit?: (sale: Sale) => void;
  onArchive?: (sale: Sale) => void;
}) {
  if (!sales.length)
    return (
      <Empty
        title="Nenhuma venda neste período"
        detail="Ajuste os filtros ou registre uma venda para começar."
      />
    );
  return (
    <div
      className="table-scroll"
      tabIndex={0}
      aria-label="Tabela de vendas; role horizontalmente para ver todas as colunas"
    >
      <table>
        <thead>
          <tr>
            <th scope="col">Cliente</th>
            <th scope="col">Data</th>
            <th scope="col" className="numeric">
              Valor <ArrowDown size={12} />
            </th>
            <th scope="col" className="numeric">
              Comissão
            </th>
            <th scope="col">Situação</th>
            {all && <th scope="col">Ações</th>}
          </tr>
        </thead>
        <tbody>
          {sales.map((s) => (
            <tr key={s.id}>
              <td>
                <span className="client-cell">
                  <span className="client-avatar">
                    {s.client
                      .split(" ")
                      .slice(0, 2)
                      .map((p) => p[0])
                      .join("")}
                  </span>
                  <span>
                    <strong>{s.client}</strong>
                    <small>
                      {s.items.reduce((n, i) => n + i.quantity, 0)} placas
                      {s.archived ? " · Arquivada" : ""}
                    </small>
                  </span>
                </span>
              </td>
              <td className="muted">{dateLabel(s.soldOn)}</td>
              <td className="numeric">
                <strong>{money(s.amountCents)}</strong>
              </td>
              <td className="numeric commission-value">
                {money(
                  s.status === "approved"
                    ? commission(s.amountCents, s.rateBps)
                    : 0,
                )}
              </td>
              <td>
                <span className={"badge " + s.status}>
                  <i />
                  {statusLabels[s.status]}
                </span>
              </td>
              {all && (
                <td>
                  <div className="row-actions">
                    <button
                      className="icon-button"
                      aria-label={`Editar venda de ${s.client}`}
                      onClick={() => onEdit?.(s)}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`${s.archived ? "Restaurar" : "Arquivar"} venda de ${s.client}`}
                      onClick={() => onArchive?.(s)}
                    >
                      {s.archived ? (
                        <ArchiveRestore size={16} />
                      ) : (
                        <Archive size={16} />
                      )}
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
