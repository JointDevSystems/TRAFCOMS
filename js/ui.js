/** Shared UI primitives in the portal's design language: toast, modal, badges, panels, tables, bars. */
import {P} from './config.js';
import {$,esc} from './util.js';

const BADGE={ok:'s-verified',warn:'s-pending',bad:'s-rejected',info:'s-completed',mute:'s-draft'};
export const ic=n=>`<svg class="nav-icon" viewBox="0 0 24 24"><path d="${P[n]}"/></svg>`;
export function toast(m,type){const s=$('#toastStack'),t=document.createElement('div');t.className='toast '+(type||'success');t.textContent=m;s.append(t);setTimeout(()=>{t.classList.add('out');setTimeout(()=>t.remove(),300)},3400)}
export const pill=(text,tone)=>`<span class="sbadge ${BADGE[tone]||BADGE.mute}">${esc(text)}</span>`;
export const meta=(map,k)=>{const m=map[k]||[k,'mute'];return pill(m[0],m[1])};
export function ov(html,title=''){$('#modalTitle').textContent=title;$('#modalBody').innerHTML=html;$('#modalOverlay').classList.add('active')}
export const closeAll=()=>$('#modalOverlay').classList.remove('active');
export const opts=(a,sel)=>a.map(([v,t])=>`<option value="${esc(v)}" ${v==sel?'selected':''}>${esc(t)}</option>`).join('');
export const card=(title,body,extra='',flush=false)=>`<div class="panel"><div class="panel-head"><span class="panel-title">${title}</span><span class="panel-meta">${extra}</span></div>${flush||body.includes('table-wrap')?body:`<div class="panel-body">${body}</div>`}</div>`;
export const kpi=(n,l,c='',s='')=>`<div class="kpi-card ${c}"><div class="kpi-value">${n}</div><div class="kpi-label">${l}</div>${s?`<div class="kpi-sub">${s}</div>`:''}</div>`;
export const bar=(p,color)=>`<div class="fsb-track"><div class="fsb-fill" style="width:${Math.min(100,p)}%;background:${color||'var(--gold)'}"></div></div>`;
export const occTone=p=>p>85?'var(--red)':p>70?'var(--amber)':'var(--green)';
/** rows: [[cells], attrs?] */
export const table=(heads,rows,empty='Nothing here yet.')=>`<div class="table-wrap"><table class="data-table"><thead><tr>${heads.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(([c,a])=>`<tr ${a||''}>${c.map(x=>`<td>${x}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${heads.length}"><div class="empty-state"><div class="empty-state-label">${empty}</div></div></td></tr>`}</tbody></table></div>`;
