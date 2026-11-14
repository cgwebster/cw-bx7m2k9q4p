const C='board-static-1794689583';
self.addEventListener('install',e=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k!==C).map(k=>caches.delete(k)));
  await self.clients.claim();
})()));
self.addEventListener('fetch',e=>{
  const r=e.request; if(r.method!=='GET') return;
  const u=new URL(r.url);
  if(u.origin!==self.location.origin) return; /* never proxy ngrok API calls */
  const nav=r.mode==='navigate'||u.pathname.endsWith('/');
  const json=u.pathname.endsWith('scores.json')||u.pathname.endsWith('/decisions')||u.pathname.endsWith('/ver');
  if(!nav && !json) return;
  const bypass=u.searchParams.has('fresh')||u.searchParams.has('nosw');
  const net=()=>fetch(u.href,{credentials:'same-origin',cache:'no-store'});
  e.respondWith((async()=>{
    try{
      const x=await net();
      if(x.ok && nav && !bypass){
        try{ const c=await caches.open(C); await c.put(u.origin+u.pathname, x.clone()); }catch(err){}
      }
      return x;
    }catch(err){
      if(json) return new Response('{"error":"offline"}',{status:503,headers:{'content-type':'application/json','cache-control':'no-store'}});
      if(!bypass){
        const m=await caches.match(u.origin+u.pathname);
        if(m) return m;
      }
      return new Response(
        '<!doctype html><meta name=viewport content="width=device-width,initial-scale=1">'+
        '<p style="font:16px sans-serif;margin:24px">Board temporarily unreachable.</p>'+
        '<p style="font:15px sans-serif;margin:24px"><a href="'+u.pathname+'?fresh='+Date.now()+'">Retry</a></p>',
        {status:503,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}}
      );
    }
  })());
});
