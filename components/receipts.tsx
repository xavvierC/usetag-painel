"use client";
import { useEffect, useState } from "react";
import { Paperclip, ArrowUpRight } from "lucide-react";
export function Receipts({ saleId }: { saleId: string }) {
  const [files, setFiles] = useState<
    { id: string; name: string; url: string | null }[]
  >([]);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    const r = await fetch(
      "/api/receipts?saleId=" + encodeURIComponent(saleId),
      { cache: "no-store" },
    );
    const d = await r.json();
    if (!r.ok) throw Error(d.error);
    setFiles(d.receipts);
  }
  useEffect(() => {
    let active = true;
    fetch("/api/receipts?saleId=" + encodeURIComponent(saleId), {
      cache: "no-store",
    })
      .then(async (r) => {
        const d = await r.json();
        if (active) {
          if (r.ok) setFiles(d.receipts);
          else setFeedback(d.error);
        }
      })
      .catch(() => {
        if (active) setFeedback("Não foi possível carregar comprovantes.");
      });
    return () => {
      active = false;
    };
  }, [saleId]);
  return (
    <section className="receipt-section">
      <h3>
        <Paperclip size={15} />
        Comprovantes privados
      </h3>
      <p className="muted">
        PDF, JPEG, PNG ou WebP · até 10 MB. Anexar não confirma pagamento.
      </p>
      <label className="button secondary receipt-upload">
        {busy ? "Enviando…" : "Anexar comprovante"}
        <input
          className="sr-only"
          type="file"
          disabled={busy}
          accept="application/pdf,image/jpeg,image/png,image/webp"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            if (f.size > 10485760) {
              setFeedback("Envie até 10 MB.");
              return;
            }
            setBusy(true);
            try {
              const data = new FormData();
              data.set("saleId", saleId);
              data.set("file", f);
              const r = await fetch("/api/receipts", {
                method: "POST",
                body: data,
              });
              const d = await r.json();
              if (!r.ok) throw Error(d.error);
              await load();
              setFeedback("Comprovante anexado.");
            } catch (err) {
              setFeedback(
                err instanceof Error ? err.message : "Não foi possível anexar.",
              );
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      {files.map((f) => (
        <div className="receipt-file" key={f.id}>
          <span>{f.name}</span>
          {f.url ? (
            <a href={f.url} target="_blank" rel="noopener noreferrer">
              Abrir <ArrowUpRight size={14} />
            </a>
          ) : (
            <span>Link indisponível</span>
          )}
        </div>
      ))}
      {files.length > 0 && (
        <button
          type="button"
          className="text-button"
          onClick={() => load().catch((e) => setFeedback(e.message))}
        >
          Renovar links de acesso
        </button>
      )}
      {feedback && (
        <p role="status" className="notice">
          {feedback}
        </p>
      )}
    </section>
  );
}
