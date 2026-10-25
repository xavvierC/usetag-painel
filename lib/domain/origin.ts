export function sameOrigin(request:Request){
 try{
  const origin=request.headers.get('origin');const host=request.headers.get('host');if(!origin||!host)return false;
  const parsed=new URL(origin);const protocol=(request.headers.get('x-forwarded-proto')??new URL(request.url).protocol.replace(':','')).split(',')[0].trim();
  return ['http','https'].includes(protocol)&&parsed.origin===`${protocol}://${host.toLowerCase()}`;
 }catch{return false;}
}
