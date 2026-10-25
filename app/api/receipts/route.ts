import { createClient } from "@supabase/supabase-js";
import {
  configured,
  json,
  supabaseServer,
  trustedOrigin,
} from "@/lib/supabase/server";
import { z } from "zod";
const uuid = z.string().uuid();
function realType(bytes: Uint8Array) {
  if (
    bytes.length >= 8 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b)
  )
    return "image/png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return "image/jpeg";
  const ascii = (a: number, b: number) =>
    String.fromCharCode(...bytes.slice(a, b));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (ascii(0, 5) === "%PDF-") return "application/pdf";
  return null;
}
export async function GET(request: Request) {
  if (!configured()) return json({ error: "Ambiente não configurado." }, 503);
  const db = await supabaseServer();
  const { data: user, error } = await db.auth.getUser();
  if (error || !user.user) return json({ error: "Entre novamente." }, 401);
  const url = new URL(request.url);
  const sale = uuid.safeParse(url.searchParams.get("saleId"));
  if (!sale.success) return json({ error: "Venda inválida." }, 400);
  const { data: receipts, error: readError } = await db
    .from("receipts")
    .select("id,display_name,object_path,byte_size,mime_type")
    .eq("sale_id", sale.data)
    .eq("owner_id", user.user.id)
    .limit(30);
  if (readError)
    return json({ error: "Não foi possível consultar os comprovantes." }, 503);
  const list = await Promise.all(
    (receipts ?? []).map(async (r) => {
      const { data } = await db.storage
        .from("panel-receipts")
        .createSignedUrl(r.object_path, 60);
      return {
        id: r.id,
        name: r.display_name,
        size: r.byte_size,
        url: data?.signedUrl ?? null,
      };
    }),
  );
  return json({ receipts: list });
}
export async function POST(request: Request) {
  if (!trustedOrigin(request)) return json({ error: "Origem inválida." }, 403);
  if (!configured() || !process.env.SUPABASE_SECRET_KEY)
    return json({ error: "Upload privado ainda não configurado." }, 503);
  const db = await supabaseServer();
  const { data: user, error } = await db.auth.getUser();
  if (error || !user.user) return json({ error: "Entre novamente." }, 401);
  const length = Number(request.headers.get("content-length"));
  if (!length || length > 10485760 + 16384)
    return json({ error: "Envie um arquivo de até 10 MB." }, 413);
  try {
    const form = await request.formData();
    const id = uuid.safeParse(form.get("saleId"));
    const file = form.get("file");
    if (
      !id.success ||
      !(file instanceof File) ||
      file.size < 1 ||
      file.size > 10485760
    )
      return json({ error: "Venda ou arquivo inválido." }, 400);
    const { data: sale } = await db
      .from("sales")
      .select("id")
      .eq("id", id.data)
      .eq("owner_id", user.user.id)
      .maybeSingle();
    if (!sale) return json({ error: "Venda não encontrada." }, 404);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const mime = realType(bytes);
    if (!mime) return json({ error: "Use PDF, JPEG, PNG ou WebP." }, 400);
    const service = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const path = `${user.user.id}/${sale.id}/${crypto.randomUUID()}`;
    const { error: uploadError } = await service.storage
      .from("panel-receipts")
      .upload(path, bytes, { contentType: mime, upsert: false });
    if (uploadError)
      return json({ error: "Não foi possível enviar o arquivo." }, 503);
    const { error: recordError } = await service
      .from("receipts")
      .insert({
        owner_id: user.user.id,
        sale_id: sale.id,
        object_path: path,
        byte_size: file.size,
        mime_type: mime,
        display_name: file.name.slice(0, 180),
      });
    if (recordError) {
      await service.storage.from("panel-receipts").remove([path]);
      return json(
        { error: "O comprovante não foi registrado. Tente novamente." },
        503,
      );
    }
    return json({ ok: true });
  } catch {
    return json({ error: "Não foi possível receber o arquivo." }, 400);
  }
}
