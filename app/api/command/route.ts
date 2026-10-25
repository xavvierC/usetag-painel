import {
  configured,
  json,
  supabaseServer,
  trustedOrigin,
} from "@/lib/supabase/server";
import { requestSchema } from "@/lib/validation/commands";
export async function POST(request: Request) {
  if (!trustedOrigin(request)) return json({ error: "Origem inválida." }, 403);
  if (!configured()) return json({ error: "Ambiente não configurado." }, 503);
  const db = await supabaseServer();
  const { data, error: authError } = await db.auth.getUser();
  if (authError || !data.user)
    return json({ error: "Entre novamente para continuar." }, 401);
  try {
    if (Number(request.headers.get("content-length") ?? 0) > 65536)
      return json({ error: "Solicitação muito grande." }, 413);
    const text = await request.text();
    if (text.length > 65536)
      return json({ error: "Solicitação muito grande." }, 413);
    const body = requestSchema.safeParse(JSON.parse(text));
    if (!body.success)
      return json({ error: "Confira os dados informados." }, 400);
    const { data: result, error } = await db.rpc("panel_command", {
      p: body.data.command,
      k: body.data.key,
    });
    if (error)
      return json(
        {
          error:
            error.code === "40001"
              ? "Os dados mudaram. Atualize a página antes de tentar novamente."
              : "Não foi possível registrar. Confira os valores e os saldos disponíveis.",
        },
        409,
      );
    return json({ ok: true, result });
  } catch {
    return json(
      { error: "Não foi possível concluir. Os campos foram preservados." },
      400,
    );
  }
}
