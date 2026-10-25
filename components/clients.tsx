"use client";
import { useState } from "react";
import { Plus, Search, Pencil, Archive, ArchiveRestore } from "lucide-react";
import { blankClient, type Client } from "@/lib/domain/client";
import { money } from "@/lib/domain/finance";
import { formatCpf, formatPhone, formatCep } from "@/lib/domain/dispatch";
import { useStore } from "./store";
import { Modal, Empty } from "./ui";
export function Clients() {
  const { clients, sales, saveClient, live, busy } = useStore();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Client>();
  const [error, setError] = useState("");
  const [archived, setArchived] = useState(false);
  const visible = clients.filter(
    (c) =>
      c.archived === archived &&
      c.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <section className="surface">
      <div className="surface-title">
        <h2>
          Relacionamentos comerciais{" "}
          <span className="count">{visible.length}</span>
        </h2>
        <button
          className="button primary"
          onClick={() => {
            setError("");
            setEditing(blankClient());
          }}
        >
          <Plus size={16} />
          Novo cliente
        </button>
      </div>
      <div className="filters">
        <label className="search-field">
          <Search size={17} />
          <input
            aria-label="Buscar cliente"
            placeholder="Buscar cliente…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={archived}
            onChange={(e) => setArchived(e.target.checked)}
          />
          Arquivados
        </label>
      </div>
      <div className="client-grid">
        {visible.map((c) => (
          <article className="client-card" key={c.id}>
            <span className="client-avatar large">
              {c.name
                .split(" ")
                .slice(0, 2)
                .map((p) => p[0])
                .join("")}
            </span>
            <h3>{c.name}</h3>
            <p className="muted">
              {c.phone
                ? formatPhone(c.phone)
                : live
                  ? "Cadastro em andamento"
                  : "Cadastro de demonstração"}
            </p>
            <div>
              <span>Vendas aprovadas</span>
              <strong>
                {money(
                  sales
                    .filter(
                      (s) =>
                        s.clientId === c.id &&
                        s.status === "approved" &&
                        !s.archived,
                    )
                    .reduce((n, s) => n + s.amountCents, 0),
                )}
              </strong>
            </div>
            <div className="button-row">
              <button
                className="text-button"
                onClick={() => {
                  setError("");
                  setEditing(c);
                }}
              >
                <Pencil size={13} />
                Editar cliente
              </button>
              <button
                className="text-button"
                disabled={busy}
                onClick={() =>
                  saveClient({ ...c, archived: !c.archived }).catch((e) =>
                    setError(e.message),
                  )
                }
              >
                {c.archived ? (
                  <ArchiveRestore size={13} />
                ) : (
                  <Archive size={13} />
                )}{" "}
                {c.archived ? "Restaurar" : "Arquivar"}
              </button>
            </div>
          </article>
        ))}
      </div>
      {!visible.length && (
        <Empty
          title="Nenhum cliente encontrado"
          detail="Ajuste a busca ou cadastre um novo cliente."
        />
      )}
      {error && !editing && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {editing && (
        <Modal
          title={
            clients.some((c) => c.id === editing.id)
              ? "Editar cliente"
              : "Novo cliente"
          }
          onClose={() => setEditing(undefined)}
        >
          <p className="notice">
            Somente o nome é obrigatório. Complete os demais dados quando o
            cliente informar.
            {!live ? " Alterações somente nesta demonstração." : ""}
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await saveClient({
                  ...editing,
                  cpf: formatCpf(editing.cpf),
                  phone: formatPhone(editing.phone),
                  cep: formatCep(editing.cep),
                });
                setEditing(undefined);
              } catch (err) {
                setError(
                  err instanceof Error
                    ? err.message
                    : "Não foi possível salvar.",
                );
              }
            }}
          >
            <div className="form-grid">
              {(
                [
                  ["name", "Nome completo"],
                  ["cpf", "CPF"],
                  ["phone", "Telefone"],
                  ["email", "E-mail"],
                  ["street", "Rua / avenida"],
                  ["number", "Número"],
                  ["complement", "Complemento"],
                  ["district", "Bairro"],
                  ["city", "Cidade"],
                  ["uf", "UF"],
                  ["cep", "CEP"],
                ] as const
              ).map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    type={key === "email" ? "email" : "text"}
                    required={key === "name"}
                    maxLength={key === "uf" ? 2 : key === "name" ? 160 : 200}
                    value={editing[key]}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        [key]:
                          key === "uf"
                            ? e.target.value.toUpperCase()
                            : e.target.value,
                      })
                    }
                  />
                </label>
              ))}
            </div>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setEditing(undefined)}
              >
                Cancelar
              </button>
              <button className="button primary" disabled={busy}>
                {live ? "Salvar cliente" : "Salvar na demonstração"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
