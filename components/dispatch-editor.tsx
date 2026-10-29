"use client";
import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  CheckCheck,
  Copy,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  CircleHelp,
} from "lucide-react";
import { useStore } from "@/components/store";
import { today } from "@/lib/domain/finance";
import {
  blankDispatch,
  dispatchIssues,
  formatDispatch,
  parseDispatch,
  type Dispatch,
} from "@/lib/domain/dispatch";
export function DispatchEditor({ compact = false }: { compact?: boolean }) {
  const { live } = useStore();
  const [source, setSource] = useState("");
  const [data, setData] = useState<Dispatch>(blankDispatch);
  const [parsed, setParsed] = useState(false);
  const [preview, setPreview] = useState("");
  const [message, setMessage] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiConsent, setAiConsent] = useState(false);
  const [proof, setProof] = useState<File | null>(null);
  const [registering, setRegistering] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [registrationId] = useState(() => crypto.randomUUID());
  async function extractWithAI() {
    if (!aiConsent) {
      setMessage("Autorize o envio do material para a IA antes de continuar.");
      return;
    }
    if (proof) {
      setMessage(
        "A leitura automática do comprovante ainda está bloqueada por privacidade. Preencha valor, data e status manualmente.",
      );
      return;
    }
    setAiBusy(true);
    setMessage("Estruturando com IA…");
    try {
      const response = await fetch("/api/expedicao", {
        method: "POST",
        headers: { "X-AI-Consent": "true" },
        body: JSON.stringify({ source }),
        signal: AbortSignal.timeout(25000),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      update(result.data);
      setParsed(true);
      setMessage(
        "Sugestão da IA extraída. Revise todos os campos antes de copiar.",
      );
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "IA indisponível. Use a estruturação local.",
      );
    } finally {
      setAiBusy(false);
    }
  }
  const issues = dispatchIssues(data);
  function update(next: Dispatch) {
    setData(next);
    setPreview(formatDispatch(next));
    setRegistered(false);
    setMessage("");
  }
  function extract() {
    try {
      const next = parseDispatch(source);
      update(next);
      setParsed(true);
      setMessage("Campos extraídos. Revise antes de copiar.");
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Não foi possível estruturar.",
      );
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(preview);
      setMessage("Mensagem copiada.");
    } catch {
      setMessage("Selecione a prévia e copie manualmente.");
    }
  }
  async function registerSale() {
    if (!live) {
      setMessage("Entre no ambiente conectado para registrar a venda.");
      return;
    }
    const registrationIssues = [
      ...issues,
      ...(data.amountCents === null ? ["Informar o valor pago."] : []),
      ...(!data.soldOn ? ["Informar a data do pagamento."] : []),
      ...(!data.paymentStatus ? ["Informar o status do pagamento."] : []),
    ];
    if (registrationIssues.length) {
      setMessage("Revise as pendências antes de registrar no painel.");
      return;
    }
    setRegistering(true);
    setMessage("Registrando cliente, venda e comissão…");
    try {
      const response = await fetch("/api/dispatch/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saleId: registrationId, data }),
        signal: AbortSignal.timeout(25000),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error ?? "Não foi possível registrar.");
      let receiptNote = "";
      if (proof) {
        const form = new FormData();
        form.set("saleId", registrationId);
        form.set("file", proof);
        const upload = await fetch("/api/receipts", {
          method: "POST",
          body: form,
          signal: AbortSignal.timeout(25000),
        });
        if (upload.ok) receiptNote = " Comprovante anexado.";
        else receiptNote = " Venda registrada, mas o comprovante não foi anexado.";
      }
      setRegistered(true);
      setMessage(
        `${result.alreadyRegistered ? "Venda já registrada." : "Venda registrada."}${receiptNote}`,
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Não foi possível registrar.");
    } finally {
      setRegistering(false);
    }
  }
  return (
    <section
      className={"surface assistant " + (!compact ? "assistant-full" : "")}
      aria-labelledby="assistant-title"
    >
      <div className="surface-title">
        <div>
          <span className="eyebrow">DO ATENDIMENTO À EXPEDIÇÃO</span>
          <h2 id="assistant-title">Assistente de pedidos</h2>
        </div>
        <CircleHelp
          size={17}
          aria-label="Estruturação local com revisão manual"
        />
      </div>
      <p className="muted assistant-intro">
        Uma mensagem organizada.
        <br />
        Um pedido pronto para revisar.
      </p>
      <label className="sr-only" htmlFor="order-source">
        Dados recebidos do cliente
      </label>
      <textarea
        id="order-source"
        className="source-input"
        value={source}
        onChange={(e) => setSource(e.target.value)}
        maxLength={12000}
        placeholder={
          "Cole aqui a mensagem do cliente…\n\nNome completo:\nCPF:\nEndereço:\nPlacas:"
        }
      />
      <button type="button" className="button primary full" onClick={extract}>
        <Sparkles size={16} /> Estruturar venda <ArrowUpRight size={16} />
      </button>
      <div className="assistant-mode">
        <span className="dot" /> Extração local disponível sem IA
      </div>
      <label className="proof-upload">
        <span>Comprovante de pagamento (opcional)</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={(e) => setProof(e.target.files?.[0] ?? null)}
        />
        <small>{proof ? proof.name : "JPG, PNG, WebP ou PDF até 10 MB"}</small>
      </label>
      <label className="check-label ai-consent">
        <input
          type="checkbox"
          checked={aiConsent}
          onChange={(e) => setAiConsent(e.target.checked)}
        />
        Autorizo enviar este material para a IA externa para extração.
      </label>
      <button
        className="text-button full"
        disabled={aiBusy || !aiConsent}
        onClick={extractWithAI}
      >
        {aiBusy ? "Estruturando com IA…" : "Usar assistência de IA"}{" "}
        <Sparkles size={13} />
      </button>
      <div className="divider">
        <span>REVISE O PEDIDO</span>
      </div>
      {!parsed ? (
        <>
          <div className="dispatch-skeleton">
            <div className="dispatch-skeleton-head">
              <strong>VENDA GERADA</strong>
              <span>USE TAG</span>
            </div>
            {["Cliente", "CPF", "Telefone", "E-mail", "Endereço", "Placas"].map(
              (label) => (
                <div key={label}>
                  <span>{label}</span>
                  <i />
                </div>
              ),
            )}
            <div>
              <span>Pendências</span>
              <span className="badge pending">Aguardando dados</span>
            </div>
          </div>
          <button
            className="text-button full"
            onClick={() => {
              update(blankDispatch());
              setParsed(true);
            }}
          >
            Preencher manualmente <ArrowUpRight size={14} />
          </button>
        </>
      ) : (
        <>
          <details className="review-fields" open={!compact}>
            <summary>
              Revisar campos <span>{issues.length} pendência(s)</span>
            </summary>
            <div className="form-grid">
              {(
                [
                  ["name", "Nome completo"],
                  ["cpf", "CPF"],
                  ["phone", "Telefone"],
                  ["email", "E-mail"],
                  ["address", "Endereço completo"],
                  ["cep", "CEP"],
                  ["shipping", "Envio"],
                  ["note", "Observação"],
                ] as const
              ).map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    value={data[key]}
                    onChange={(e) => update({ ...data, [key]: e.target.value })}
                  />
                </label>
              ))}
              <label>
                Total declarado
                <input
                  type="number"
                  min="0"
                  value={data.declaredTotal ?? ""}
                  onChange={(e) =>
                    update({
                      ...data,
                      declaredTotal:
                        e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </label>
              <div className="metadata-grid">
                <label>
                  Valor pago (R$)
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={data.amountCents === null ? "" : data.amountCents / 100}
                    onChange={(e) =>
                      update({
                        ...data,
                        amountCents:
                          e.target.value === ""
                            ? null
                            : Math.round(Number(e.target.value) * 100),
                      })
                    }
                  />
                </label>
                <label>
                  Data do pagamento
                  <input
                    type="date"
                    value={data.soldOn ?? ""}
                    max={today()}
                    onChange={(e) => update({ ...data, soldOn: e.target.value || null })}
                  />
                </label>
                <label>
                  Status do pagamento
                  <select
                    value={data.paymentStatus ?? ""}
                    onChange={(e) =>
                      update({
                        ...data,
                        paymentStatus: e.target.value
                          ? (e.target.value as Dispatch["paymentStatus"])
                          : null,
                      })
                    }
                  >
                    <option value="">Selecione</option>
                    <option value="approved">Aprovado</option>
                    <option value="pending">Pendente</option>
                    <option value="analysis">Em análise</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </label>
              </div>
            </div>
            {data.items.map((item, i) => (
              <div className="item-editor" key={i}>
                <label>
                  Modelo
                  <select
                    value={item.model}
                    onChange={(e) =>
                      update({
                        ...data,
                        items: data.items.map((x, j) =>
                          j === i
                            ? {
                                ...x,
                                model: e.target.value,
                                color:
                                  e.target.value === "Google" ? x.color : "",
                              }
                            : x,
                        ),
                      })
                    }
                  >
                    <option>Google</option>
                    <option>Instagram</option>
                    <option>Uber</option>
                  </select>
                </label>
                <label>
                  Cor
                  <select
                    value={item.color}
                    onChange={(e) =>
                      update({
                        ...data,
                        items: data.items.map((x, j) =>
                          j === i ? { ...x, color: e.target.value } : x,
                        ),
                      })
                    }
                  >
                    <option value="">A confirmar / não informada</option>
                    <option>Azul</option>
                    <option>Preto</option>
                  </select>
                </label>
                <label>
                  Qtd.
                  <input
                    type="number"
                    min="1"
                    value={item.quantity ?? ""}
                    onChange={(e) =>
                      update({
                        ...data,
                        items: data.items.map((x, j) =>
                          j === i
                            ? {
                                ...x,
                                quantity:
                                  e.target.value === ""
                                    ? null
                                    : Number(e.target.value),
                              }
                            : x,
                        ),
                      })
                    }
                  />
                </label>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={item.gift}
                    onChange={(e) =>
                      update({
                        ...data,
                        items: data.items.map((x, j) =>
                          j === i ? { ...x, gift: e.target.checked } : x,
                        ),
                      })
                    }
                  />
                  Brinde
                </label>
                <button
                  className="icon-button"
                  aria-label={`Remover item ${i + 1}`}
                  onClick={() =>
                    update({
                      ...data,
                      items: data.items.filter((_, j) => i !== j),
                    })
                  }
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button
              className="text-button"
              onClick={() =>
                update({
                  ...data,
                  items: [
                    ...data.items,
                    { model: "Google", color: "", quantity: null, gift: false },
                  ],
                })
              }
            >
              <Plus size={15} /> Adicionar placas
            </button>
          </details>
          <label className="preview-label" htmlFor="dispatch-preview">
            <span>Mensagem para expedição</span>
            {issues.length ? (
              <span className="badge pending">Revisão necessária</span>
            ) : (
              <span className="badge approved">
                <Check size={12} /> Campos completos
              </span>
            )}
          </label>
          <textarea
            id="dispatch-preview"
            className="dispatch-preview"
            value={preview}
            onChange={(e) => setPreview(e.target.value)}
          />
          <div className="button-row">
            <button className="button primary" onClick={copy}>
              <Copy size={15} /> Copiar
            </button>
            <button
              className="button secondary assistant-register"
              onClick={registerSale}
              disabled={registering || registered || !live}
              title={!live ? "Disponível no ambiente conectado" : undefined}
            >
              <Check size={15} /> {registered ? "Registrada" : registering ? "Registrando…" : "Registrar no painel"}
            </button>
            <button
              className="button secondary"
              onClick={() => setPreview(formatDispatch(data))}
              aria-label="Restaurar mensagem gerada"
            >
              <RotateCcw size={15} /> Restaurar
            </button>
          </div>
        </>
      )}
      {message && (
        <p role="status" className="inline-feedback">
          <CheckCheck size={15} />
          {message}
        </p>
      )}
      <p className="assistant-foot">
        Revise os dados antes de compartilhar.
        <br />
        Nenhuma mensagem é enviada automaticamente.
      </p>
    </section>
  );
}
