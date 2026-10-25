export type DispatchItem = {
  model: string;
  color: string;
  quantity: number | null;
  gift: boolean;
};
export type Dispatch = {
  name: string;
  cpf: string;
  phone: string;
  email: string;
  address: string;
  cep: string;
  shipping: string;
  note: string;
  declaredTotal: number | null;
  amountCents: number | null;
  soldOn: string | null;
  paymentStatus: "approved" | "pending" | "analysis" | "cancelled" | null;
  items: DispatchItem[];
  warnings: string[];
};
export const blankDispatch = (): Dispatch => ({
  name: "",
  cpf: "",
  phone: "",
  email: "",
  address: "",
  cep: "",
  shipping: "",
  note: "",
  declaredTotal: null,
  amountCents: null,
  soldOn: null,
  paymentStatus: null,
  items: [],
  warnings: [],
});
const digits = (text: string) => text.replace(/\D/g, "");
export function formatCpf(text: string) {
  const d = digits(text);
  return d.length === 11
    ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
    : text;
}
export function formatCep(text: string) {
  const d = digits(text);
  return d.length === 8 ? d.replace(/(\d{5})(\d{3})/, "$1-$2") : text;
}
export function formatPhone(text: string) {
  const d = digits(text);
  const n = d.startsWith("55") && d.length > 11 ? d.slice(2) : d;
  return n.length === 11
    ? n.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
    : n.length === 10
      ? n.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3")
      : text;
}
export function validCpf(text: string) {
  const d = digits(text);
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  for (let size = 9; size <= 10; size++) {
    const sum = [...d.slice(0, size)].reduce(
      (n, c, i) => n + Number(c) * (size + 1 - i),
      0,
    );
    if (Number(d[size]) !== ((sum * 10) % 11) % 10) return false;
  }
  return true;
}
export function parseDispatch(text: string): Dispatch {
  if (text.length > 12000)
    throw new Error("Cole até 12.000 caracteres por pedido.");
  const result = blankDispatch();
  const fields: Record<string, keyof Dispatch> = {
    "nome completo": "name",
    nome: "name",
    cliente: "name",
    cpf: "cpf",
    telefone: "phone",
    "e-mail": "email",
    email: "email",
    "endereço completo": "address",
    endereço: "address",
    cep: "cep",
    envio: "shipping",
    observação: "note",
  };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim().replace(/^[-•]\s*/, "");
    if (!line) continue;
    const pair = line.match(/^([^:]+):\s*(.*)$/);
    const key = pair?.[1].trim().toLowerCase();
    const field = key ? fields[key] : undefined;
    if (field && pair) {
      const previous = result[field];
      if (previous && previous !== pair[2])
        result.warnings.push(
          `Valores conflitantes em ${pair[1]}; revise o campo.`,
        );
      Object.assign(result, { [field]: pair[2] });
      continue;
    }
    if (
      pair &&
      /^(complemento|bairro|cidade|uf|rua|número|numero)$/i.test(pair[1])
    ) {
      result.address += [result.address ? ", " : "", pair[2]].join("");
      continue;
    }
    if (/^(placas|total)\s*:/i.test(line)) {
      const n = line.match(/:\s*(\d+)/);
      if (n) result.declaredTotal = Number(n[1]);
      continue;
    }
    if (/google|instagram/i.test(line)) {
      const quantityMatch =
        line.match(/:\s*[_\s]*(\d+)/) ||
        line.match(/^(\d+)\s*(?:unidades\s*\|\s*)?(?:google|instagram)/i) ||
        line.match(/\b(\d+)\s*unidades/i);
      const quantity = quantityMatch ? Number(quantityMatch[1]) : null;
      if (quantity === 0) continue;
      const model = /instagram/i.test(line) ? "Instagram" : "Google";
      const color = /azul|azuis/i.test(line)
        ? "Azul"
        : /preto|preta|pretas/i.test(line)
          ? "Preto"
          : "";
      result.items.push({ model, color, quantity, gift: /brinde/i.test(line) });
    }
  }
  const knownTotal = result.items.reduce(
    (sum, item) => sum + (item.quantity ?? 0),
    0,
  );
  result.items = result.items.map((item) =>
    item.model === "Instagram" &&
    item.quantity === null &&
    result.declaredTotal !== null &&
    knownTotal === result.declaredTotal
      ? { ...item, quantity: 0 }
      : item,
  );
  return result;
}
export function dispatchIssues(data: Dispatch) {
  const issues = [...data.warnings];
  if (!data.name.trim()) issues.push("Informar nome completo.");
  if (!data.cpf.trim()) issues.push("Informar CPF.");
  else if (!validCpf(data.cpf))
    issues.push("Conferir CPF; os dígitos informados foram preservados.");
  if (!data.address.trim()) issues.push("Informar endereço completo.");
  if (!data.cep.trim()) issues.push("Informar CEP.");
  else if (digits(data.cep).length !== 8) issues.push("Conferir CEP.");
  if (data.phone && ![10, 11, 12, 13].includes(digits(data.phone).length))
    issues.push("Conferir telefone.");
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
    issues.push("Conferir e-mail.");
  if (!data.items.length)
    issues.push("Informar modelo e quantidade das placas.");
  data.items.forEach((item, i) => {
    if (!item.model) issues.push(`Informar modelo do item ${i + 1}.`);
    if (item.model === "Google" && !item.color)
      issues.push(`Confirmar cor do item ${i + 1}.`);
    if (
      item.quantity === null ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1
    )
      issues.push(`Confirmar quantidade do item ${i + 1}.`);
  });
  const known = data.items.every((i) => i.quantity !== null && i.quantity > 0);
  if (
    known &&
    data.declaredTotal !== null &&
    data.declaredTotal !== data.items.reduce((n, i) => n + (i.quantity ?? 0), 0)
  )
    issues.push(
      "Total declarado difere da soma das placas, incluindo brindes.",
    );
  return [...new Set(issues)];
}
export function formatDispatch(data: Dispatch) {
  const issues = dispatchIssues(data);
  const total = data.items.reduce((n, i) => n + (i.quantity ?? 0), 0);
  const lines = [
    "VENDA GERADA | USE TAG",
    "",
    ...[
      data.name && `Cliente: ${data.name.trim()}`,
      data.cpf && `CPF: ${formatCpf(data.cpf)}`,
      data.phone && `Telefone: ${formatPhone(data.phone)}`,
      data.email && `E-mail: ${data.email.trim()}`,
    ].filter(Boolean),
    "",
    ...[
      data.address && `Endereço: ${data.address.trim()}`,
      data.cep && `CEP: ${formatCep(data.cep)}`,
    ].filter(Boolean),
    "",
    "Placas:",
    "",
    ...data.items
      .filter((i) => i.quantity !== 0)
      .map(
        (i) =>
          `- ${i.quantity ?? "Quantidade a confirmar"}${i.quantity !== null ? " unidades" : ""} | ${i.model || "Modelo a confirmar"}${i.color ? " | " + i.color : ""}${i.gift ? " | Brinde" : ""}`,
      ),
    "",
    data.items.length &&
    data.items.every((i) => i.quantity !== null && i.quantity > 0)
      ? `Total: ${total} unidades`
      : "Total: a confirmar",
    ...[
      data.shipping && `Envio: ${data.shipping}`,
      data.note && `Observação: ${data.note}`,
    ].filter(Boolean),
    ...(issues.length ? ["", "Pendência: " + issues.join(" ")] : []),
  ];
  return lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
