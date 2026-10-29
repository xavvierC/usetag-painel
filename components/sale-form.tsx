"use client";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  cents,
  isDate,
  type Sale,
  type SaleItem,
  type SaleStatus,
  today,
} from "@/lib/domain/finance";
import { Modal } from "./ui";
import { useStore } from "./store";
import { Receipts } from "./receipts";
export function SaleForm({
  sale,
  onSave,
  onClose,
}: {
  sale?: Sale;
  onSave: (sale: Sale) => Promise<void>;
  onClose: () => void;
}) {
  const { live, busy, profile, clients } = useStore();
  const [draftId] = useState(() => sale?.id ?? crypto.randomUUID());
  const [draftClientId] = useState(() => sale?.clientId ?? crypto.randomUUID());
  const [selectedClient, setSelectedClient] = useState(sale?.clientId ?? "");
  const [clientName, setClientName] = useState(sale?.client ?? "");
  const [items, setItems] = useState<SaleItem[]>(
    sale?.items ?? [
      { model: "google", color: "blue", quantity: 1, isGift: false },
    ],
  );
  const [error, setError] = useState("");
  return (
    <Modal title={sale ? "Editar venda" : "Nova venda"} onClose={onClose}>
      {!live && (
        <p className="notice">
          Demonstração: as alterações ficam somente nesta sessão e são
          descartadas ao recarregar.
        </p>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          try {
            const soldOn = String(f.get("date"));
            if (!isDate(soldOn)) throw Error("Informe uma data válida.");
            if (
              items.some(
                (i) =>
                  !Number.isInteger(i.quantity) ||
                  i.quantity < 1 ||
                  (i.model === "google" && !i.color),
              )
            )
              throw Error("Confira modelo, cor e quantidade das placas.");
            await onSave({
              id: draftId,
              clientId: selectedClient || draftClientId,
              client: String(f.get("client")).trim(),
              amountCents: cents(String(f.get("amount"))),
              soldOn,
              status: String(f.get("status")) as SaleStatus,
              rateBps: sale?.rateBps ?? profile.rateBps,
              version: (sale?.version ?? 0) + 1,
              receivedCents: sale?.receivedCents ?? 0,
              archived: sale?.archived ?? false,
              items,
            });
            onClose();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Confira os campos.");
          }
        }}
      >
        <div className="form-grid">
          {!sale && (
            <label className="span-2">
              Cliente cadastrado
              <select
                value={selectedClient}
                onChange={(e) => {
                  setSelectedClient(e.target.value);
                  setClientName(
                    clients.find((c) => c.id === e.target.value)?.name ?? "",
                  );
                }}
              >
                <option value="">Cadastrar cliente com esta venda</option>
                {clients
                  .filter((c) => !c.archived)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </label>
          )}
          <label className="span-2">
            Nome do cliente
            <input
              name="client"
              required
              maxLength={160}
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              readOnly={!!selectedClient && !sale}
              autoComplete="off"
            />
          </label>
          <label>
            Valor da venda (R$)
            <input
              name="amount"
              inputMode="decimal"
              required
              placeholder="299,00"
              defaultValue={
                sale
                  ? (sale.amountCents / 100).toFixed(2).replace(".", ",")
                  : ""
              }
            />
          </label>
          <label>
            Data da venda
            <input
              name="date"
              type="date"
              required
              defaultValue={sale?.soldOn ?? today()}
            />
          </label>
          <label>
            Situação
            <select name="status" defaultValue={sale?.status ?? "approved"}>
              <option value="approved">Aprovada</option>
              <option value="pending">Pendente</option>
              <option value="analysis">Em análise</option>
              <option value="cancelled">Cancelada</option>
            </select>
          </label>
          <label>
            Taxa da comissão
            <input
              readOnly
              value={`${(sale?.rateBps ?? profile.rateBps) / 100}%`}
            />
          </label>
        </div>
        <h3 className="form-subheading">Placas do pedido</h3>
        {items.map((item, i) => (
          <div className="item-editor" key={i}>
            <label>
              Modelo
              <select
                value={item.model}
                onChange={(e) =>
                  setItems(
                    items.map((x, j) =>
                      i === j
                        ? {
                            ...x,
                            model: e.target.value as SaleItem["model"],
                            color:
                              e.target.value === "google" ? "blue" : null,
                          }
                        : x,
                    ),
                  )
                }
              >
                <option value="google">Google</option>
                <option value="instagram">Instagram</option>
                <option value="uber">Uber</option>
              </select>
            </label>
            <label>
              Cor
              <select
                value={item.color ?? ""}
                onChange={(e) =>
                  setItems(
                    items.map((x, j) =>
                      i === j
                        ? {
                            ...x,
                            color: e.target.value
                              ? (e.target.value as SaleItem["color"])
                              : null,
                          }
                        : x,
                    ),
                  )
                }
              >
                <option value="">Não informada</option>
                <option value="blue">Azul</option>
                <option value="black">Preto</option>
              </select>
            </label>
            <label>
              Quantidade
              <input
                type="number"
                min="1"
                max="100000"
                required
                value={item.quantity}
                onChange={(e) =>
                  setItems(
                    items.map((x, j) =>
                      i === j ? { ...x, quantity: Number(e.target.value) } : x,
                    ),
                  )
                }
              />
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={item.isGift}
                onChange={(e) =>
                  setItems(
                    items.map((x, j) =>
                      i === j ? { ...x, isGift: e.target.checked } : x,
                    ),
                  )
                }
              />
              Brinde
            </label>
            <button
              type="button"
              className="icon-button"
              disabled={items.length === 1}
              aria-label={`Remover item ${i + 1}`}
              onClick={() => setItems(items.filter((_, j) => i !== j))}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <button
          type="button"
          className="text-button"
          onClick={() =>
            setItems([
              ...items,
              { model: "google", color: "blue", quantity: 1, isGift: false },
            ])
          }
        >
          <Plus size={16} />
          Adicionar variação
        </button>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="button primary" type="submit" disabled={busy}>
            {sale ? "Aplicar alterações" : "Registrar venda"}
          </button>
        </div>
      </form>
      {live && sale && <Receipts saleId={sale.id} />}
    </Modal>
  );
}
