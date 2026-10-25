"use client";
import { useEffect, useRef } from "react";
import { X, Radio } from "lucide-react";
export function Brand() {
  return (
    <span className="brand">
      <Radio size={26} strokeWidth={1.5} />
      <strong>
        USE<span>TAG</span>
      </strong>
    </span>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby="dialog-heading"
    >
      <div className="modal-head">
        <div>
          <span className="eyebrow">USETAG / VENDAS</span>
          <h2 id="dialog-heading">{title}</h2>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="Fechar"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Empty({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="empty">
      <span className="empty-symbol">—</span>
      <h3>{title}</h3>
      <p>{detail}</p>
    </div>
  );
}
export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="notice" role="status">
      {children}
    </p>
  );
}
