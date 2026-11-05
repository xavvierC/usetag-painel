import { configured, json, supabaseServer, trustedOrigin } from '@/lib/supabase/server';
export async function GET() {
  if (!configured()) return json({error:'Ambiente não configurado.'},503);
  const db=await supabaseServer();
  const {data:{user}}=await db.auth.getUser();
  if(!user) return json({error:'Entre novamente.'},401);
  const {data,error}=await db.from('audit_logs').select('metadata').eq('owner_id',user.id).eq('event','raffle.2026-11-05').limit(1).maybeSingle();
  return error ? json({error:'Não foi possível consultar o sorteio.'},503) : json({result:data?.metadata??null});
}
export async function POST(request:Request) {
  if(!trustedOrigin(request)) return json({error:'Origem inválida.'},403);
  if(!configured()) return json({error:'Ambiente não configurado.'},503);
  const db=await supabaseServer();
  const {data:{user}}=await db.auth.getUser();
  if(!user) return json({error:'Entre novamente.'},401);
  const {data,error}=await db.rpc('draw_panel_raffle');
  return error ? json({error:'Não foi possível sortear. Atualize e tente novamente.'},409) : json({result:data});
}
