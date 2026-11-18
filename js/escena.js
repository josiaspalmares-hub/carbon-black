import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const canvas=document.getElementById('bean'), chapter=canvas.closest('.chapter'), llamarada=document.getElementById('llamarada');
// Teléfono: menos píxeles, sombras y partículas
const MOVIL=matchMedia('(max-width: 860px), (hover: none)').matches;
const renderer=new THREE.WebGLRenderer({canvas,antialias:!MOVIL,alpha:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,MOVIL?1:1.5));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.08;
renderer.shadowMap.enabled=!MOVIL; renderer.shadowMap.type=THREE.PCFShadowMap;
// Vidrio a media resolución (lo más caro de dibujar)
if('transmissionResolutionScale' in renderer)renderer.transmissionResolutionScale=.5;

const scene=new THREE.Scene();
const pmrem=new THREE.PMREMGenerator(renderer);
scene.environment=pmrem.fromScene(new RoomEnvironment(),0.04).texture;
const camera=new THREE.PerspectiveCamera(28,1,.1,100);
const root=new THREE.Group(); scene.add(root);

const key=new THREE.DirectionalLight(0xfff0e0,2.5); key.position.set(2.5,9,5); key.castShadow=true;
key.shadow.mapSize.set(1024,1024); key.shadow.bias=-.0004;
Object.assign(key.shadow.camera,{left:-5,right:5,top:6,bottom:-5}); scene.add(key);
scene.add(new THREE.HemisphereLight(0xfff4e6,0x6b4a33,.65));
const rim=new THREE.DirectionalLight(0xffb77a,2.2); rim.position.set(-6,3,-5); scene.add(rim);
const warm=new THREE.PointLight(0xff9a50,0,6); scene.add(warm);

const ground=new THREE.Mesh(new THREE.PlaneGeometry(40,40),new THREE.ShadowMaterial({opacity:.1}));
ground.rotation.x=-Math.PI/2; ground.position.y=-2.45; ground.receiveShadow=true; root.add(ground);

/* ----- Texturas ----- */
const hash=(x,y)=>{const s=Math.sin(x*127.1+y*311.7)*43758.5453;return s-Math.floor(s)};
const vn=(x,y)=>{const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  const a=hash(xi,yi),b=hash(xi+1,yi),c=hash(xi,yi+1),d=hash(xi+1,yi+1);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v};
const fbm=(x,y,o=6)=>{let v=0,a=.5,f=1;for(let i=0;i<o;i++){v+=a*vn(x*f,y*f);a*=.5;f*=2}return v};
function tex(size,fn,color=false){const c=document.createElement('canvas');c.width=c.height=size;const g=c.getContext('2d'),img=g.createImageData(size,size);
  for(let i=0;i<size*size;i++){const r=fn(i%size,(i/size)|0);img.data.set(color?[...r,255]:[r,r,r,255],i*4)}
  g.putImageData(img,0,0);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;if(color)t.colorSpace=THREE.SRGBColorSpace;return t}
// Superficie del carbón
const TB=MOVIL?256:512;  // se ve igual y se genera 4 veces más rápido
const bump=tex(TB,(x,y)=>{const u=x/TB,v=y/TB;const ridge=Math.abs(Math.sin((u*40+fbm(u*6,v*6,4)*3)*Math.PI));return 60+fbm(u*24,v*24)*130+ridge*14});
const rough=tex(256,(x,y)=>140+fbm(x/20,y/20,4)*100);
const albedo=tex(256,(x,y)=>{const n=fbm(x/30,y/30,5),s=hash(x,y)*.08;const k=.7+n*.6+s;return[Math.min(255,205*k),Math.min(255,200*k),Math.min(255,196*k)]},true);

/* ----- Trozo de carbón ----- */
function beanHalf(side,seg=MOVIL?56:84){
  const g=new THREE.SphereGeometry(1,seg,seg),p=g.attributes.position,col=[];
  const inner=new THREE.Color(0xb98a5c),innerD=new THREE.Color(0x6e4528),crease=new THREE.Color(0x24120a);
  for(let i=0;i<p.count;i++){
    let x=p.getX(i),y=p.getY(i),z=p.getZ(i),cap=false;
    const sx=Math.sin(y*2.4)*.07*(1-y*y*.6);
    if((x-sx)*side<0){cap=true;x=sx+side*.002}
    const dx=x-sx;
    const bulto=1+(vn(x*2.6+5,y*2.6+z*2.6)-.5)*.34;        // trozo irregular de carbón
    const bulge=1+.05*Math.cos(y*1.6);
    x*=.98*bulge*bulto;y*=1.12*bulto;z*=.9*bulge*bulto;
    p.setXYZ(i,x,y,z);
    let c;
    if(cap){c=new THREE.Color(4.2,1.35,.3).lerp(new THREE.Color(1.6,.32,.06),clamp(Math.abs(z)*1.1+Math.abs(y)*.25))}  // brasa encendida
    else if(z>0&&Math.abs(dx)<.06&&false){c=crease}
    else c=new THREE.Color(.034,.031,.029).lerp(new THREE.Color(.016,.015,.014),clamp((1.3-y)/2.6)*.6);  // carbón por fuera
    col.push(c.r,c.g,c.b);
  }
  g.setAttribute('color',new THREE.Float32BufferAttribute(col,3)); g.computeVertexNormals(); return g;
}
function clamp(v,a=0,b=1){return Math.min(b,Math.max(a,v))}
const beanMat=new THREE.MeshPhysicalMaterial({map:albedo,vertexColors:true,roughness:.88,roughnessMap:rough,bumpMap:bump,bumpScale:3.4,
  clearcoat:.04,clearcoatRoughness:.8,sheen:.35,sheenRoughness:.7,sheenColor:new THREE.Color(0x4a4440)});
const halfL=new THREE.Mesh(beanHalf(-1),beanMat),halfR=new THREE.Mesh(beanHalf(1),beanMat);
[halfL,halfR].forEach(m=>m.castShadow=true);
const bean=new THREE.Group(); bean.add(halfL,halfR); root.add(bean);

/* ----- Trozos de fondo ----- */
const smallGeo=beanHalf(1,24), smallGeoL=beanHalf(-1,24);
const amb=[];
for(let i=0;i<7;i++){const g=new THREE.Group();g.add(new THREE.Mesh(smallGeo,beanMat),new THREE.Mesh(smallGeoL,beanMat));
  const s=.12+hash(i,11)*.16;g.scale.setScalar(s);g.userData={x:-1.6+hash(i,1)*3.6,y:(hash(i,2)-.5)*5.5,z:-4-hash(i,3)*6,sp:.2+hash(i,4)*.4,r:hash(i,5)*6};
  root.add(g);amb.push(g)}

/* ----- Trozos que caen ----- */
const N=MOVIL?100:180, minis=new THREE.InstancedMesh(smallGeo,beanMat,N); minis.castShadow=true; root.add(minis);
const NG=MOVIL?240:600, grounds=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0),new THREE.MeshBasicMaterial({color:0xff7a22}),NG); root.add(grounds);
const seeds=Array.from({length:N},(_,i)=>({t:hash(i,3)*.5,x:(hash(i,7)-.5)*.55,z:(hash(i,9)-.5)*.4,r:[hash(i,1)*6,hash(i,2)*6,hash(i,4)*6],s:.08+hash(i,5)*.05,w:(hash(i,6)-.5)*10}));
minis.userData.activo=true; grounds.userData.activo=true;
const gseeds=Array.from({length:NG},(_,i)=>({t:.25+hash(i,13)*.6,x:(hash(i,17)-.5)*.35,z:(hash(i,19)-.5)*.3,s:.012+hash(i,15)*.02,w:hash(i,16)*.6}));

/* ----- Jarra (escondida, la reemplaza la parrilla) ----- */
const outerP=[[0,-2.45],[.55,-2.445],[.86,-2.38],[1.08,-2.2],[1.2,-1.92],[1.22,-1.6],[1.13,-1.28],[.94,-1.0],[.72,-.78],[.58,-.6],[.56,-.42],[.6,-.28],[.7,-.16],[.8,-.1]];
const W=.035;
const innerP=outerP.slice(1,-1).map(([x,y])=>[Math.max(x-W,.001),y+(y<-2.4?W:0)]);
const shell=[...outerP,[.8-W,-.08],...innerP.slice().reverse(),[0,-2.45+W]].map(([x,y])=>new THREE.Vector2(x,y));
// Vidrio sin refracción real: evita dibujar la escena dos veces
const glassMat=new THREE.MeshPhysicalMaterial({color:0x6e625a,roughness:.04,metalness:0,clearcoat:1,clearcoatRoughness:.03,envMapIntensity:1.6,specularIntensity:1,transparent:true,opacity:.34,side:THREE.FrontSide,depthWrite:false});
const glass=new THREE.Mesh(new THREE.LatheGeometry(shell,160),glassMat); glass.renderOrder=2;
const carafe=new THREE.Group(); carafe.add(glass);
const lip=new THREE.Mesh(new THREE.TorusGeometry(.8-W/2,W/2,16,128),glassMat); lip.rotation.x=Math.PI/2; lip.position.y=-.09; carafe.add(lip);
// Cuello de madera
const wood=tex(512,(x,y)=>{const n=fbm(x/90,y/6,4);const k=.75+.35*Math.sin(y*.18+n*6);return[150*k,98*k,60*k]},true);
const collar=new THREE.Mesh(new THREE.CylinderGeometry(.635,.6,.34,96,1,true),new THREE.MeshPhysicalMaterial({map:wood,roughness:.55,clearcoat:.3,side:THREE.DoubleSide}));
collar.position.y=-.5; collar.castShadow=true; carafe.add(collar);
const tie=new THREE.Mesh(new THREE.TorusGeometry(.64,.022,12,96),new THREE.MeshStandardMaterial({color:0x3a2216,roughness:.7})); tie.rotation.x=Math.PI/2; tie.position.y=-.5; carafe.add(tie);
const knot=new THREE.Mesh(new THREE.CapsuleGeometry(.025,.22,6,12),tie.material); knot.position.set(.6,-.62,.2); knot.rotation.z=.25; carafe.add(knot);
// Brasas dentro
const liqMat=new THREE.MeshStandardMaterial({color:0x100806,roughness:.8,emissive:0xa8300a,emissiveIntensity:.3});
const liquid=new THREE.Mesh(new THREE.BufferGeometry(),liqMat); carafe.add(liquid);
const IN=innerP.map(([x,y])=>[x-.006,y]);
function radiusAt(h){for(let i=0;i<IN.length-1;i++){const[a1,b1]=IN[i],[a2,b2]=IN[i+1];if(h>=b1&&h<=b2)return a1+(a2-a1)*(h-b1)/(b2-b1)}return IN[IN.length-1][0]}
// 90 niveles precalculados: crear la figura en cada cuadro trababa el scroll
const NIVELES=45, LO=-2.45+W+.005, HI=-1.05, formas=[];
for(let i=0;i<=NIVELES;i++){const h=LO+(HI-LO)*i/NIVELES;
  const pts=[[0,IN[0][1]],...IN.filter(([x,y])=>y<h),[radiusAt(h),h],[0,h]].map(([x,y])=>new THREE.Vector2(x,y));
  formas.push(new THREE.LatheGeometry(pts,MOVIL?40:72))}
let lastI=-1;
function setLevel(h){const i=Math.round(clamp((h-LO)/(HI-LO))*NIVELES);if(i===lastI)return;lastI=i;liquid.geometry=formas[i]}
// Superficie de brasas
const swirl=tex(512,(x,y)=>{const u=x/256-1,v=y/256-1;const n=fbm(u*5+9,v*5+9,5);const g=Math.max(0,n-.42)*2.6;return[Math.min(255,40+g*230),Math.min(255,26+g*95),Math.min(255,20+g*25)]},true);  // brasas: carbón con vetas encendidas
const crema=new THREE.Mesh(new THREE.CircleGeometry(1,96),new THREE.MeshStandardMaterial({map:swirl,emissiveMap:swirl,emissive:0xffffff,emissiveIntensity:.9,roughness:.9}));
crema.rotation.x=-Math.PI/2; carafe.add(crema);
// Chispitas
const NB=40, bubbles=new THREE.InstancedMesh(new THREE.SphereGeometry(1,10,8),new THREE.MeshBasicMaterial({color:0xffa040}),NB); carafe.add(bubbles);
const bseed=Array.from({length:NB},(_,i)=>({a:hash(i,21)*6.28,r:Math.sqrt(hash(i,22))*.85,s:.012+hash(i,23)*.022}));

/* ----- Parrilla ----- */
[glass,lip,collar,tie,knot].forEach(o=>o.visible=false);
const hierro=new THREE.MeshStandardMaterial({color:0x1c1b1a,roughness:.5,metalness:.8});
const parrilla=new THREE.Group(); carafe.add(parrilla);
const tmp=new THREE.Object3D();
const pieza=(w,h,d,x,y,z)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),hierro);m.position.set(x,y,z);m.castShadow=!MOVIL;parrilla.add(m);return m};
pieza(3.1,.06,1.5,0,-1.92,0);                                   // fondo
pieza(3.1,.72,.06,0,-1.58,-.72);                                // pared de atrás
pieza(.06,.72,1.5,-1.52,-1.58,0); pieza(.06,.72,1.5,1.52,-1.58,0); // costados
pieza(3.1,.3,.06,0,-1.79,.72);                                  // frente bajo: deja ver las brasas
[[-1.42,-.62],[1.42,-.62],[-1.42,.62],[1.42,.62]].forEach(([x,z])=>pieza(.07,.6,.07,x,-2.22,z)); // patas
const NBARRAS=26, barras=new THREE.InstancedMesh(new THREE.CylinderGeometry(.02,.02,1.46,8),hierro,NBARRAS);
for(let i=0;i<NBARRAS;i++){tmp.position.set(-1.45+i*2.9/(NBARRAS-1),-1.22,0);tmp.rotation.set(Math.PI/2,0,0);tmp.updateMatrix();barras.setMatrixAt(i,tmp.matrix)}
parrilla.add(barras);
pieza(3.04,.04,.04,0,-1.22,.7); pieza(3.04,.04,.04,0,-1.22,-.7); // marco de la rejilla

// Cama de brasas
const NCAMA=MOVIL?40:80, cama=new THREE.InstancedMesh(smallGeo,beanMat,NCAMA); parrilla.add(cama);
const camaSeeds=Array.from({length:NCAMA},(_,i)=>({x:(hash(i,31)-.5)*2.75,z:(hash(i,32)-.5)*1.2,y:-1.84+hash(i,33)*.16,s:.13+hash(i,34)*.1,r:[hash(i,35)*6,hash(i,36)*6,hash(i,37)*6]}));
const brillo=new THREE.Mesh(new THREE.PlaneGeometry(2.95,1.35),new THREE.MeshBasicMaterial({map:swirl,color:0x000000}));
brillo.rotation.x=-Math.PI/2; brillo.position.y=-1.885; parrilla.add(brillo);

// Llamas de partículas
const lc=document.createElement('canvas');lc.width=lc.height=64;const lg=lc.getContext('2d');
const lgr=lg.createRadialGradient(32,32,0,32,32,32);lgr.addColorStop(0,'rgba(255,255,255,1)');lgr.addColorStop(.35,'rgba(255,255,255,.55)');lgr.addColorStop(1,'rgba(255,255,255,0)');
lg.fillStyle=lgr;lg.fillRect(0,0,64,64);
const NF=MOVIL?70:140, fgeo=new THREE.BufferGeometry(), fpos=new Float32Array(NF*3), fcol=new Float32Array(NF*3);
fgeo.setAttribute('position',new THREE.BufferAttribute(fpos,3)); fgeo.setAttribute('color',new THREE.BufferAttribute(fcol,3));
const fuego=new THREE.Points(fgeo,new THREE.PointsMaterial({size:.5,map:new THREE.CanvasTexture(lc),vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
fuego.frustumCulled=false; parrilla.add(fuego);
const fseeds=Array.from({length:NF},(_,i)=>({x:(hash(i,41)-.5)*2.6,z:(hash(i,42)-.5)*1.1,v:.55+hash(i,43)*.9,o:hash(i,44),w:hash(i,45)*6}));
// Llamas filmadas: 48 cuadros de Pexels 5659678 en una imagen (el decodificador de video se saturaba).
// Lo negro queda transparente.
const ATLAS_COLS=8, ATLAS_FILAS=6, ATLAS_CUADROS=48, ATLAS_FPS=16;
const fuegoTex=new THREE.Texture(); fuegoTex.minFilter=THREE.LinearFilter; fuegoTex.generateMipmaps=false;
const fuegoListo=new THREE.TextureLoader().loadAsync('img/fuego-atlas.jpg')
  .then(t=>{fuegoTex.image=t.image;fuegoTex.needsUpdate=true})
  .catch(err=>console.error('No cargó la imagen de las llamas:',err));
const llamas=new THREE.Mesh(new THREE.PlaneGeometry(3.3,1.86),new THREE.ShaderMaterial({
  uniforms:{map:{value:fuegoTex},opacity:{value:0},cuadro:{value:0}},transparent:true,depthWrite:false,
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  // opacidad = canal más brillante
  fragmentShader:'uniform sampler2D map;uniform float opacity;uniform float cuadro;varying vec2 vUv;vec3 celda(float f){float col=mod(f,8.),fila=floor(f/8.);return texture2D(map,vec2((col+vUv.x)/8.,(5.-fila+clamp(vUv.y,.004,.996))/6.)).rgb;}void main(){float f0=floor(cuadro);vec3 c=mix(celda(f0),celda(mod(f0+1.,48.)),fract(cuadro));float a=clamp(max(c.r,max(c.g,c.b))*2.3-.12,0.,1.);float borde=smoothstep(0.,.12,vUv.x)*smoothstep(1.,.88,vUv.x)*smoothstep(1.,.75,vUv.y);gl_FragColor=vec4(min(c*1.2,1.),a*borde*opacity);}'}));
llamas.position.set(0,-.3,.05); parrilla.add(llamas);
// Segunda capa en espejo
const llamas2=new THREE.Mesh(llamas.geometry,llamas.material); llamas2.position.set(.25,-.3,-.25); parrilla.add(llamas2);
const fuegoLuz=new THREE.PointLight(0xff7a2a,0,9); fuegoLuz.position.set(0,-.4,.5); parrilla.add(fuegoLuz);
const amarillo=new THREE.Color(1,.82,.38), naranja=new THREE.Color(1,.36,.06), rojo=new THREE.Color(.35,.04,0), cf=new THREE.Color();
let camaVisible=-1;
function actualizarParrilla(fuerza,cantidad){
  // brasas acumuladas
  const n=Math.round(cantidad*NCAMA);
  if(n!==camaVisible){camaVisible=n;
    for(let i=0;i<NCAMA;i++){const c=camaSeeds[i];tmp.position.set(c.x,c.y,c.z);tmp.rotation.set(c.r[0],c.r[1],c.r[2]);tmp.scale.setScalar(i<n?c.s:0);tmp.updateMatrix();cama.setMatrixAt(i,tmp.matrix)}
    cama.instanceMatrix.needsUpdate=true}
  brillo.material.color.setScalar(Math.min(1.3,cantidad*1.1+fuerza*.25));
  // llamas
  const alto=1.4+fuerza*3;
  for(let i=0;i<NF;i++){const f=fseeds[i],vida=(clock*f.v*.55+f.o)%1,k=i*3;
    if(fuerza<=.001){fcol[k]=fcol[k+1]=fcol[k+2]=0;continue}
    const ab=1-vida*.55;
    fpos[k]=f.x*ab+Math.sin(clock*3.2+f.w)*.09*vida; fpos[k+1]=-1.32+vida*alto; fpos[k+2]=f.z*ab;
    if(vida<.35)cf.copy(amarillo).lerp(naranja,vida/.35);else cf.copy(naranja).lerp(rojo,(vida-.35)/.65);
    const e=Math.min(1,fuerza)*(1-vida)*.9; fcol[k]=cf.r*e; fcol[k+1]=cf.g*e; fcol[k+2]=cf.b*e}
  fgeo.attributes.position.needsUpdate=true; fgeo.attributes.color.needsUpdate=true;
  fuego.material.size=.12+fuerza*.08;
  // llamas filmadas: crecen desde la rejilla; el video solo corre cuando hay fuego
  const fz=Math.min(1.6,fuerza);
  llamas.scale.set(.92+fz*.12,.22+fz*.8,1); llamas.position.y=-1.28+.93*llamas.scale.y;
  llamas2.scale.set(-(.85+fz*.1),.18+fz*.65,1); llamas2.position.y=-1.28+.93*llamas2.scale.y;
  llamas.material.uniforms.opacity.value=Math.min(1,fz*1.25);
  llamas.visible=llamas2.visible=fz>.01;  // invisibles no se dibujan
  llamas.material.uniforms.cuadro.value=(clock*ATLAS_FPS)%ATLAS_CUADROS;
  fuegoLuz.intensity=Math.min(1.4,fuerza)*(7+Math.sin(clock*17)*1.2+Math.sin(clock*7.3)*1.6);
}
root.add(carafe);
// Hilo de chispas
const NS=40, drops=new THREE.InstancedMesh(new THREE.SphereGeometry(1,16,12),new THREE.MeshBasicMaterial({color:0xff8a2a}),NS); root.add(drops);
// Anillo
const ripple=new THREE.Mesh(new THREE.RingGeometry(.9,1,64),new THREE.MeshBasicMaterial({color:0xff9a4a,transparent:true,opacity:0}));
ripple.rotation.x=-Math.PI/2; carafe.add(ripple);
// Sombra de contacto
const cs=document.createElement('canvas');cs.width=cs.height=128;const cg=cs.getContext('2d');const gr=cg.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(40,25,15,.45)');gr.addColorStop(1,'rgba(40,25,15,0)');cg.fillStyle=gr;cg.fillRect(0,0,128,128);
const contact=new THREE.Mesh(new THREE.PlaneGeometry(3.2,3.2),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cs),transparent:true,depthWrite:false}));
contact.rotation.x=-Math.PI/2; contact.position.y=-2.44; carafe.add(contact);


/* ----- Soplar las brasas ----- */
let soplo=0, soplando=false, audio=null;
const NCH=MOVIL?80:160, chgeo=new THREE.BufferGeometry(), chpos=new Float32Array(NCH*3), chcol=new Float32Array(NCH*3);
chgeo.setAttribute('position',new THREE.BufferAttribute(chpos,3)); chgeo.setAttribute('color',new THREE.BufferAttribute(chcol,3));
const chispas=new THREE.Points(chgeo,new THREE.PointsMaterial({size:.17,map:fuego.material.map,vertexColors:true,transparent:true,depthWrite:false,alphaTest:.05,toneMapped:false}));
chispas.frustumCulled=false; root.add(chispas);
const chseeds=Array.from({length:NCH},(_,i)=>({a:hash(i,51)*6.28,r:.3+hash(i,52)*.7,v:.6+hash(i,53),o:hash(i,54)}));
// Chisporroteo generado (sin archivo de audio)
function crearAudio(){
  const AC=window.AudioContext||window.webkitAudioContext; if(!AC)return null;
  const ctx=new AC(), buf=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate), d=buf.getChannelData(0);
  for(let i=0;i<d.length;i++){d[i]=Math.random()<.0025?(Math.random()*2-1):(Math.random()*2-1)*.04}
  const src=ctx.createBufferSource(); src.buffer=buf; src.loop=true;
  const filtro=ctx.createBiquadFilter(); filtro.type='bandpass'; filtro.frequency.value=2400; filtro.Q.value=.7;
  const vol=ctx.createGain(); vol.gain.value=0; src.connect(filtro).connect(vol).connect(ctx.destination); src.start();
  return {ctx,vol};
}
canvas.addEventListener('pointerdown',()=>{soplando=true; if(!audio)audio=crearAudio(); if(audio&&audio.ctx.state==='suspended')audio.ctx.resume()});
['pointerup','pointercancel','pointerleave'].forEach(ev=>canvas.addEventListener(ev,()=>{soplando=false}));
const cAviva=new THREE.Color(1,.55,.15);
function actualizarSoplo(dt){
  soplo+=((soplando?1:0)-soplo)*Math.min(1,dt*(soplando?3:2));
  if(audio)audio.vol.gain.setTargetAtTime(soplo*.22,audio.ctx.currentTime,.08);
  beanMat.emissive.setRGB(.075*soplo,.014*soplo,.002*soplo);
  const b=bean.position;
  for(let i=0;i<NCH;i++){const c=chseeds[i],vida=(clock*c.v+c.o)%1,k=i*3;
    chpos[k]=b.x+Math.cos(c.a+vida*2)*c.r*(.6+vida); chpos[k+1]=b.y-.7+vida*1.5; chpos[k+2]=Math.sin(c.a)*c.r*.5;
    // fondo claro: color sólido
    const e=soplo*(1-vida); if(e<.12)chpos[k+1]=-99;
    chcol[k]=1; chcol[k+1]=.28+.35*(1-vida); chcol[k+2]=.02}
  chgeo.attributes.position.needsUpdate=true; chgeo.attributes.color.needsUpdate=true;
}
/* ----- Interacción ----- */
let mouse={x:0,y:0},tm={x:0,y:0},spin=0,dragging=false,lastX=0;
canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();tm.x=(e.clientX-r.left)/r.width*2-1;tm.y=(e.clientY-r.top)/r.height*2-1;
  if(dragging){spin+=(e.clientX-lastX)*.012;lastX=e.clientX}});
canvas.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointerup',()=>dragging=false);
canvas.addEventListener('dblclick',()=>{spin+=Math.PI*2});

/* ----- Línea de tiempo ----- */
const seg=(p,a,b)=>clamp((p-a)/(b-a)), ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2, back=t=>{const c=1.7;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2)};
const dm=new THREE.Object3D(); let progress=0,clock=0,baseZ=12,spinV=0,rot=0;
function layout(){const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
  root.position.x=w>900?.9:0;baseZ=w/h<1?19:12}
function frame(dt){
  clock+=dt; const p=progress;
  mouse.x+=(tm.x-mouse.x)*.06; mouse.y+=(tm.y-mouse.y)*.06;
  const crack=seg(p,.14,.2), split=back(seg(p,.18,.46)), fall=seg(p,.3,.92), fill=ease(seg(p,.48,1)), pour=seg(p,.7,.97);
  // temblor antes de partirse
  const shake=crack*(1-seg(p,.2,.22))*.04;
  spinV+=(spin-spinV)*.08; rot+=dt*.35*(1-clamp(split));
  bean.position.set(Math.sin(clock*40)*shake,1.55+Math.sin(clock*1.2)*.06,0);
  bean.rotation.set(-.25+split*.1+mouse.y*.25,rot+spinV+split*.25+mouse.x*.45,(1-split)*-.35);
  bean.scale.setScalar(.85-clamp(split)*.2);
  halfL.position.x=-split*.95; halfR.position.x=split*.95; halfL.position.y=halfR.position.y=split*.08;
  halfL.rotation.set(0,split*.9,split*.55); halfR.rotation.set(0,-split*.9,-split*.55);
  actualizarSoplo(dt);
  warm.intensity=clamp(split)*2.2+soplo*(5+Math.sin(clock*23)*1.2); warm.position.set(0,1.4,1.2);
  bean.scale.multiplyScalar(1+soplo*.03*Math.sin(clock*9));
  // trozos de fondo
  amb.forEach((g,i)=>{const u=g.userData;g.position.set(u.x+Math.sin(clock*u.sp+i)*.3,u.y+Math.cos(clock*u.sp*.8+i)*.25-p*1.5,u.z);g.rotation.set(u.r+clock*u.sp,u.r*2+clock*u.sp*.7,0)});
  // jarra
  const show=ease(seg(p,.2,.42));
  carafe.position.set(0,-.55-(1-show)*2.4,0); carafe.scale.setScalar(.72); carafe.visible=show>.001;
  // trozos que caen (solo mientras caen)
  const y0=bean.position.y-.2, yb=carafe.position.y+(-1.25)*.72;
  const cayendo=fall>0&&fill<.96;
  if(cayendo||minis.userData.activo){minis.userData.activo=cayendo;
  for(let i=0;i<N;i++){const s=seeds[i],t=clamp((fall-s.t)/.42);
    if(t<=0||t>=1||fill>.96)dm.scale.setScalar(0);
    else{dm.position.set(s.x*(1-t*.65),y0+(yb-y0)*t*t,s.z);dm.rotation.set(s.r[0]+t*s.w,s.r[1]+t*s.w,s.r[2]);dm.scale.setScalar(s.s*(t>.92?(1-t)/.08:Math.min(1,t*8)))}
    dm.updateMatrix();minis.setMatrixAt(i,dm.matrix)}
  minis.instanceMatrix.needsUpdate=true;}
  const molido=fall>.25&&fill<.9;
  if(molido||grounds.userData.activo){grounds.userData.activo=molido;
  for(let i=0;i<NG;i++){const s=gseeds[i],t=clamp((fall-s.t)/.3);
    if(t<=0||t>=1||fill>.9)dm.scale.setScalar(0);
    else{dm.position.set(s.x*(1+Math.sin(t*6+i)*.3),y0-.2+(yb-y0+.2)*t*t,s.z);dm.rotation.set(t*9+i,i,t*5);dm.scale.setScalar(s.s)}
    dm.updateMatrix();grounds.setMatrixAt(i,dm.matrix)}
  grounds.instanceMatrix.needsUpdate=true;}
  // brasas
  const h=LO+(HI-LO)*fill;
  setLevel(h); liquid.visible=false;
  const rr=radiusAt(h);
  crema.position.y=h+.003; crema.scale.setScalar(rr); crema.visible=false;
  crema.rotation.z=clock*.3+p*4;
  for(let i=0;i<NB;i++){const b=bseed[i];dm.position.set(Math.cos(b.a+clock*.2)*b.r*rr,h+.01,Math.sin(b.a+clock*.2)*b.r*rr);dm.scale.setScalar(0);dm.rotation.set(0,0,0);dm.updateMatrix();bubbles.setMatrixAt(i,dm.matrix)}
  bubbles.instanceMatrix.needsUpdate=true;
  contact.material.opacity=show;

  const top=bean.position.y-1.0, bot=carafe.position.y+crema.position.y*.72, on=false;
  for(let i=0;i<NS;i++){const f=((i/NS)+clock*1.6)%1;
    if(!on)dm.scale.setScalar(0);else{dm.position.set(Math.sin(f*9+i)*.01,top+(bot-top)*f*f,0);dm.scale.set(.035,.035*(1+f*2.2),.035)}
    dm.rotation.set(0,0,0);dm.updateMatrix();drops.setMatrixAt(i,dm.matrix)}
  drops.instanceMatrix.needsUpdate=true;
  const rp=(clock*1.4)%1; ripple.position.y=crema.position.y+.006; ripple.scale.setScalar(.15+rp*.8*rr); ripple.material.opacity=0;
  // fuego
  const aviva=seg(p,.86,1); actualizarParrilla(fill*.9+aviva*1.6,fill); llamarada.style.opacity=(aviva*.85).toFixed(3);
  // cámara
  camera.position.set(Math.sin(clock*.2)*.25+mouse.x*.35,.1-mouse.y*.25,baseZ+1.5-clamp(split)*.6);
  camera.lookAt(0,-.1,0);
  renderer.render(scene,camera);
}
function measure(){const r=chapter.getBoundingClientRect();progress=clamp(-r.top/(chapter.offsetHeight-innerHeight))}
addEventListener('resize',layout); layout();

// Solo dibuja en pantalla y con la pestaña visible
let enPantalla=true;
new IntersectionObserver(([e])=>{enPantalla=e.isIntersecting},{rootMargin:'100px'}).observe(chapter);
const quieto=matchMedia('(prefers-reduced-motion: reduce)').matches;

// Compilar materiales durante la carga y no a mitad del scroll
async function preparar(){
  await fuegoListo;
  progress=.8; frame(1/60);
  try{ if(renderer.compileAsync) await renderer.compileAsync(scene,camera); else renderer.compile(scene,camera); }
  catch(err){ console.warn('No se pudo precompilar la escena 3D',err); }
  progress=.5; frame(1/60); progress=0; frame(1/60);
}
preparar().finally(()=>window.__gl3dOk&&window.__gl3dOk());

let last=performance.now(), proximo=0;
renderer.setAnimationLoop(now=>{
  if(!enPantalla||document.hidden){last=now;return}
  // Teléfono: ~30 cuadros por segundo para dejar libre el scroll
  if(MOVIL&&now<proximo)return; proximo=now+31;
  const dt=Math.min((now-last)/1000,.05);last=now;
  measure();
  if(quieto){frame(0);return}
  frame(dt)});
window.__frame=()=>{measure();frame(1/24)};
