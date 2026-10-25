import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {sameOrigin} from '@/lib/domain/origin';
const rememberCookie = "usetag-remember";
const rememberMaxAge = 60 * 60 * 24 * 30;
export function configured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
export async function supabaseServer(options?: { remember?: boolean }) {
  if (!configured()) throw Error("Ambiente não configurado.");
  const jar = await cookies();
  const remembered = options?.remember ?? jar.get(rememberCookie)?.value === "1";
  const cookieDefaults = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(remembered ? { maxAge: rememberMaxAge } : {}),
  };
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: cookieDefaults,
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (values) => {
          for (const { name, value, options } of values) {
            jar.set(name, value, { ...cookieDefaults, ...options });
          }
        },
      },
    },
  );
}
export { rememberCookie, rememberMaxAge };
export function trustedOrigin(request: Request) {
  return sameOrigin(request);
}
export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
