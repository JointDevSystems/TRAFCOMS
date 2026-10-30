/* Gargo legacy polyfills (ES5). Only fills what is missing. */
(function(){
  var w=window;
  if(typeof w.globalThis==='undefined')w.globalThis=w;
  if(!Object.fromEntries)Object.fromEntries=function(it){var o={};for(var e of it)o[e[0]]=e[1];return o;};
  if(!Object.hasOwn)Object.hasOwn=function(o,k){return Object.prototype.hasOwnProperty.call(o,k);};
  if(!Array.prototype.flat)Array.prototype.flat=function(dp){dp=dp===undefined?1:dp;var r=[];(function f(a,d){for(var i=0;i<a.length;i++){if(Array.isArray(a[i])&&d>0)f(a[i],d-1);else r.push(a[i]);}})(this,dp);return r;};
  if(!Array.prototype.flatMap)Array.prototype.flatMap=function(fn,t){return Array.prototype.map.call(this,fn,t).flat(1);};
  if(!String.prototype.padStart)String.prototype.padStart=function(n,s){s=s===undefined?' ':String(s);var str=String(this);if(str.length>=n||!s)return str;var p='';while(p.length<n-str.length)p+=s;return p.slice(0,n-str.length)+str;};
  if(!String.prototype.padEnd)String.prototype.padEnd=function(n,s){s=s===undefined?' ':String(s);var str=String(this);if(str.length>=n||!s)return str;var p='';while(p.length<n-str.length)p+=s;return str+p.slice(0,n-str.length);};
  if(!String.prototype.replaceAll)String.prototype.replaceAll=function(a,b){return a instanceof RegExp?this.replace(a,b):this.split(String(a)).join(b);};
  if(!Promise.allSettled)Promise.allSettled=function(a){return Promise.all(Array.prototype.map.call(a,function(p){return Promise.resolve(p).then(function(v){return{status:'fulfilled',value:v};},function(r){return{status:'rejected',reason:r};});}));};
  if(!Promise.prototype.finally)Promise.prototype.finally=function(f){var P=this.constructor||Promise;return this.then(function(v){return P.resolve(f()).then(function(){return v;});},function(e){return P.resolve(f()).then(function(){throw e;});});};
  if(!w.queueMicrotask)w.queueMicrotask=function(f){Promise.resolve().then(f);};
  if(typeof w.AbortController==='undefined'){w.AbortController=function(){var l=[],s={aborted:false,addEventListener:function(t,f){l.push(f);},removeEventListener:function(){}};this.signal=s;this.abort=function(){if(s.aborted)return;s.aborted=true;for(var i=0;i<l.length;i++)try{l[i]({type:'abort'});}catch(e){}};};}
  if(!navigator.clipboard){try{Object.defineProperty(navigator,'clipboard',{value:{writeText:function(t){return new Promise(function(ok,no){var a=document.createElement('textarea');a.value=t;a.style.position='fixed';a.style.opacity='0';document.body.appendChild(a);a.select();var r=false;try{r=document.execCommand('copy');}catch(e){}document.body.removeChild(a);r?ok():no(new Error('copy failed'));});}}});}catch(e){}}
})();
