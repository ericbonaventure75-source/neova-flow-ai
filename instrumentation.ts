export async function register(){
  if(process.env.NEXT_RUNTIME==='nodejs'){
    const {retryPendingAudits}=await import('./lib/audit-retry');
    const timer=setInterval(()=>{void retryPendingAudits()},60_000);
    timer.unref();
  }
}
