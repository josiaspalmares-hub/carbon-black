/* ---------- Utilidades ---------- */
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v)), lerp=(a,b,t)=>a+(b-a)*t;
const AUTO=location.hash==='#autoscroll'||location.hash==='#capture';

/* ---------- Texto partido ---------- */
$$('.split').forEach(el=>{
  const lines=el.innerHTML.split(/<br\s*\/?>/i);
  let k=0;
  el.innerHTML=lines.map(l=>{
    const tmp=document.createElement('div');tmp.innerHTML=l;
    const wrap=n=>{if(n.nodeType===3)return n.textContent.split(/(\s+)/).map(w=>/^\s+$/.test(w)?' ':w?`<span class="wd">${[...w].map(c=>`<span class="ch" style="transition-delay:${(k++)*28}ms">${c}</span>`).join('')}</span>`:'').join('');
      const tag=n.tagName.toLowerCase();return `<${tag}>${[...n.childNodes].map(wrap).join('')}</${tag}>`};
    return `<span class="ln">${[...tmp.childNodes].map(wrap).join('')}</span>`}).join('');
});
const io=new IntersectionObserver(e=>e.forEach(x=>{if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}}),{threshold:.25});
$$('.split,.fade').forEach(el=>io.observe(el));

/* ---------- Cinta según la velocidad del scroll ---------- */
const marq=$('.marq .tr');
const unit=`<span>Enciende las brasas <svg viewBox="0 0 20 20"><path d="M10 0l2.4 7.6L20 10l-7.6 2.4L10 20l-2.4-7.6L0 10l7.6-2.4z" fill="#b9814f"/></svg></span><span>Fuego <em>lento</em> <svg viewBox="0 0 20 20"><path d="M10 0l2.4 7.6L20 10l-7.6 2.4L10 20l-2.4-7.6L0 10l7.6-2.4z" fill="#b9814f"/></svg></span><span>Hecho con <em>paciencia</em> <svg viewBox="0 0 20 20"><path d="M10 0l2.4 7.6L20 10l-7.6 2.4L10 20l-2.4-7.6L0 10l7.6-2.4z" fill="#b9814f"/></svg></span>`;
marq.innerHTML=unit.repeat(6);
let mx=0,vel=0,lastY=scrollY;

/* ---------- Scroll suave (Lenis) ---------- */
let lenis=null;
if(window.Lenis&&!AUTO&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
  lenis=new Lenis({duration:1.15,smoothWheel:true});window.lenis=lenis;
  $$('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const t=$(a.getAttribute('href'));if(t){e.preventDefault();lenis.scrollTo(t,{offset:0})}}));
}

/* ---------- Capítulos con el scroll ---------- */
const chapters=$$('.chapter'), vids=chapters.map(c=>c.querySelector('video'));
const heads=chapters.map(c=>c.querySelector('h1,h2')), pars=$$('[data-par]'), hint=$('#hint');
const ring=$('.progress circle'), pct=$('#pct'), nav=$('#nav'), brew=$('#brew');
const track=$('#track'), origins=$('#origins'), obar=$('#obar');
function chapterP(c){const r=c.getBoundingClientRect();return clamp(-r.top/(c.offsetHeight-innerHeight))}
let navY=0, ultimoBrew='';
function onScroll(){
  const y=scrollY;
  chapters.forEach((c,i)=>{
    const p=chapterP(c),v=vids[i];
    // Esperar el cuadro anterior para no atascar el video
    if(v&&v.duration&&!v.seeking){const t=p*(v.duration-.1);if(Math.abs(v.currentTime-t)>1/30)v.currentTime=t;
      v.style.transform=`scale(${1+p*.12})`}
    heads[i].style.transform=`translateY(${(p-.5)*-70}px)`;
    if(i===1){const s=Math.round(p*180),txt=`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;if(txt!==ultimoBrew){brew.textContent=txt;ultimoBrew=txt}}
  });
  const mob=innerWidth<860;
  pars.forEach(el=>{if(mob){el.style.transform='';return}const r=el.parentElement.getBoundingClientRect();if(r.bottom<-200||r.top>innerHeight+200)return;el.style.transform=`translateY(${(r.top+r.height/2-innerHeight/2)*+el.dataset.par}px)`});
  // Orígenes en horizontal
  const op=chapterP(origins), maxX=track.scrollWidth-innerWidth+innerWidth*.06;
  track.style.transform=`translate(${-op*maxX}px,-30%)`; obar.style.width=op*100+'%';
  // Esconder el menú al bajar
  nav.classList.toggle('solid',y>40);
  if(!AUTO)nav.classList.toggle('hide',y>navY&&y>300);navY=y;
  const d=document.documentElement,pr=y/(d.scrollHeight-innerHeight);
  ring.style.strokeDashoffset=138*(1-pr);const pt=Math.round(pr*100)+'%';if(pct.textContent!==pt)pct.textContent=pt;
  hint.style.opacity=1-clamp(chapterP(chapters[0])*6);
}
let sucio=true;
vids.forEach(v=>v&&v.addEventListener('loadedmetadata',()=>{sucio=true}));
addEventListener('resize',()=>{sucio=true});

/* Videos: versión liviana en el teléfono; el primero ya, los demás al acercarse (eran 11 MB de golpe) */
const ligero=matchMedia('(max-width: 860px)').matches||navigator.connection?.saveData;
const ponerVideo=v=>{if(v.getAttribute('src'))return;v.preload='auto';v.src=ligero?v.dataset.movil:v.dataset.src;v.load()};
const conVideo=vids.filter(Boolean);
if(conVideo[0])ponerVideo(conVideo[0]);
const cercaVideo=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){ponerVideo(e.target.querySelector('video'));cercaVideo.unobserve(e.target)}}),{rootMargin:'150% 0px'});
conVideo.slice(1).forEach(v=>cercaVideo.observe(v.closest('.chapter')));

/* Decodificar el primer video durante la carga para que no se congele al llegar */
conVideo.slice(1).forEach(v=>v.addEventListener('loadeddata',()=>{v.currentTime=.05},{once:true}));
const videosListos=Promise.all(conVideo.slice(0,1).map(v=>new Promise(ok=>{
  const fin=()=>ok();
  if(v.readyState>=2){v.currentTime=.05;v.addEventListener('seeked',fin,{once:true});return}
  v.addEventListener('loadeddata',()=>{v.currentTime=.05;v.addEventListener('seeked',fin,{once:true})},{once:true});
  v.addEventListener('error',fin,{once:true});
})));

/* Pausar cinta y adornos fuera de pantalla */
const visibles=new Set();
const vio=new IntersectionObserver(es=>es.forEach(e=>{e.isIntersecting?visibles.add(e.target):visibles.delete(e.target);
  if(e.target.classList.contains('builder'))e.target.classList.toggle('off',!e.isIntersecting)}),{rootMargin:'200px'});
[$('.marq'),$('.builder')].forEach(el=>vio.observe(el));

/* ---------- Contadores ---------- */
const cio=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;cio.unobserve(e.target);
  const el=e.target,end=+el.dataset.count,dec=+(el.dataset.dec||0),t0=performance.now();
  (function f(t){const k=clamp((t-t0)/1800),v=end*(1-Math.pow(1-k,4));el.textContent=dec?v.toFixed(dec):Math.round(v).toLocaleString('en-US');if(k<1)requestAnimationFrame(f)})(t0)}),{threshold:.6});
$$('[data-count]').forEach(el=>cio.observe(el));

/* ---------- Cursor y botones magnéticos ---------- */
const cur=$('#cur'),clab=$('#clab');let cx=innerWidth/2,cy=innerHeight/2,rx=cx,ry=cy;
addEventListener('pointermove',e=>{cx=e.clientX;cy=e.clientY});
document.addEventListener('pointerover',e=>{
  const t=e.target.closest('[data-cursor],a,button,input,.mrow');
  cur.classList.toggle('big',!!(t&&t.dataset.cursor));cur.classList.toggle('link',!!(t&&!t.dataset.cursor));
  if(t&&t.dataset.cursor)clab.textContent=t.dataset.cursor;
});
$$('[data-mag]').forEach(el=>{
  el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect();el.style.transform=`translate(${(e.clientX-r.left-r.width/2)*.3}px,${(e.clientY-r.top-r.height/2)*.4}px)`});
  el.addEventListener('pointerleave',()=>{el.style.transition='transform .6s cubic-bezier(.2,.8,.2,1)';el.style.transform='';setTimeout(()=>el.style.transition='',600)});
});

/* ---------- Tarjetas inclinables ---------- */
$$('[data-tilt]').forEach(c=>{
  c.addEventListener('pointermove',e=>{const r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
    c.style.transform=`perspective(900px) rotateY(${x*12}deg) rotateX(${-y*12}deg)`;c.querySelector('.bg')&&(c.querySelector('.bg').style.backgroundPosition=`${50+x*20}% ${50+y*20}%`)});
  c.addEventListener('pointerleave',()=>c.style.transform='');
});

/* ---------- Vista previa del menú ---------- */
const prev=$('#preview'),pv=prev.querySelector('video');let px=0,py=0;
$$('.mrow').forEach(r=>{
  r.addEventListener('pointerenter',()=>{if(!r.dataset.vid)return;if(pv.getAttribute('src')!==r.dataset.vid){pv.src=r.dataset.vid}pv.play().catch(()=>{});prev.classList.add('on')});
  r.addEventListener('pointerleave',()=>prev.classList.remove('on'));
});

/* ---------- Pedido ---------- */
let count=0;const cnt=$('#count'),toast=$('#toast');let tt;
function addToCart(name){count++;cnt.textContent=count;cnt.classList.add('pop');setTimeout(()=>cnt.classList.remove('pop'),300);
  toast.textContent=`${name} agregado a tu pedido`;toast.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>toast.classList.remove('on'),2200)}
$$('[data-add]').forEach(b=>b.addEventListener('click',()=>addToCart(b.closest('.mrow').querySelector('h3').textContent)));

/* ---------- Menú: pestañas y ficha ---------- */
const filas=$$('.mrow'), pestanas=$$('.tabs button'), nombresCat={cortes:'Cortes',achuras:'Achuras',acompanantes:'Acompañantes',vinos:'Vinos',postres:'Postres'};
pestanas.forEach(b=>b.addEventListener('click',()=>{
  pestanas.forEach(x=>{const on=x===b;x.classList.toggle('on',on);x.setAttribute('aria-selected',on)});
  let n=0;filas.forEach(f=>{const ver=b.dataset.cat==='todo'||f.dataset.cat===b.dataset.cat;f.hidden=!ver;
    if(ver){f.querySelector('.i').textContent=String(++n).padStart(2,'0');f.classList.remove('entra');void f.offsetWidth;f.style.animationDelay=(n*.05)+'s';f.classList.add('entra')}});
  sucio=true;
}));
const ficha=$('#ficha');let fichaFila=null;
function abrirFicha(f){fichaFila=f;
  $('#fimg').src=f.dataset.img;$('#fnom').textContent=f.querySelector('h3').textContent;$('#fcat').textContent=nombresCat[f.dataset.cat];
  $('#fdesc').textContent=f.dataset.desc;
  // ocultar datos que no aplican (—)
  [['#fpeso','peso'],['#fterm','term'],['#fmar','mar']].forEach(([id,k])=>{const v=f.dataset[k];$(id).textContent=v;$(id).parentElement.hidden=v==='—'});
  $('#fprecio').textContent=f.querySelector('.p').textContent;prev.classList.remove('on');ficha.showModal()}
filas.forEach(f=>{
  f.addEventListener('click',e=>{if(!e.target.closest('[data-add]'))abrirFicha(f)});
  f.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();abrirFicha(f)}});
});
$('#fcerrar').addEventListener('click',()=>ficha.close());
ficha.addEventListener('click',e=>{if(e.target===ficha)ficha.close()});  // clic fuera cierra
$('#fadd').addEventListener('click',()=>{addToCart(fichaFila.querySelector('h3').textContent);ficha.close()});


/* ---------- Arma tu plato ---------- */
const str=$('#str'),swt=$('#swt');let milk='oat';
const mix=(a,b,t)=>{const p=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));const A=p(a),B=p(b);return '#'+A.map((v,i)=>Math.round(lerp(v,B[i],t)).toString(16).padStart(2,'0')).join('')};
function build(){
  const s=+str.value/100,w=+swt.value/100;
  [str,swt].forEach(r=>r.style.setProperty('--v',r.value+'%'));
  const col=mix('#b5523f','#4a2616',s);
  // interior: jugoso → a punto → bien cocido
  const centro=s<.5?mix('#c43b3b','#d9837a',s/.5):mix('#d9837a','#8a5a44',(s-.5)/.5), banda=mix('#c86a5c','#7a4b35',s);
  $('#cc').setAttribute('stop-color',centro);$('#cb1').setAttribute('stop-color',banda);$('#cb2').setAttribute('stop-color',banda);
  $('#cb1').setAttribute('offset',(.1+s*.25).toFixed(2));$('#cb2').setAttribute('offset',(.9-s*.25).toFixed(2));
  $('#liq').setAttribute('fill',col);
  $('#foam').setAttribute('fill',milk==='none'?'#3f7a2e':milk==='oat'?'#e0b04a':'#7fb24a');
  $('#halo').style.background=`radial-gradient(circle,${mix('#f0d2ae','#c8642e',s*.6)},transparent 70%)`;
  const it=s<.33?0:s<.66?1:2; $$('#disc img').forEach((im,i)=>im.classList.toggle('on',i===it));
  $('.cupsvg').style.setProperty('--humo',w<.15?0:(.3+w*.7).toFixed(2));
  $('#sv').textContent=s<.33?'Jugoso':s<.66?'A punto':'Bien cocido';$('#tagS').textContent=$('#sv').textContent;$('#tagM').textContent=milk==='none'?'Chimichurri':milk==='oat'?'Papas':'Ensalada';
  $('#swv').textContent=w<.15?'Sin humo':w<.5?'Un poco':w<.8?'Ahumado':'Muy ahumado';$('#tagW').textContent=$('#swv').textContent;
  const names={none:s>.6?['Bife Carbon','Bien cocido, firme, con chimichurri',18]:['Entraña al Chimichurri','Jugosa, herbal, intensa',16],
    oat:w>.4?['Ribeye Ahumado','Marmoleado, ahumado, con papas',24]:['Picanha con Papas','Grasa dorada, sal gruesa',20],
    whole:s>.6?['Asado de Tira','Lento, tierno, con ensalada',19]:['Lomo a la Brasa','Magro, rosado, fresco',22]};
  const [n,d,pr]=names[milk];$('#rname').textContent=n;$('#rdesc').textContent=d;$('#rprice').textContent=(pr+(w>.5?1.5:0)).toFixed(2);
}
[str,swt].forEach(r=>r.addEventListener('input',build));
$$('#milk button').forEach(b=>b.addEventListener('click',()=>{$$('#milk button').forEach(x=>x.classList.toggle('on',x===b));milk=b.dataset.m;build()}));
$('#addb').addEventListener('click',()=>addToCart($('#rname').textContent));build();

/* ---------- Boletín ---------- */
$('#news').addEventListener('submit',e=>{e.preventDefault();const f=e.target;f.classList.add('ok');f.querySelector('input').value='';f.querySelector('input').placeholder='Listo, te escribimos pronto';});

/* ---------- Letras gigantes del pie ---------- */
const g=$('#giant');g.innerHTML=[...g.textContent].map(c=>`<span>${c===' '?'&nbsp;':c}</span>`).join('');

/* ---------- Bucle principal ---------- */
const dot=cur.querySelector('.dot'), ringCur=cur.querySelector('.ring');
const anchoMarq=()=>marq.scrollWidth/6; let wMarq=anchoMarq(); addEventListener('resize',()=>{wMarq=anchoMarq()});
let yAntes=-1;
ringCur.style.transform=`translate3d(${rx}px,${ry}px,0)`;
function loop(t){
  if(lenis)lenis.raf(t);
  const y=scrollY;vel=lerp(vel,y-lastY,.12);lastY=y;
  if(visibles.has(marq.parentElement)){
    mx-=1+Math.abs(vel)*.6;if(-mx>wMarq)mx+=wMarq;
    marq.style.transform=`translate3d(${mx}px,0,0) skewX(${clamp(vel*-.25,-12,12)}deg)`;
  }
  // Cursor: solo si hay movimiento
  if(Math.abs(rx-cx)>.1||Math.abs(ry-cy)>.1){
    rx=lerp(rx,cx,.18);ry=lerp(ry,cy,.18);
    ringCur.style.transform=`translate3d(${rx}px,${ry}px,0)`;clab.style.transform=`translate(calc(${rx}px - 50%),calc(${ry}px - 50%))`;
  }
  dot.style.transform=`translate3d(${cx}px,${cy}px,0)`;
  if(prev.classList.contains('on')){px=lerp(px,cx,.12);py=lerp(py,cy,.12);prev.style.left=px+'px';prev.style.top=py+'px'}
  // Scroll: solo si cambió
  if(y!==yAntes||sucio){onScroll();yAntes=y;sucio=false}
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/* ---------- Pantalla de carga ---------- */
(function(){
  const n=$('#lnum'),bar=$('#lbar'),t0=performance.now(),D=AUTO?10:1700;
  // Espera la escena 3D y los videos (máximo 2,5 s) para no congelar el scroll
  const listo=Promise.race([Promise.all([videosListos,window.__gl3d]),new Promise(ok=>setTimeout(ok,2500))]);
  let preparado=false;listo.then(()=>{preparado=true});
  const salir=()=>{n.textContent='100';bar.style.width='100%';$('#loader').classList.add('out');document.body.classList.remove('loading');window.__ready=true};
  (function f(t){const k=clamp((t-t0)/D),v=Math.min(99,Math.round((1-Math.pow(1-k,3))*100));n.textContent=String(v).padStart(2,'0');bar.style.width=v+'%';
    if(k<1)requestAnimationFrame(f);else if(preparado)salir();else listo.then(salir)})(t0);
})();


/* ---------- Reservas por WhatsApp y horario ---------- */
(function(){
  const f=$('#rform'),fecha=$('#rfecha'),hora=$('#rhora'),nom=$('#rnombre'),oca=$('#rocasion'),err=$('#rerror'),per=$('#rpersonas');
  const ahoraCcs=()=>new Date(new Date().toLocaleString('en-US',{timeZone:'America/Caracas'}));
  const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const hoy=ahoraCcs(); fecha.min=iso(hoy); fecha.value=iso(hoy);
  let personas=2;
  const pintar=()=>{per.textContent=personas};
  $('#rmenos').addEventListener('click',()=>{personas=Math.max(1,personas-1);pintar()});
  $('#rmas').addEventListener('click',()=>{personas=Math.min(20,personas+1);pintar()});
  const fallo=t=>{err.textContent=t;err.hidden=false};
  f.addEventListener('submit',e=>{e.preventDefault();err.hidden=true;
    const n=nom.value.replace(/<[^>]*>/g,'').replace(/[<>]/g,'').trim();  // solo texto
    if(!fecha.value||fecha.value<fecha.min)return fallo('Elige un día desde hoy en adelante.');
    if(new Date(fecha.value+'T12:00').getDay()===1)return fallo('Los lunes estamos cerrados. Elige otro día.');
    if(!hora.value)return fallo('Elige una hora.');
    if(n.length<2)return fallo('Escribe tu nombre.');
    const dia=new Date(fecha.value+'T12:00').toLocaleDateString('es-VE',{weekday:'long',day:'numeric',month:'long'});
    const msj=`Hola, Carbon Black 🔥 Quiero reservar una mesa para ${personas} ${personas===1?'persona':'personas'} el ${dia} a las ${hora.value}. A nombre de ${n}.`+(oca.value?` Es por: ${oca.value}.`:'');
    // Concepto: sin número fijo, WhatsApp pide elegir el chat
    window.open('https://wa.me/?text='+encodeURIComponent(msj),'_blank','noopener');
  });
  // horario: dom 12–21, mar–jue 17–23, vie–sáb 17–24, lun cerrado
  const turnos={0:[12,21],2:[17,23],3:[17,23],4:[17,23],5:[17,24],6:[17,24]};
  const filasH=$$('.horario div'), idxFila={0:2,1:3,2:0,3:0,4:0,5:1,6:1};
  const estado=$('#estado'),txt=$('#estadoTxt');
  const hFmt=h=>{const x=h%24,am=x<12;return (x%12||12)+(am?' am':' pm')};
  function horario(){const d=ahoraCcs(),dia=d.getDay(),h=d.getHours()+d.getMinutes()/60,t=turnos[dia];
    filasH.forEach((el,i)=>el.classList.toggle('hoy',i===idxFila[dia]));
    if(t&&h>=t[0]&&h<t[1]){estado.classList.add('abierto');txt.textContent=`Abierto ahora · cierra a las ${hFmt(t[1])}`;return}
    estado.classList.remove('abierto');
    if(t&&h<t[0]){txt.textContent=`Cerrado · abre hoy a las ${hFmt(t[0])}`;return}
    for(let k=1;k<=7;k++){const nd=(dia+k)%7;if(turnos[nd]){txt.textContent=`Cerrado · abre ${k===1?'mañana':['el domingo','el lunes','el martes','el miércoles','el jueves','el viernes','el sábado'][nd]} a las ${hFmt(turnos[nd][0])}`;return}}
  }
  horario(); setInterval(horario,60000);
})();
/* ---------- Reel automático ---------- */
if(location.hash==='#autoscroll'){document.documentElement.style.scrollBehavior='auto';
  const t0=performance.now()+800,D=7600;
  (function s(t){const H=document.documentElement.scrollHeight-innerHeight,k=clamp((t-t0)/D),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;scrollTo(0,H*e);if(k<1)requestAnimationFrame(s)})(performance.now());}
