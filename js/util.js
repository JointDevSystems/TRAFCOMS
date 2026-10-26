/** Pure helpers: DOM lookup, escaping, ISO 6346 container numbers, formatting, CSV and download. */
export const $=s=>document.querySelector(s);
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const ago=t=>{const m=Math.max(1,Math.round((Date.now()-t)/6e4));return m<60?m+' min ago':m<1440?Math.round(m/60)+' h ago':Math.round(m/1440)+' d ago'};
export const pct=(a,b)=>b?Math.round(a/b*100):0;
export const norm=s=>String(s||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
/** ISO 6346 check digit for the first 10 characters. */
export function cd(p){const v={};let n=10;for(const c of'ABCDEFGHIJKLMNOPQRSTUVWXYZ'){if(n%11==0)n++;v[c]=n++}let s=0;[...p].forEach((c,i)=>s+=(i<4?v[c]:+c)*2**i);return s%11%10}
export const mkNo=(prefix,n)=>{const p=prefix+String(n).padStart(6,'0');return p+cd(p)};
export const validNo=id=>/^[A-Z]{3}[UJZ]\d{7}$/.test(id)&&cd(id.slice(0,10))==+id[10];
export const csv=(h,rows)=>[h,...rows].map(r=>r.map(v=>{v=String(v??'');if(/^[=+\-@]/.test(v))v="'"+v;return`"${v.replace(/"/g,'""')}"`}).join(',')).join('\n');
export const day=()=>new Date().toISOString().slice(0,10);
export function dl(name,text,type='text/csv'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1e3)}
