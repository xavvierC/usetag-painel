import {
  configured,
  json,
  rememberCookie,
  rememberMaxAge,
  supabaseServer,
  trustedOrigin,
} from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { z } from "zod";
export async function GET() {
  if (!configured()) return json({ mode: "demo" });
  const db = await supabaseServer();
  const { data, error } = await db.auth.getUser();
  return error || !data.user
    ? json({ mode: "login" }, 401)
    : json({ mode: "live" });
}
export async function POST(request: Request) {
  if (!trustedOrigin(request)) return json({ error: "Origem inválida." }, 403);
  if (!configured())
    return json({ error: "Configure o ambiente antes de entrar." }, 503);
  try {
    if (Number(request.headers.get("content-length") ?? 0) > 2048)
      return json({ error: "Solicitação inválida." }, 413);
    const parsed = z
      .object({
        email: z.string().email().max(254),
        password: z.string().min(1).max(256),
        remember: z.boolean().default(false),
      })
      .strict()
      .safeParse(await request.json());
    if (!parsed.success)
      return json({ error: "Confira o e-mail e a senha." }, 400);
    const { remember, ...credentials } = parsed.data;
    const db = await supabaseServer({ remember });
    const { error } = await db.auth.signInWithPassword(credentials);
    if (!error) {
      const jar = await cookies();
      jar.set(rememberCookie, remember ? "1" : "", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        ...(remember ? { maxAge: rememberMaxAge } : { maxAge: 0 }),
      });
    }
    return error
      ? json(
          {
            error:
              "Não foi possível entrar. Confira os dados ou tente novamente mais tarde.",
          },
          401,
        )
      : json({ ok: true });
  } catch {
    return json({ error: "Não foi possível entrar. Tente novamente." }, 503);
  }
}
export async function DELETE(request: Request) {
  if (!trustedOrigin(request)) return json({ error: "Origem inválida." }, 403);
  if (!configured()) return json({ ok: true });
  const db = await supabaseServer();
  const { error } = await db.auth.signOut();
  const jar = await cookies();
  jar.set(rememberCookie, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return error
    ? json({ error: "Não foi possível sair." }, 503)
    : json({ ok: true });
}
