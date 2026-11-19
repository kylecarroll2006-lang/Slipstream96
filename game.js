(function(){
'use strict';
const D=window.SS_DATA;
const {RACERS,TYPES,TYPE_LABEL,TYPE_COLOR,TRACKS,THEMES}=D;
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const angDiff=(a,b)=>{let d=a-b;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;return d;};
const fmt=t=>{if(t==null)return'--:--.--';const m=Math.floor(t/60),s=t-m*60;return m+':'+(s<10?'0':'')+s.toFixed(2);};
const ord=n=>n+(['th','st','nd','rd'][(n%100>10&&n%100<14)?0:(n%10<4?n%10:0)]||'th');
const hex=v=>'#'+v.toString(16).padStart(6,'0');
const money=n=>'$'+Math.round(n).toLocaleString('en-US');
const isTouch=('ontouchstart' in window)||matchMedia('(pointer: coarse)').matches;
const SPEED_CAP=235/2.3;// hard ceiling: 235 km/h on the speedometer
let HW=11,WALL=HW+5.3,inTun=new Uint8Array(1),HG=[],BK=[],groundH=()=>0,distOther=()=>1e9;
const roadFree=(x,z,r,i)=>distOther(x,z,i==null?-1:i)>HW+7.5+(r||0);

// ================= save =================
const DEF={money:1500,up:{},rec:{},gp:{},v:2,set:{laps:4,diff:1,sound:true,cam:0,racers:6,tags:true},sel:{r:0,t:0,track:0,cup:0}};
function load(){let s=null;try{s=JSON.parse(localStorage.getItem('ss96_save2')||'null');}catch(e){}
  const b=JSON.parse(JSON.stringify(DEF));if(!s)return b;
  for(const k in b){if(s[k]!==undefined)b[k]=(typeof b[k]==='object'&&!Array.isArray(b[k]))?Object.assign(b[k],s[k]):s[k];}return b;}
let SV=load();
if(SV.set.racers==null)SV.set.racers=6;if(SV.set.tags==null)SV.set.tags=true;
if(!SV.v||SV.v<2){if(SV.set.laps===3)SV.set.laps=4;SV.rec={};SV.v=2;}// v2: bigger tracks, slower cars — old lap records no longer comparable
function save(){try{localStorage.setItem('ss96_save2',JSON.stringify(SV));}catch(e){}}
function up(id){return SV.up[id]||(SV.up[id]={eng:0,tur:0,tir:0,nit:0});}
const NOUP={eng:0,tur:0,tir:0,nit:0};
const carId=(r,t)=>r*4+TYPES.indexOf(t);
function carInfo(id){return D.carDef(Math.floor(id/4),TYPES[id%4]);}
// stat -> physics. Every car has 18 points, so every car is competitive.
function specFrom(c,u){return {top:(61+c.spd*1.52)*(1+u.eng*.015),acc:(20+c.acc*2.1)*(1+u.tur*.05),turn:1.7+c.drf*.02+u.tir*.025,
  driftGain:(.55+c.drf*.1)*(1+u.tir*.05),driftTurn:1+c.drf*.035,scrub:.055-c.drf*.004,drain:.38*(1-u.nit*.07),bpow:1.15+u.nit*.01};}
function spec(id,noUp){const c=carInfo(id);return Object.assign({id,c},specFrom(c,noUp?NOUP:up(id)));}
function looks(id){const c=carInfo(id),R=RACERS[c.racer],u=up(id);
  return {type:c.type,racer:c.racer,body:u.paint??R.body,accent:u.accent??R.accent,rim:u.rim??R.rim,spoiler:u.spoiler??R.spoiler,stripe:u.stripe??R.stripe,
    hood:u.hood??0,kit:u.kit??0,wheel:u.wheel??0,tone:u.tone??0,num:u.num??0,glow:u.glow??null,tint:u.tint??null,lights:u.lights??null,slip:u.slip??null};}

// ================= renderer & bright skies =================
const renderer=new THREE.WebGLRenderer({canvas:$('c'),antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(68,1,.5,3600);
const hemi=new THREE.HemisphereLight(0xffffff,0x556633,1);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff2dd,.85);sun.position.set(150,250,80);scene.add(sun);
function skyDome(top,mid,bot,r){const g=new THREE.SphereGeometry(r,24,16),c=[],pa=g.attributes.position;const T=new THREE.Color(top),M=new THREE.Color(mid),B=new THREE.Color(bot),tmp=new THREE.Color();
  for(let i=0;i<pa.count;i++){const y=pa.getY(i)/r;if(y>.12)tmp.copy(M).lerp(T,Math.min(1,(y-.12)/.55));else tmp.copy(B).lerp(M,clamp((y+.05)/.17,0,1));c.push(tmp.r,tmp.g,tmp.b);}
  g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));
  const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide,fog:false,depthWrite:false}));m.renderOrder=-1;m.userData.keep=false;return m;}
// showroom: bright sunny stage
const show=new THREE.Scene();
show.add(new THREE.HemisphereLight(0xffffff,0x8a5ab0,1.05));
{const k=new THREE.DirectionalLight(0xffffff,.8);k.position.set(5,10,7);show.add(k);const r1=new THREE.DirectionalLight(0x29d4ff,.45);r1.position.set(-7,4,-8);show.add(r1);
 const r2=new THREE.DirectionalLight(0xff4fa3,.4);r2.position.set(8,3,-6);show.add(r2);
 show.add(skyDome(0x2fb6ff,0xffd36b,0xff7aa8,200));
 const fl=new THREE.Mesh(new THREE.CircleGeometry(160,40),new THREE.MeshLambertMaterial({color:0xff9f5a}));fl.rotation.x=-Math.PI/2;fl.position.y=-.41;show.add(fl);
 const pf=new THREE.Mesh(new THREE.CylinderGeometry(7,7.5,.4,40),new THREE.MeshLambertMaterial({color:0x3a2a7a}));pf.position.y=-.2;show.add(pf);
 const ring=new THREE.Mesh(new THREE.RingGeometry(6.8,7.2,48),new THREE.MeshBasicMaterial({color:0xffe14d}));ring.rotation.x=-Math.PI/2;ring.position.y=.01;show.add(ring);
 for(let i=0;i<16;i++){const a=i/16*Math.PI*2,h=6+((i*7)%5)*3;const b=new THREE.Mesh(new THREE.BoxGeometry(3,h,3),new THREE.MeshLambertMaterial({color:[0xff4fa3,0x29d4ff,0xffe14d,0x7d4dff][i%4]}));
   b.position.set(Math.cos(a)*40,h/2-.4,Math.sin(a)*40);show.add(b);}
 for(let i=0;i<18;i++){const a=i/18*Math.PI*2,m=new THREE.Mesh(new THREE.ConeGeometry(20+(i%3)*8,30+(i%4)*14,5),new THREE.MeshPhongMaterial({color:0x9a6fd0,flatShading:true,shininess:0}));
   m.position.set(Math.cos(a)*120,10,Math.sin(a)*120);show.add(m);}}
let showCar=null,showFig=null,showKey='';const showStreaks=makeStreaksLazy();
function setShowCar(id,withRacer=true){const L=looks(id),r=Math.floor(id/4),key=id+JSON.stringify(L)+withRacer;if(key===showKey)return;showKey=key;
  if(showCar)show.remove(showCar);showCar=makeCar(L);showCar.rotation.y=.55;showCar.position.x=withRacer?.9:0;show.add(showCar);
  if(showFig)show.remove(showFig);showFig=null;if(withRacer){showFig=makeChar(r);showFig.position.set(-2.6,0,1.6);showFig.rotation.y=.35;show.add(showFig);}}
function makeStreaksLazy(){let x=null;return{get(){if(!x){x=makeStreaks(34);show.add(x.g);}return x;}};}
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();$('rotate').classList.toggle('hidden',!(isTouch&&innerHeight>innerWidth));}
addEventListener('resize',resize);

// ================= models =================
const phong=(c,sh,sp)=>new THREE.MeshPhongMaterial({color:c,shininess:sh,specular:sp,flatShading:true});
function facesToGeos(faces){const by={};
  for(const f of faces){const a=by[f.c]||(by[f.c]={p:[],n:[]}),v=f.v;for(let i=1;i<v.length-1;i++)for(const q of[v[0],v[i],v[i+1]]){a.p.push(q[0],q[1],q[2]);a.n.push(f.n[0],f.n[1],f.n[2]);}}
  const g={};for(const c in by){const b=new THREE.BufferGeometry();b.setAttribute('position',new THREE.Float32BufferAttribute(by[c].p,3));b.setAttribute('normal',new THREE.Float32BufferAttribute(by[c].n,3));g[c]=b;}return g;}
const carCache={},charCache={};
let shadowTex=null;
function shadowMesh(w,l){if(!shadowTex){const cv=document.createElement('canvas');cv.width=cv.height=64;const g=cv.getContext('2d');const gr=g.createRadialGradient(32,32,4,32,32,32);
  gr.addColorStop(0,'rgba(0,0,0,.55)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);shadowTex=new THREE.CanvasTexture(cv);}
  const m=new THREE.Mesh(new THREE.PlaneGeometry(w,l),new THREE.MeshBasicMaterial({map:shadowTex,transparent:true,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.y=.03;m.userData.keep=true;return m;}
function makeCar(L){
  const ex={hood:L.hood||0,kit:L.kit||0,wheel:L.wheel||0,tone:L.tone||0},k=L.type+L.spoiler+'/'+L.stripe+JSON.stringify(ex),
    C=carCache[k]||(carCache[k]=(()=>{const f=D.carFaces(L.type,L.spoiler,L.stripe,ex);return{g:facesToGeos(f.faces),rearZ:f.rearZ,frontZ:f.frontZ};})());
  const M={body:phong(L.body,70,0x555555),accent:phong(L.accent,70,0x555555),rim:phong(L.rim,90,0x999999),dark:phong(0x1c1e26,10,0x111111),glass:phong(L.tint??0x16243d,120,0xbbbbbb),
    chrome:phong(0xd8d8d8,100,0xaaaaaa),tire:phong(0x141518,5,0),head:new THREE.MeshBasicMaterial({color:L.lights??0xfffbe0}),tail:new THREE.MeshBasicMaterial({color:0xff2030})};
  const g=new THREE.Group();for(const c in C.g){const m=new THREE.Mesh(C.g[c],M[c]);m.userData.keep=true;g.add(m);}
  g.add(shadowMesh(3.6,6.6));
  if(L.glow!=null){const gl=new THREE.Mesh(new THREE.PlaneGeometry(3.4,6.2),new THREE.MeshBasicMaterial({map:glowTex(),color:L.glow,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
    gl.rotation.x=-Math.PI/2;gl.position.y=.06;gl.userData.keep=true;g.add(gl);}
  if(L.num){const W=D.PROF[L.type].W,nm=new THREE.MeshBasicMaterial({map:numTex(D.NUMBERS[L.racer]||1),transparent:true}),pg=numGeo();
    for(const s of[-1,1]){const p=new THREE.Mesh(pg,nm);p.position.set(s*(W/2+.03),.6,-.1);p.rotation.y=s*Math.PI/2;p.userData.keep=true;g.add(p);}
    if(L.num===2){const p=new THREE.Mesh(pg,nm);p.rotation.x=-Math.PI/2+.28;p.rotation.z=Math.PI;p.position.set(0,.95,(C.frontZ||2.4)-1.15);p.scale.setScalar(.85);p.userData.keep=true;g.add(p);}}
  const fg=carCache.fl||(carCache.fl=(()=>{const x=new THREE.ConeGeometry(.3,1.6,6);x.rotateX(-Math.PI/2);return x;})());
  const fm=new THREE.MeshBasicMaterial({color:0xffaa22}),flames=[];
  for(const s of[-.45,.45]){const f=new THREE.Mesh(fg,fm);f.position.set(s,.33,C.rearZ-.85);f.visible=false;f.userData.keep=true;g.add(f);flames.push(f);}
  g.rotation.order='YXZ';g.userData={flames,bodyMat:M.body,keepAll:true};return g;
}
let _gt=null,_ng=null;const _nt={};
function glowTex(){if(_gt)return _gt;const cv=document.createElement('canvas');cv.width=cv.height=64;const x=cv.getContext('2d'),gr=x.createRadialGradient(32,32,6,32,32,32);
  gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=gr;x.fillRect(0,0,64,64);return _gt=new THREE.CanvasTexture(cv);}
function numGeo(){return _ng||(_ng=new THREE.PlaneGeometry(.95,.95));}
function numTex(n){if(_nt[n])return _nt[n];const cv=document.createElement('canvas');cv.width=cv.height=128;const x=cv.getContext('2d');
  x.fillStyle='#fff';x.beginPath();x.arc(64,64,60,0,7);x.fill();x.lineWidth=7;x.strokeStyle='#111';x.stroke();x.fillStyle='#111';x.font='bold 74px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(n,64,70);
  return _nt[n]=new THREE.CanvasTexture(cv);}
function makeChar(r){const C=D.CHARS[r],R=RACERS[r];const geos=charCache[r]||(charCache[r]=facesToGeos(D.charFaces(r)));
  const M={body:phong(R.body,40,0x333333),accent:phong(R.accent,40,0x333333),dark:phong(0x1c1e26,10,0x111111),skin:phong(C.skin,8,0x111111),
    hair:phong(C.hair,20,0x222222),hair2:phong(C.hair2??C.hair,20,0x222222),white:phong(0xf4f4f4,20,0x222222),lens:phong(0x5ac8ff,120,0xffffff)};
  const g=new THREE.Group();for(const c in geos){const m=new THREE.Mesh(geos[c],M[c]);m.userData.keep=true;g.add(m);}g.add(shadowMesh(1.4,1.2));return g;}

// thumbnails (pictures on the select cards)
let thumbR=null,thumbScene=null,thumbCam=null;const thumbCache={};
function thumbSetup(){if(thumbR)return true;try{const cv=document.createElement('canvas');cv.width=320;cv.height=180;
  thumbR=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true,preserveDrawingBuffer:true});thumbScene=new THREE.Scene();
  thumbScene.add(new THREE.HemisphereLight(0xffffff,0x8a5ab0,1.05));const k=new THREE.DirectionalLight(0xffffff,.8);k.position.set(5,10,7);thumbScene.add(k);
  const r1=new THREE.DirectionalLight(0x29d4ff,.4);r1.position.set(-7,4,-8);thumbScene.add(r1);thumbCam=new THREE.PerspectiveCamera(30,16/9,.5,100);return true;}catch(e){thumbR=null;return false;}}
function snap(obj,pos,look){try{if(!thumbSetup())return'';thumbScene.add(obj);thumbCam.position.set(...pos);thumbCam.lookAt(...look);thumbR.render(thumbScene,thumbCam);
  const u=thumbR.domElement.toDataURL();thumbScene.remove(obj);return typeof u==='string'?u:'';}catch(e){return'';}}
function carThumb(id){const L=looks(id),k='c'+JSON.stringify(L);return thumbCache[k]??(thumbCache[k]=snap(makeCar(L),[7.6,3.6,9],[0,.7,.2]));}
function racerThumb(r){const k='r'+r;return thumbCache[k]??(thumbCache[k]=snap(makeChar(r),[1.2,2.3,3.6],[0,1.85,0]));}

// ================= track =================
let TI=0,TH,world=null,P=[],T=[],R=[],N=0,bb={},curvA=[],gantry=[],spinners=[];
function pushQuad(a,A,B,C,D2){a.push(A.x,A.y,A.z,B.x,B.y,B.z,C.x,C.y,C.z,B.x,B.y,B.z,D2.x,D2.y,D2.z,C.x,C.y,C.z);}
function pushCol(a,c,n){for(let i=0;i<n;i++)a.push(c.r,c.g,c.b);}
const texCache={};
function canvasTex(key,w,h,draw){if(texCache[key])return texCache[key];const cv=document.createElement('canvas');cv.width=w;cv.height=h;draw(cv.getContext('2d'),w,h);const t=new THREE.CanvasTexture(cv);t.userData={keep:true};return texCache[key]=t;}
const SPONSORS=[['TURBOFIZZ','#ff2d6b','#fff36b'],['NITRO NOODLES','#29d4ff','#2a0a4a'],['VELOCITY OIL','#ffd23f','#c4122f'],['O CARROLL CORP','#2a0a4a','#7dffb0'],
  ['RAD RADIALS','#111','#ff7a1a'],['SUNNY COLA','#ff7a1a','#fff'],['SLIPSTREAM \'96','#7d4dff','#fff36b'],['HYPER GUM','#7dffb0','#2a0a4a']];
function sponsorTex(i){const s=SPONSORS[i%SPONSORS.length];return canvasTex('sp'+i,512,128,(g,w,h)=>{g.fillStyle=s[1];g.fillRect(0,0,w,h);g.fillStyle=s[2];g.fillRect(0,0,w,10);g.fillRect(0,h-10,w,10);
  g.font='italic bold 62px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillStyle='rgba(0,0,0,.25)';g.fillText(s[0],w/2+4,h/2+5);g.fillStyle=s[2];g.fillText(s[0],w/2,h/2+2);});}
function chevTex(right){return canvasTex('chev'+right,256,128,(g,w,h)=>{g.fillStyle='#ffd23f';g.fillRect(0,0,w,h);g.fillStyle='#111';
  for(let i=0;i<3;i++){const x=40+i*70;g.beginPath();if(right){g.moveTo(x,10);g.lineTo(x+40,64);g.lineTo(x,118);g.lineTo(x+22,118);g.lineTo(x+62,64);g.lineTo(x+22,10);}
    else{g.moveTo(x+62,10);g.lineTo(x+22,64);g.lineTo(x+62,118);g.lineTo(x+40,118);g.lineTo(x,64);g.lineTo(x+40,10);}g.fill();}});}
const VEG={
  pine:{g:()=>new THREE.ConeGeometry(3.2,8,6),y:6.4,trunk:1},cactus:{g:()=>new THREE.CylinderGeometry(1.1,1.3,7,6),y:3.5,trunk:0},
  palm:{g:()=>new THREE.ConeGeometry(4.6,1.8,7),y:9.6,trunk:2},round:{g:()=>new THREE.IcosahedronGeometry(3.6,0),y:5.6,trunk:1},
  rock:{g:()=>new THREE.DodecahedronGeometry(3.2,0),y:1.6,trunk:0},building:{g:()=>new THREE.BoxGeometry(1,1,1),y:0,trunk:0}};
const RUNOFF=[0xf2dfa8,0x8fbf5a,0xf0c890,0xf6fbff,0x30304a,0xd9b06a,0x55433e,0xf2e2b0,0xe0a070,0x9fd76a];
const SKY3=[[0x3aa8ff,0xffc48a,0xff8a6b],[0x2f9cff,0xbfe8ff,0xe8fbff],[0x5a7aff,0xff9fb8,0xffb07a],[0x5ab0ff,0xd8ecff,0xffffff],[0x05051a,0x2a1050,0x7a2a8a],
  [0x58a8ff,0xffe0a8,0xffb070],[0x3a1010,0x9a3020,0xff7a3a],[0x1aa8ff,0x9ff0ff,0xe8ffff],[0x4aa0ff,0xffd0a0,0xff9a6a],[0x2aa0ff,0xc0ecff,0xf0fff0]];
const TS=1.3;// all circuits scaled up 30% for longer laps
function trackSamples(ti){const td=TRACKS[ti];const S=D.resample(D.catmull(td.pts.map(p=>[p[0]*TS,p[1]*TS]),24),2);const k=Math.round(td.s0*S.length)%S.length;return S.slice(k).concat(S.slice(0,k));}
function disposeWorld(){if(!world)return;scene.remove(world);world.traverse(o=>{if(o.geometry&&!o.userData.keep)o.geometry.dispose();});}
function buildTrack(ti){
  TI=ti;const td=TRACKS[ti];TH=THEMES[td.theme];disposeWorld();clearSkids();world=new THREE.Group();scene.add(world);gantry=[];spinners=[];bobbers=[];
  HW=9.6+((ti*37)%5)*.75;WALL=HW+5.3;
  const sk=SKY3[td.theme];scene.background=new THREE.Color(sk[2]);scene.fog=new THREE.Fog(sk[2],TH.night?220:340,TH.night?1300:1700);
  world.add(skyDome(sk[0],sk[1],sk[2],2600));
  hemi.color.set(0xffffff);hemi.groundColor.set(TH.ground);hemi.intensity=TH.night?.6:1.0;sun.intensity=TH.night?.35:.85;sun.color.set(td.theme===6?0xffb080:0xfff2dd);
  const S=trackSamples(ti);N=S.length;P=[];T=[];R=[];
  for(let i=0;i<N;i++)P.push(new THREE.Vector3(S[i][0],0,S[i][1]));
  for(let i=0;i<N;i++){const a=P[(i-1+N)%N],b=P[(i+1)%N];const t=new THREE.Vector3(b.x-a.x,0,b.z-a.z).normalize();T.push(t);R.push(new THREE.Vector3(-t.z,0,t.x));}
  const hd=T.map(t=>Math.atan2(t.x,t.z));curvA=[];for(let i=0;i<N;i++)curvA.push(angDiff(hd[(i+10)%N],hd[(i-10+N)%N]));
  {let s2=ti*7717+3;const r2=()=>{s2=(s2*16807)%2147483647;return s2/2147483647;};
   const amp=ti%5===0?4:7+((ti*13)%7)*1.6,k1=1+Math.floor(r2()*2),k2=2+Math.floor(r2()*3),p1=r2()*6.28,p2=r2()*6.28;
   HG=[];for(let i=0;i<N;i++)HG.push(amp*(.6*Math.sin(6.2832*k1*i/N+p1)+.4*Math.sin(6.2832*k2*i/N+p2)));
   const mn=Math.min(...HG);for(let i=0;i<N;i++)HG[i]+=.6-mn;
   BK=[];for(let i=0;i<N;i++){let a=0;for(let k=-6;k<=6;k++)a+=curvA[(i+k+N)%N];BK.push(clamp(a/13*.24,-.12,.12));}}
  bb={minX:1e9,maxX:-1e9,minZ:1e9,maxZ:-1e9};
  P.forEach(p=>{bb.minX=Math.min(bb.minX,p.x);bb.maxX=Math.max(bb.maxX,p.x);bb.minZ=Math.min(bb.minZ,p.z);bb.maxZ=Math.max(bb.maxZ,p.z);});
  bb.cx=(bb.minX+bb.maxX)/2;bb.cz=(bb.minZ+bb.maxZ)/2;bb.r=Math.max(bb.maxX-bb.minX,bb.maxZ-bb.minZ)/2;bb.s=108/Math.max(bb.maxX-bb.minX,bb.maxZ-bb.minZ);
  // distance from (x,z) to the road centreline, ignoring the stretch of road near sample i (so trackside items can sit by their own section)
  distOther=(x,z,i)=>{let m=1e18;for(let k=0;k<N;k+=2){if(i>=0){let g=Math.abs(k-i);g=Math.min(g,N-g);if(g<35)continue;}const dx=P[k].x-x,dz=P[k].z-z,d=dx*dx+dz*dz;if(d<m)m=d;}return Math.sqrt(m);};
  let seed=ti*9973+7;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  // ---- unique features for this track: tunnels, a river crossing, an overpass ----
  const feat={tun:[],river:-1,over:-1},blockers=[];
  const nT=[0,1,1,2,1][ti%5];let tries=0;
  while(feat.tun.length<nT&&tries++<80){const len=38+Math.floor(rnd()*32),a=70+Math.floor(rnd()*Math.max(1,N-200-len)),b=a+len;
    if(feat.tun.some(t=>a<t[1]+50&&b>t[0]-50))continue;feat.tun.push([a,b]);}
  inTun=new Uint8Array(N);feat.tun.forEach(([a,b])=>{for(let i=a;i<=b;i++)inTun[i]=1;});
  const nearTun=(i,m)=>feat.tun.some(([a,b])=>i>=a-m&&i<=b+m);
  const okSpot=(i,m)=>!nearTun(i,m)&&Math.abs(curvA[i])<.3&&i>60&&i<N-60;
  if(ti%3===0)for(let k=0;k<60;k++){const i=Math.floor(rnd()*N);if(okSpot(i,45)){feat.river=i;break;}}
  const sideClear=(i,len)=>{for(const sg of[-1,1])for(let o=HW+8;o<=len;o+=6){if(!roadFree(P[i].x+R[i].x*sg*o,P[i].z+R[i].z*sg*o,0,i))return false;}return true;};
  if(nT===0||ti%4===2)for(let k=0;k<60;k++){const i=Math.floor(rnd()*N);if(okSpot(i,45)&&(feat.river<0||Math.abs(i-feat.river)>70)&&sideClear(i,HW+72)){feat.over=i;break;}}
  lastFeat=feat;
  if(feat.river>=0){const rv=feat.river;feat.rlen=[];for(const sg of[-1,1]){let o=HW+8;while(o<700&&roadFree(P[rv].x+R[rv].x*sg*o,P[rv].z+R[rv].z*sg*o,8,rv))o+=8;feat.rlen.push(Math.max(30,o-40));}}
  if(feat.river>=0){const rv=feat.river,need=Math.max(0,6-HG[rv]);for(let k=-60;k<=60;k++){const i=(rv+k+N)%N;HG[i]+=need*Math.exp(-(k*k)/(2*22*22));}}
  const busy=i=>inTun[i]||nearTun(i,8)||(feat.river>=0&&Math.abs(i-feat.river)<14)||(feat.over>=0&&Math.abs(i-feat.over)<8);
  const water=TH.veg==='palm';
  if(water){const isl=new THREE.Mesh(new THREE.CircleGeometry(bb.r+330,48),new THREE.MeshLambertMaterial({color:TH.ground}));isl.rotation.x=-Math.PI/2;isl.position.set(bb.cx,0,bb.cz);world.add(isl);
    const beach=new THREE.Mesh(new THREE.RingGeometry(bb.r+330,bb.r+370,48),new THREE.MeshLambertMaterial({color:0xf6e2a8}));beach.rotation.x=-Math.PI/2;beach.position.set(bb.cx,.01,bb.cz);world.add(beach);
    const wa=new THREE.Mesh(new THREE.PlaneGeometry(8000,8000),new THREE.MeshPhongMaterial({color:0x1ec8e8,shininess:90,specular:0xffffff}));wa.rotation.x=-Math.PI/2;wa.position.y=-.3;world.add(wa);}
  else{const gnd=new THREE.Mesh(new THREE.PlaneGeometry(8000,8000),new THREE.MeshLambertMaterial({color:TH.ground}));gnd.rotation.x=-Math.PI/2;gnd.position.y=-.95;world.add(gnd);}
  {const rv=feat.river;groundH=(x,z)=>{let bi=0,bd=1e18;for(let i=0;i<N;i+=3){const dx=P[i].x-x,dz=P[i].z-z,d=dx*dx+dz*dz;if(d<bd){bd=d;bi=i;}}
      const d=Math.sqrt(bd),lat=(x-P[bi].x)*R[bi].x+(z-P[bi].z)*R[bi].z,road=HG[bi]+clamp(lat,-(HW+7),HW+7)*BK[bi]-.45;
      const f=1-clamp((d-(HW+9))/150,0,1),ff=f*f*(3-2*f);
      let far=water?(Math.hypot(x-bb.cx,z-bb.cz)<bb.r+330?.5:-4):-.9;let h=far+(road-far)*ff;
      if(rv>=0){const q=Math.abs((x-P[rv].x)*T[rv].x+(z-P[rv].z)*T[rv].z),al=(x-P[rv].x)*R[rv].x+(z-P[rv].z)*R[rv].z,lim=al<0?feat.rlen[0]:feat.rlen[1];
        const end=clamp((Math.abs(al)-lim)/30,0,1),w=Math.max(end,clamp((q-17)/22,0,1));h=-1.6+(h+1.6)*w;}
      return h;};
   const SZ=2*(bb.r+(water?420:520)),SEG=110,tg=new THREE.PlaneGeometry(SZ,SZ,SEG,SEG);tg.rotateX(-Math.PI/2);const pa=tg.attributes.position;
   for(let k=0;k<pa.count;k++){const x=pa.getX(k)+bb.cx,z=pa.getZ(k)+bb.cz;pa.setY(k,groundH(x,z));}
   tg.translate(bb.cx,0,bb.cz);tg.computeVertexNormals();
   world.add(new THREE.Mesh(tg,new THREE.MeshPhongMaterial({color:TH.ground,flatShading:true,shininess:0})));}
  const edge=(i,off,y)=>new THREE.Vector3(P[i].x+R[i].x*off,HG[i]+off*BK[i]+y,P[i].z+R[i].z*off);
  const road=[],line=[],curb=[],curbC=[],wall=[],wallC=[],run=[],grid=[];
  const red=new THREE.Color(0xe8283c),wht=new THREE.Color(0xffffff),w0=new THREE.Color(TH.wall[0]),w1=new THREE.Color(TH.wall[1]);
  for(let i=0;i<N;i++){const j=(i+1)%N;
    pushQuad(road,edge(i,-HW,.05),edge(i,HW,.05),edge(j,-HW,.05),edge(j,HW,.05));
    if(Math.floor(i/3)%2===0)pushQuad(line,edge(i,-.25,.07),edge(i,.25,.07),edge(j,-.25,.07),edge(j,.25,.07));
    for(const s of[-1,1]){pushQuad(line,edge(i,s*(HW-.9),.07),edge(i,s*(HW-.55),.07),edge(j,s*(HW-.9),.07),edge(j,s*(HW-.55),.07));
      pushQuad(run,edge(i,s*(HW+1.6),.04),edge(i,s*(HW+6.6),.04),edge(j,s*(HW+1.6),.04),edge(j,s*(HW+6.6),.04));}
    const corner=Math.abs(curvA[i])>.35,cc=Math.floor(i/(corner?1:2))%2?red:wht,wc=Math.floor(i/3)%2?w1:w0;
    for(const s of[-1,1]){const cw=corner?2.2:1.6;pushQuad(curb,edge(i,s*HW,.08),edge(i,s*(HW+cw),.08),edge(j,s*HW,.08),edge(j,s*(HW+cw),.08));pushCol(curbC,cc,6);
      const o=s*(HW+6.5);pushQuad(wall,edge(i,o,-2.5),edge(i,o,1.4),edge(j,o,-2.5),edge(j,o,1.4));pushCol(wallC,wc,6);
      pushQuad(wall,edge(i,o,1.4),edge(i,o+s*.5,1.4),edge(j,o,1.4),edge(j,o+s*.5,1.4));pushCol(wallC,wc,6);}
  }
  // grid boxes
  for(let k=0;k<6;k++){const row=Math.floor(k/2),side=k%2?1:-1,i=((N-3-row*6)%N+N)%N;for(const[a,b]of[[-1.6,1.6]]){
    const c1=edge(i,side*4.5+a,.075),c2=edge(i,side*4.5+b,.075),i2=(i+1)%N;pushQuad(grid,c1,c2,edge(i2,side*4.5+a,.075),edge(i2,side*4.5+b,.075));}}
  const mk=(pos,col,mat)=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));if(col)g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));world.add(new THREE.Mesh(g,mat));};
  mk(run,null,new THREE.MeshBasicMaterial({color:RUNOFF[td.theme],side:THREE.DoubleSide}));
  mk(road,null,new THREE.MeshBasicMaterial({color:TH.road,side:THREE.DoubleSide}));
  mk(line,null,new THREE.MeshBasicMaterial({color:0xf2f2f2,side:THREE.DoubleSide}));mk(grid,null,new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide}));
  mk(curb,curbC,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide}));
  mk(wall,wallC,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide}));
  const place=(o,i,off,face)=>{const e=edge(i,off,0);o.position.set(e.x,o.position.y+e.y,e.z);o.rotation.y=Math.atan2(T[i].x,T[i].z)+(face||0);world.add(o);return o;};
  // start line, gantry with lights
  const h0=Math.atan2(T[0].x,T[0].z);
  const chk=canvasTex('chk',64,8,g=>{for(let x=0;x<16;x++)for(let y=0;y<2;y++){g.fillStyle=(x+y)%2?'#111':'#fff';g.fillRect(x*4,y*4,4,4);}});chk.magFilter=THREE.NearestFilter;
  const slm=new THREE.Mesh(new THREE.PlaneGeometry(HW*2,3),new THREE.MeshBasicMaterial({map:chk}));slm.rotation.order='YXZ';slm.rotation.set(-Math.PI/2,h0,0);slm.position.set(P[0].x,HG[0]+.09,P[0].z);world.add(slm);
  const ban=canvasTex('ban'+ti,512,64,(g,w,h)=>{const gr=g.createLinearGradient(0,0,w,0);gr.addColorStop(0,'#ff2d6b');gr.addColorStop(.5,'#ff7a1a');gr.addColorStop(1,'#7d4dff');g.fillStyle=gr;g.fillRect(0,0,w,h);
    g.fillStyle='#fff36b';g.font='italic bold 40px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(td.name.toUpperCase(),w/2,h/2+2);});
  const arch=new THREE.Group(),poleM=new THREE.MeshPhongMaterial({color:0xf4f4f4,flatShading:true});
  for(const s of[-1,1]){const p=new THREE.Mesh(new THREE.BoxGeometry(1.2,12,1.2),poleM);p.position.set(s*(HW+3),6,0);arch.add(p);}
  const bn=new THREE.Mesh(new THREE.BoxGeometry(HW*2+7.4,3,.7),new THREE.MeshBasicMaterial({map:ban}));bn.position.y=12;arch.add(bn);
  const lb=new THREE.Mesh(new THREE.BoxGeometry(8,1.6,.6),new THREE.MeshPhongMaterial({color:0x111111}));lb.position.set(0,9.6,-.1);arch.add(lb);
  for(let k=0;k<4;k++){const m=new THREE.MeshBasicMaterial({color:0x331111});const l=new THREE.Mesh(new THREE.BoxGeometry(1.2,1.1,.3),m);l.position.set(-2.7+k*1.8,9.6,-.45);arch.add(l);gantry.push(m);}
  arch.position.set(P[0].x,HG[0],P[0].z);arch.rotation.y=h0;world.add(arch);
  // grandstand with crowd (left side of start) and pit building (right side)
  {const st=new THREE.Group(),away=1,cols=[0xff4fa3,0x29d4ff,0xffe14d,0x7dffb0,0xff7a1a,0xffffff,0x7d4dff];
   const stepM=new THREE.MeshPhongMaterial({color:0xdedede,flatShading:true}),cM=new THREE.MeshLambertMaterial({color:0xffffff});
   const crowd=new THREE.InstancedMesh(new THREE.BoxGeometry(.7,1.1,.6),cM,5*30),dm=new THREE.Object3D(),cc=new THREE.Color();let ci=0;
   for(let k=0;k<5;k++){const s=new THREE.Mesh(new THREE.BoxGeometry(2.2,1+k*1.1,60),stepM);s.position.set(away*(k*2.2),(1+k*1.1)/2,0);st.add(s);
     for(let j=0;j<30;j++){dm.position.set(away*(k*2.2)+(rnd()-.5)*.6,1+k*1.1+.55,-29+j*2+(rnd()-.5));dm.scale.set(1,.8+rnd()*.4,1);dm.updateMatrix();crowd.setMatrixAt(ci,dm.matrix);crowd.setColorAt(ci++,cc.setHex(cols[(rnd()*cols.length)|0]));}}
   st.add(crowd);const roof=new THREE.Mesh(new THREE.BoxGeometry(12,.5,62),new THREE.MeshPhongMaterial({color:TH.wall[1],flatShading:true}));roof.position.set(away*4.4,10.5,0);st.add(roof);
   for(const z of[-29,0,29]){const pl=new THREE.Mesh(new THREE.BoxGeometry(.5,10.5,.5),stepM);pl.position.set(away*10,5.25,z);st.add(pl);}
   const k0=Math.round(N*.01)+12;const fpOK=(sg)=>{for(let dk=-16;dk<=16;dk+=4)for(const o of[HW+10,HW+16,HW+22]){const i=(k0+dk+N)%N;if(!roadFree(P[i].x+R[i].x*sg*o,P[i].z+R[i].z*sg*o,2,i))return false;}return true;};
   const e=edge(k0,-(HW+10),0);st.position.set(e.x,e.y-.5,e.z);st.visible=fpOK(-1);st.rotation.y=Math.atan2(T[k0].x,T[k0].z);
   // local +x must point away from track on the left side (-R): local x = -R, so away=+1
   world.add(st);
   const pit=new THREE.Group();const pb=new THREE.Mesh(new THREE.BoxGeometry(8,6,70),new THREE.MeshPhongMaterial({color:0xf6f6f6,flatShading:true}));pb.position.set(-4,3,0);pit.add(pb);
   const pstr=new THREE.Mesh(new THREE.BoxGeometry(8.1,1,70.1),new THREE.MeshPhongMaterial({color:TH.wall[1],flatShading:true}));pstr.position.set(-4,4.8,0);pit.add(pstr);
   const win=new THREE.Mesh(new THREE.BoxGeometry(.1,1.4,64),new THREE.MeshPhongMaterial({color:0x223355,shininess:120,specular:0xffffff}));win.position.set(.02,2.6,0);pit.add(win);
   const e2=edge(k0,HW+10,0);pit.position.set(e2.x,e2.y-.5,e2.z);pit.visible=fpOK(1);pit.rotation.y=Math.atan2(T[k0].x,T[k0].z);world.add(pit);}
  // billboards, chevrons, tire stacks, banner arches, theme props
  const postM=new THREE.MeshPhongMaterial({color:0x333344,flatShading:true});
  const tires=[],props=[];let lastBoard=-999,bi=ti;
  for(let i=30;i<N-10;i++){
    if(busy(i))continue;
    const c=curvA[i],corner=Math.abs(c)>.45,sOut=c<0?-1:1;
    const clearHere=(o,r)=>roadFree(P[i].x+R[i].x*o,P[i].z+R[i].z*o,r,i);
    if(corner&&i%7===0&&clearHere(sOut*(HW+7.4),3)){const sg=new THREE.Mesh(new THREE.PlaneGeometry(3.4,1.7),new THREE.MeshBasicMaterial({map:chevTex(c<0),side:THREE.DoubleSide}));sg.position.y=2.2;
      const e=edge(i,sOut*(HW+7.4),0);sg.position.x=e.x;sg.position.z=e.z;sg.position.y+=e.y;sg.rotation.y=Math.atan2(-T[i].x,-T[i].z);world.add(sg);
      for(const dx of[-1.3,1.3]){const p=new THREE.Mesh(new THREE.BoxGeometry(.15,1.4,.15),postM);p.position.set(e.x,0.7+e.y,e.z);p.position.x+=T[i].z*dx;p.position.z-=T[i].x*dx;world.add(p);}}
    if(corner&&i%2===0&&clearHere(sOut*(HW+7.6),1))tires.push([i,sOut*(HW+7.6)]);
    if(!corner&&Math.abs(c)<.12&&i-lastBoard>55&&clearHere(((bi%2)?1:-1)*(HW+9),9)){lastBoard=i;const s=(bi%2)?1:-1;
      const bd=new THREE.Group();const pl=new THREE.Mesh(new THREE.PlaneGeometry(16,4),new THREE.MeshBasicMaterial({map:sponsorTex(bi++)}));pl.position.y=3.6;pl.rotation.y=s>0?-Math.PI/2:Math.PI/2;bd.add(pl);
      const bk=new THREE.Mesh(new THREE.BoxGeometry(.3,4.2,16.2),postM);bk.position.set(s*.2,3.6,0);bd.add(bk);for(const z of[-6,6]){const p=new THREE.Mesh(new THREE.BoxGeometry(.3,2,.3),postM);p.position.set(s*.2,.9,z);bd.add(p);}
      place(bd,i,s*(HW+9));}
    if(i%Math.floor(N/4)===0&&i>N*.2){const ar=new THREE.Group();for(const s of[-1,1]){const p=new THREE.Mesh(new THREE.BoxGeometry(.9,9,.9),poleM);p.position.set(s*(HW+3),4.5,0);ar.add(p);}
      const b2=new THREE.Mesh(new THREE.BoxGeometry(HW*2+6.5,2.2,.4),new THREE.MeshBasicMaterial({map:sponsorTex(bi++)}));b2.position.y=9;ar.add(b2);place(ar,i,0);}
    if(i%9===0&&rnd()<.5){const po=(rnd()<.5?-1:1)*(HW+9+rnd()*6);if(clearHere(po,3))props.push([i,po]);}
  }
  if(tires.length){const tg=new THREE.InstancedMesh(new THREE.CylinderGeometry(.6,.6,.45,10),new THREE.MeshPhongMaterial({color:0x18181c,flatShading:true}),tires.length*3),dm=new THREE.Object3D();
    let n=0;tires.forEach(([i,o])=>{const e=edge(i,o,0);for(let k=0;k<3;k++){dm.position.set(e.x,e.y+.23+k*.46,e.z);dm.updateMatrix();tg.setMatrixAt(n++,dm.matrix);}});world.add(tg);}
  // theme props near the track
  const propDef={palm:[new THREE.ConeGeometry(1.6,1,8),0xff4fa3,1.7,new THREE.CylinderGeometry(.08,.08,1.7,4)],pine:[new THREE.ConeGeometry(.5,1.2,4),0xff7a1a,.6],
    cactus:[new THREE.DodecahedronGeometry(1.4,0),0xb5523a,.9],building:[new THREE.BoxGeometry(.4,6,.4),TH.wall[0],3],round:[new THREE.CylinderGeometry(.9,.9,1.4,8),0xe8c45a,.7],
    rock:[new THREE.DodecahedronGeometry(1.8,0),td.theme===6?0xff5a00:0x8a4a2a,.6],snow:[new THREE.IcosahedronGeometry(1.6,0),0xffffff,.5]};
  const pd=propDef[td.theme===3?'snow':TH.veg];
  if(pd&&props.length){const pm=new THREE.InstancedMesh(pd[0],new THREE.MeshPhongMaterial({color:pd[1],flatShading:true,emissive:td.theme===6||TH.night?pd[1]:0,emissiveIntensity:.5}),props.length),dm=new THREE.Object3D();
    props.forEach(([i,o],k)=>{const e=edge(i,o,0);dm.position.set(e.x,pd[2]+groundH(e.x,e.z),e.z);dm.rotation.set(0,rnd()*3,0);dm.scale.setScalar(.8+rnd()*.5);dm.updateMatrix();pm.setMatrixAt(k,dm.matrix);});world.add(pm);
    if(pd[3]){const pp=new THREE.InstancedMesh(pd[3],postM,props.length);props.forEach(([i,o],k)=>{const e=edge(i,o,0);dm.position.set(e.x,.85+groundH(e.x,e.z),e.z);dm.scale.setScalar(1);dm.updateMatrix();pp.setMatrixAt(k,dm.matrix);});world.add(pp);}}
  if(td.theme===6){// lava pools
    const lm=new THREE.MeshBasicMaterial({color:0xff6a00});for(let k=0;k<8;k++){const x=bb.cx+(rnd()-.5)*bb.r,z=bb.cz+(rnd()-.5)*bb.r;if(nearTrack(x,z,HW+30))continue;
      const pool=new THREE.Mesh(new THREE.CircleGeometry(8+rnd()*14,9),lm);pool.rotation.x=-Math.PI/2;pool.position.set(x,groundH(x,z)+.05,z);world.add(pool);}}
  if(TH.veg==='round'&&td.theme===9){// windmills that spin
    for(let k=0;k<4;k++){const a=k/4*6.28+rnd(),d=bb.r+80+rnd()*60,x=bb.cx+Math.cos(a)*d,z=bb.cz+Math.sin(a)*d;
      const gy=groundH(x,z),tw=new THREE.Mesh(new THREE.CylinderGeometry(1.5,3,26,6),new THREE.MeshPhongMaterial({color:0xffffff,flatShading:true}));tw.position.set(x,13+gy,z);world.add(tw);
      const hub=new THREE.Group();hub.position.set(x,25+gy,z);hub.lookAt(bb.cx,25+gy,bb.cz);const bl=new THREE.Group();hub.add(bl);bl.position.z=2;
      for(let b=0;b<4;b++){const blade=new THREE.Mesh(new THREE.BoxGeometry(2.4,13,.3),new THREE.MeshPhongMaterial({color:0xff4fa3,flatShading:true}));blade.position.y=6.5;const piv=new THREE.Group();piv.rotation.z=b*Math.PI/2;piv.add(blade);bl.add(piv);}
      world.add(hub);spinners.push(bl);}}
  buildFeatures(feat,blockers,edge,rnd,td);
  // big scenery (seeded)
  function nearTrack(x,z,d){for(let i=0;i<N;i+=3){const dx=P[i].x-x,dz=P[i].z-z;if(dx*dx+dz*dz<d*d)return true;}for(const q of blockers){const dx=q[0]-x,dz=q[1]-z;if(dx*dx+dz*dz<q[2]*q[2])return true;}return false;}
  const vg=VEG[TH.veg],isB=TH.veg==='building',clear=isB?HW+28:HW+16,list=[];
  const ph=rnd()*10;for(let k=0;k<2600&&list.length<(isB?180:720);k++){const x=bb.minX-300+rnd()*(bb.maxX-bb.minX+600),z=bb.minZ-300+rnd()*(bb.maxZ-bb.minZ+600);
    if(!isB&&Math.sin(x*.011+ph)*Math.cos(z*.013-ph)+Math.sin((x+z)*.004)*.6<-.35)continue;
    if(water&&Math.hypot(x-bb.cx,z-bb.cz)>bb.r+320)continue;if(nearTrack(x,z,clear))continue;list.push([x,z,.7+rnd()*.9,rnd()*6,rnd()]);}
  const fol=new THREE.InstancedMesh(vg.g(),new THREE.MeshPhongMaterial({color:isB?0xffffff:TH.vegCol,flatShading:true,shininess:0,emissive:isB?0x221040:0}),list.length);
  const trk=vg.trunk?new THREE.InstancedMesh(vg.trunk===2?new THREE.CylinderGeometry(.35,.5,9,5):new THREE.CylinderGeometry(.6,.8,2.6,5),new THREE.MeshPhongMaterial({color:0x7a5230,flatShading:true,shininess:0}),list.length):null;
  const dm=new THREE.Object3D(),bc=new THREE.Color(),bcols=[0x3a3a6a,0x5a2a7a,0x22447a,0x6a3a6a,0x1e3a5a],vc=new THREE.Color();
  list.forEach((m,i)=>{
    const gy=groundH(m[0],m[1]);
    if(isB){const w=12+m[4]*20,h=20+m[2]*50,d=12+((m[3]*7)%1)*18;dm.position.set(m[0],h/2+gy-1,m[1]);dm.scale.set(w,h,d);dm.rotation.set(0,m[3],0);dm.updateMatrix();fol.setMatrixAt(i,dm.matrix);fol.setColorAt(i,bc.setHex(bcols[i%5]));}
    else{dm.position.set(m[0],vg.y*m[2]+gy,m[1]);dm.scale.setScalar(m[2]);dm.rotation.set(0,m[3],0);dm.updateMatrix();fol.setMatrixAt(i,dm.matrix);
      fol.setColorAt(i,vc.setHex(TH.vegCol).offsetHSL((m[4]-.5)*.06,0,(m[4]-.5)*.14));
      if(trk){dm.position.y=(vg.trunk===2?4.5:1.3)*m[2]+gy;dm.updateMatrix();trk.setMatrixAt(i,dm.matrix);}}});
  world.add(fol);if(trk)world.add(trk);
  addUnderbrush(rnd,edge,nearTrack,td,water,isB);
  if(isB){const lm=new THREE.MeshBasicMaterial({color:TH.wall[1]});for(let i=0;i<N;i+=20){for(const s of[-1,1]){const o=edge(i,s*(HW+8),0);const pl=new THREE.Mesh(new THREE.BoxGeometry(.4,8,.4),lm);pl.position.set(o.x,4+o.y,o.z);world.add(pl);}}}
  const mM=new THREE.MeshPhongMaterial({color:TH.mtn,flatShading:true,shininess:0}),capM=new THREE.MeshPhongMaterial({color:td.theme===6?0xff5a00:0xffffff,flatShading:true,emissive:td.theme===6?0xff3a00:0});
  for(let k=0;k<44;k++){const a=k/44*Math.PI*2+rnd()*.1,d=bb.r+(water?520:340)+rnd()*450,r=70+rnd()*130,h=100+rnd()*210;
    if(!roadFree(bb.cx+Math.cos(a)*d,bb.cz+Math.sin(a)*d,r+10))continue;
    const m=new THREE.Mesh(new THREE.ConeGeometry(r,h,5),mM);m.position.set(bb.cx+Math.cos(a)*d,h/2-2,bb.cz+Math.sin(a)*d);m.rotation.y=rnd()*3;world.add(m);
    if(h>200&&!TH.night){const cp=new THREE.Mesh(new THREE.ConeGeometry(r*.28,h*.28,5),capM);cp.position.set(m.position.x,h-2-h*.14,m.position.z);cp.rotation.y=m.rotation.y;world.add(cp);}}
  if(!TH.night){const cM=new THREE.MeshLambertMaterial({color:0xffffff,emissive:0x999999});
    for(let k=0;k<28;k++){const cg=new THREE.Group();for(let j=0;j<3;j++){const c=new THREE.Mesh(new THREE.BoxGeometry(30+rnd()*40,8+rnd()*6,20+rnd()*20),cM);c.position.set(j*22-22,(rnd()-.5)*4,(rnd()-.5)*10);cg.add(c);}
      cg.position.set(bb.cx+(rnd()-.5)*2400,190+rnd()*140,bb.cz+(rnd()-.5)*2400);world.add(cg);}}
  else{const sm=new THREE.MeshBasicMaterial({color:0xffffff,fog:false});for(let k=0;k<160;k++){const s=new THREE.Mesh(new THREE.BoxGeometry(3,3,3),sm);const a=rnd()*6.28,e=.15+rnd()*.9,d=2000;
    s.position.set(bb.cx+Math.cos(a)*Math.cos(e)*d,Math.sin(e)*d,bb.cz+Math.sin(a)*Math.cos(e)*d);world.add(s);}}
}

// ================= track features =================
let bobbers=[],lastFeat=null;
const M=(c,o)=>new THREE.MeshPhongMaterial(Object.assign({color:c,flatShading:true,shininess:5},o||{}));
function quads(arr,mat){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(arr,3));g.computeVertexNormals();return new THREE.Mesh(g,mat);}
function buildFeatures(feat,blockers,edge,rnd,td){
  const at=(o,i,off,y)=>{const e=edge(i,off||0,0);o.position.set(e.x,(y||0)+e.y,e.z);o.rotation.y=Math.atan2(T[i].x,T[i].z);world.add(o);return o;};
  const rockCol=new THREE.Color(TH.mtn).lerp(new THREE.Color(TH.ground),.35).getHex();
  // tunnels: walls, roof, lights, portals and a hill over the top
  for(const[a,b]of feat.tun){
    const wall=[],roof=[],hill=[],W2=HW+6.6,hs=[0,13,16,19,16,13,0];
    const room=(i,sg)=>{let o=W2+2;while(o<HW+38&&roadFree(P[i].x+R[i].x*sg*o,P[i].z+R[i].z*sg*o,1,i))o+=3;return o;};
    const RM=[];for(let i=a;i<=b;i++)RM.push([room(i,-1),room(i,1)]);
    const offsAt=(i)=>{const[l,r]=RM[i-a];return[-Math.max(W2+1.5,l),-Math.max(W2+1.2,Math.min(HW+18,l*.55+W2*.45)),-(W2+1),0,W2+1,Math.max(W2+1.2,Math.min(HW+18,r*.55+W2*.45)),Math.max(W2+1.5,r)];};
    for(let i=a;i<b;i++){const j=i+1;const offs=offsAt(i),offs2=offsAt(j);
      for(const sg of[-1,1]){const o=sg*W2;pushQuad(wall,edge(i,o,0),edge(i,o,8),edge(j,o,0),edge(j,o,8));}
      pushQuad(roof,edge(i,-W2,8),edge(i,W2,8),edge(j,-W2,8),edge(j,W2,8));
      for(let k=0;k<offs.length-1;k++)pushQuad(hill,edge(i,offs[k],hs[k]),edge(i,offs[k+1],hs[k+1]),edge(j,offs2[k],hs[k]),edge(j,offs2[k+1],hs[k+1]));
      if(i%6===0)for(const sg of[-1,1]){const l=new THREE.Mesh(new THREE.BoxGeometry(.5,.3,3),new THREE.MeshBasicMaterial({color:0xfff0a0}));at(l,i,sg*(W2-.4),7.6);}
      if(i%3===0)blockers.push([P[i].x,P[i].z,HW+44]);}
    world.add(quads(wall,new THREE.MeshLambertMaterial({color:0x8a8f99,side:THREE.DoubleSide})));
    world.add(quads(roof,new THREE.MeshLambertMaterial({color:0x4a4e58,side:THREE.DoubleSide})));
    world.add(quads(hill,new THREE.MeshPhongMaterial({color:TH.veg==='building'?0x3a3a55:new THREE.Color(TH.ground).multiplyScalar(.85).getHex(),flatShading:true,side:THREE.DoubleSide})));
    for(const e of[a,b]){const g=new THREE.Group(),sm=M(0xc8b89a);
      for(const sg of[-1,1]){const rm=RM[e-a][sg<0?1:0],wd=Math.max(1,Math.min(31,rm-W2-1));const p=new THREE.Mesh(new THREE.BoxGeometry(wd,16,2),sm);p.position.set(sg*(W2+wd/2),8,0);g.add(p);}
      const top=new THREE.Mesh(new THREE.BoxGeometry(2*W2,11,2),sm);top.position.set(0,13.5,0);g.add(top);
      const band=new THREE.Mesh(new THREE.BoxGeometry(2*W2,1,2.2),new THREE.MeshBasicMaterial({map:chevTex(true)}));band.position.y=8.6;g.add(band);
      for(const sg of[-1,1]){const l=new THREE.Mesh(new THREE.BoxGeometry(.8,.8,.4),new THREE.MeshBasicMaterial({color:0xffe14d}));l.position.set(sg*(W2-1),7,1.2);g.add(l);}
      at(g,e,0,0);}
  }
  // river crossing: water, banks, bridge rails and piers
  if(feat.river>=0){const i=feat.river,h=Math.atan2(T[i].x,T[i].z);
    const w=new THREE.Mesh(new THREE.PlaneGeometry(1400,34),new THREE.MeshPhongMaterial({color:0x2ab8e8,shininess:90,specular:0xffffff}));
    w.rotation.order='YXZ';w.rotation.set(-Math.PI/2,h,0);w.position.set(P[i].x,-.4,P[i].z);world.add(w);
    for(const sg of[-1,1]){const bank=new THREE.Mesh(new THREE.PlaneGeometry(1400,4),new THREE.MeshLambertMaterial({color:0xd8c48a}));bank.rotation.order='YXZ';bank.rotation.set(-Math.PI/2,h,0);
      bank.visible=false;world.add(bank);}
    const rail=M(0xe8e8e8),pier=M(0x9a9aa8);
    {const ra=[];for(let k=i-11;k<i+11;k++){const k0=(k+N)%N,k1=(k+1+N)%N;for(const sg of[-1,1]){const o=sg*(HW+3);pushQuad(ra,edge(k0,o,0),edge(k0,o,1.6),edge(k1,o,0),edge(k1,o,1.6));}}
      world.add(quads(ra,new THREE.MeshPhongMaterial({color:0xe8e8e8,flatShading:true,side:THREE.DoubleSide})));}
    for(const sg of[-1,1]){
      for(const dz of[-10,0,10]){const e=edge(i,sg*(HW+4),0),ph=e.y+1.8;const p=new THREE.Mesh(new THREE.BoxGeometry(2,ph,2),pier);p.position.set(e.x+T[i].x*dz,e.y-ph/2,e.z+T[i].z*dz);world.add(p);}}
    w.geometry=new THREE.PlaneGeometry(feat.rlen[0]+feat.rlen[1]+60,34);const mid=(feat.rlen[1]-feat.rlen[0])/2;w.position.x+=-R[i].x*mid;w.position.z+=-R[i].z*mid;
    for(let k=-feat.rlen[0];k<=feat.rlen[1];k+=22)blockers.push([P[i].x+R[i].x*k,P[i].z+R[i].z*k,24]);
    for(const[sg,L2]of[[-1,feat.rlen[0]],[1,feat.rlen[1]]]){const px=P[i].x+R[i].x*sg*(L2+5),pz=P[i].z+R[i].z*sg*(L2+5),pr=Math.min(28,distOther(px,pz,-1)-HW-12);
      if(pr<8)continue;const pond=new THREE.Mesh(new THREE.CircleGeometry(pr,12),w.material);pond.rotation.x=-Math.PI/2;pond.position.set(px,-.4,pz);world.add(pond);}
    // a few boats
    for(let k=0;k<3;k++){const sg=rnd()<.5?-1:1,L2=feat.rlen[sg<0?0:1];if(L2<90)continue;const o=sg*(50+rnd()*(L2-80)),b=boat();if(!roadFree(P[i].x+R[i].x*o,P[i].z+R[i].z*o,6,i))continue;b.position.set(P[i].x+R[i].x*o,-.4,P[i].z+R[i].z*o);b.rotation.y=h+Math.PI/2;world.add(b);bobbers.push({o:b,y:-.4,p:rnd()*6});}}
  // overpass bridge across the track with ramps
  if(feat.over>=0){const g=new THREE.Group(),cm=M(0xd8d8e0),dk=M(0x50545e),L=HW+26;
    const deck=new THREE.Mesh(new THREE.BoxGeometry(2*L,1.2,10),cm);deck.position.y=10;g.add(deck);
    const road2=new THREE.Mesh(new THREE.BoxGeometry(2*L,.1,8),dk);road2.position.y=10.65;g.add(road2);
    for(const sg of[-1,1]){const rl=new THREE.Mesh(new THREE.BoxGeometry(2*L,1,.4),M(TH.wall[1]));rl.position.set(0,11.2,sg*4.9);g.add(rl);
      for(const x of[HW+9,HW+20]){const p=new THREE.Mesh(new THREE.BoxGeometry(1.6,10,6),cm);p.position.set(sg*x,5,0);g.add(p);}
      const ramp=new THREE.Mesh(new THREE.BoxGeometry(46,1.2,10),cm);ramp.position.set(sg*(L+21),5,0);ramp.rotation.z=sg*-Math.atan(10/44);g.add(ramp);
      const ad=new THREE.Mesh(new THREE.PlaneGeometry(2*HW+6,2.4),new THREE.MeshBasicMaterial({map:sponsorTex(ti0()+(sg>0?3:5)),side:THREE.DoubleSide}));ad.position.set(0,10,sg*5.05);g.add(ad);}
    const truck=new THREE.Group(),tb=new THREE.Mesh(new THREE.BoxGeometry(7,3,2.6),M(0xffffff));tb.position.y=12.3;truck.add(tb);
    const cab=new THREE.Mesh(new THREE.BoxGeometry(2.2,2.4,2.6),M(0xff4fa3));cab.position.set(4.6,12,0);truck.add(cab);truck.position.x=-8;g.add(truck);
    const outer=new THREE.Group();outer.add(g);at(outer,feat.over,0,0);
    blockers.push([P[feat.over].x,P[feat.over].z,HW+75]);}
  // themed landmarks scattered around the circuit
  const list=LANDMARKS[td.theme]||[];const want=6+Math.floor(rnd()*4);let placed=0;
  for(let k=0;k<400&&placed<want;k++){const f=list[(placed+TI)%list.length];
    const x=bb.minX-260+rnd()*(bb.maxX-bb.minX+520),z=bb.minZ-260+rnd()*(bb.maxZ-bb.minZ+520);
    if(nearTrackB(x,z,HW+8+f.r,blockers)||!roadFree(x,z,f.r))continue;if(TH.veg==='palm'&&!f.water&&Math.hypot(x-bb.cx,z-bb.cz)>bb.r+300)continue;
    if(f.water&&!(TH.veg==='palm'&&Math.hypot(x-bb.cx,z-bb.cz)>bb.r+390))continue;
    const o=f.make(rnd);o.position.set(x,groundH(x,z),z);o.rotation.y=rnd()*6.28;world.add(o);blockers.push([x,z,f.r]);placed++;}
}
function ti0(){return TI;}
function nearTrackB(x,z,d,bl){for(let i=0;i<N;i+=3){const dx=P[i].x-x,dz=P[i].z-z;if(dx*dx+dz*dz<d*d)return true;}for(const q of bl){const dx=q[0]-x,dz=q[1]-z;if(dx*dx+dz*dz<q[2]*q[2])return true;}return false;}
function boat(){const g=new THREE.Group(),h=new THREE.Mesh(new THREE.BoxGeometry(3,1.2,9),M(0xffffff));h.position.y=.4;g.add(h);
  const m=new THREE.Mesh(new THREE.BoxGeometry(.25,9,.25),M(0x6a4a2a));m.position.y=5;g.add(m);
  const sl=new THREE.Mesh(new THREE.ConeGeometry(3,8,3),M([0xff4fa3,0xffe14d,0x29d4ff][(Math.random()*3)|0]));sl.position.set(0,5.4,-1.2);sl.scale.z=.15;g.add(sl);return g;}
function house(rnd,wallC,roofC,w,h){const g=new THREE.Group(),b=new THREE.Mesh(new THREE.BoxGeometry(w,h,w*.8),M(wallC));b.position.y=h/2;g.add(b);
  const r=new THREE.Mesh(new THREE.ConeGeometry(w*.78,h*.7,4),M(roofC));r.position.y=h+h*.35;r.rotation.y=Math.PI/4;r.scale.z=.85;g.add(r);
  const d=new THREE.Mesh(new THREE.BoxGeometry(w*.22,h*.5,.2),M(0x5a3a2a));d.position.set(0,h*.25,w*.4+.05);g.add(d);return g;}
const LANDMARKS={
  0:[{r:20,make:()=>{const g=new THREE.Group();for(let k=0;k<5;k++){const c=new THREE.Mesh(new THREE.CylinderGeometry(3.4-k*.35,3.6-k*.35,5,10),M(k%2?0xffffff:0xe8283c));c.position.y=2.5+k*5;g.add(c);}
      const l=new THREE.Mesh(new THREE.CylinderGeometry(1.8,1.8,2.4,8),new THREE.MeshBasicMaterial({color:0xfff3a0}));l.position.y=26.2;g.add(l);const cap=new THREE.Mesh(new THREE.ConeGeometry(2.6,2.4,8),M(0xe8283c));cap.position.y=28.6;g.add(cap);return g;}},
     {r:14,make:r=>{const g=new THREE.Group();for(let k=0;k<6;k++){const u=new THREE.Group(),p=new THREE.Mesh(new THREE.CylinderGeometry(.1,.1,3,4),M(0xffffff)),t=new THREE.Mesh(new THREE.ConeGeometry(1.8,.8,8),M([0xff4fa3,0xffe14d,0x29d4ff,0xff7a1a][k%4]));
       p.position.y=1.5;t.position.y=3.1;u.add(p,t);u.position.set((k%3)*5-5,0,Math.floor(k/3)*5);g.add(u);}return g;}},
     {r:20,water:true,make:()=>boat()},{r:16,make:r=>house(r,0xfff4d8,0x29a8d8,8,5)}],
  1:[{r:14,make:r=>house(r,0x8a5a3a,0x3a2a1a,8,5)},{r:34,make:r=>{const g=new THREE.Group(),l=new THREE.Mesh(new THREE.CircleGeometry(24,10),new THREE.MeshPhongMaterial({color:0x2ab0e0,shininess:80}));l.rotation.x=-Math.PI/2;l.position.y=.05;g.add(l);
       const d=new THREE.Mesh(new THREE.BoxGeometry(3,.4,14),M(0x8a6a4a));d.position.set(0,.4,-20);g.add(d);return g;}},
     {r:10,make:()=>{const g=new THREE.Group();for(const x of[-2,2])for(const z of[-2,2]){const p=new THREE.Mesh(new THREE.BoxGeometry(.4,14,.4),M(0x7a5a3a));p.position.set(x,7,z);g.add(p);}
       const c=new THREE.Mesh(new THREE.BoxGeometry(6,4,6),M(0x8a6a4a));c.position.y=16;g.add(c);const rf=new THREE.Mesh(new THREE.ConeGeometry(5,3,4),M(0x3a2a1a));rf.position.y=19.5;rf.rotation.y=Math.PI/4;g.add(rf);return g;}}],
  2:[{r:42,make:r=>{const g=new THREE.Group(),m=new THREE.Mesh(new THREE.CylinderGeometry(18+r()*10,26+r()*10,24+r()*20,7),M(0xc06a3a));m.position.y=m.geometry.parameters.height/2;g.add(m);
       const t=new THREE.Mesh(new THREE.CylinderGeometry(m.geometry.parameters.radiusTop+.5,m.geometry.parameters.radiusTop+.5,2,7),M(0xd88a5a));t.position.y=m.geometry.parameters.height;g.add(t);return g;}},
     {r:10,make:()=>{const g=new THREE.Group();for(const x of[-2.5,2.5])for(const z of[-2.5,2.5]){const p=new THREE.Mesh(new THREE.BoxGeometry(.4,12,.4),M(0x888888));p.position.set(x,6,z);g.add(p);}
       const tk=new THREE.Mesh(new THREE.CylinderGeometry(4.5,4.5,6,10),M(0xe8e8e8));tk.position.y=15;g.add(tk);const rf=new THREE.Mesh(new THREE.ConeGeometry(4.8,2,10),M(0xff4fa3));rf.position.y=19;g.add(rf);return g;}}],
  3:[{r:14,make:r=>{const g=house(r,0x8a5a3a,0xffffff,8,5);return g;}},{r:60,make:r=>{const g=new THREE.Group();for(let k=0;k<5;k++){const t=new THREE.Mesh(new THREE.BoxGeometry(.8,12,.8),M(0x666677));t.position.set(0,6+k*4,k*22);g.add(t);
       const ch=new THREE.Mesh(new THREE.BoxGeometry(2,1.4,1.4),M(0xff3b3b));ch.position.set(1.5,8+k*4,k*22+11);g.add(ch);}
       const cable=new THREE.Mesh(new THREE.BoxGeometry(.15,.15,92),M(0x222222));cable.position.set(0,20,44);cable.rotation.x=-Math.atan(16/88);g.add(cable);g.children.forEach(c=>c.position.z-=44);return g;}},
     {r:24,make:()=>{const l=new THREE.Mesh(new THREE.CircleGeometry(20,9),new THREE.MeshPhongMaterial({color:0xbfe8ff,shininess:120,specular:0xffffff}));l.rotation.x=-Math.PI/2;l.position.y=.05;const g=new THREE.Group();g.add(l);return g;}}],
  4:[{r:30,make:r=>{const g=new THREE.Group(),hub=new THREE.Group();hub.position.y=24;g.add(hub);const cols=[0xff2d6b,0x29d4ff,0xffe14d,0x7dffb0];
       for(let k=0;k<12;k++){const a=k/12*Math.PI*2,sp=new THREE.Mesh(new THREE.BoxGeometry(.3,20,.3),new THREE.MeshBasicMaterial({color:0xffffff}));sp.rotation.z=a;sp.position.set(-Math.sin(a)*10,Math.cos(a)*10,0);hub.add(sp);
         const cb=new THREE.Mesh(new THREE.BoxGeometry(2.4,2.4,2.4),new THREE.MeshBasicMaterial({color:cols[k%4]}));cb.position.set(-Math.sin(a)*20,Math.cos(a)*20,0);hub.add(cb);}
       for(const x of[-5,5]){const l=new THREE.Mesh(new THREE.BoxGeometry(.8,25,.8),M(0xcccccc));l.position.set(0,12,x*.4);l.rotation.x=x>0?.25:-.25;g.add(l);}spinners.push(hub);return g;}},
     {r:16,make:r=>{const g=new THREE.Group(),h=40+r()*50,b=new THREE.Mesh(new THREE.BoxGeometry(14,h,14),M(0x2a2a50,{emissive:0x110830}));b.position.y=h/2;g.add(b);
       const s=new THREE.Mesh(new THREE.PlaneGeometry(10,3),new THREE.MeshBasicMaterial({map:sponsorTex((r()*8)|0),side:THREE.DoubleSide}));s.position.set(0,h-4,7.1);g.add(s);return g;}}],
  5:[{r:22,make:r=>{const g=house(r,0xc4283c,0xeeeeee,12,7);const si=new THREE.Mesh(new THREE.CylinderGeometry(3,3,16,10),M(0xd8d8d8));si.position.set(10,8,0);g.add(si);
       const dm=new THREE.Mesh(new THREE.SphereGeometry(3,10,6,0,6.3,0,1.6),M(0x9a9aa8));dm.position.set(10,16,0);g.add(dm);return g;}},
     {r:34,make:()=>{const t=canvasTex('crop',64,64,(g)=>{for(let k=0;k<8;k++){g.fillStyle=k%2?'#e8c45a':'#c8a040';g.fillRect(0,k*8,64,8);}});const p=new THREE.Mesh(new THREE.PlaneGeometry(50,40),new THREE.MeshLambertMaterial({map:t}));
       p.rotation.x=-Math.PI/2;p.position.y=.04;const g=new THREE.Group();g.add(p);return g;}},
     {r:14,make:()=>{const g=new THREE.Group();for(let k=0;k<5;k++){const b=new THREE.Mesh(new THREE.CylinderGeometry(1.4,1.4,2,10),M(0xe8c45a));b.rotation.z=Math.PI/2;b.position.set(k*3-6,1.4,(k%2)*3);g.add(b);}return g;}}],
  6:[{r:70,make:r=>{const g=new THREE.Group(),v=new THREE.Mesh(new THREE.CylinderGeometry(14,62,70,9),M(0x2a1818));v.position.y=35;g.add(v);
       const lv=new THREE.Mesh(new THREE.CylinderGeometry(12,12,2,9),new THREE.MeshBasicMaterial({color:0xff5a00}));lv.position.y=70;g.add(lv);
       for(let k=0;k<6;k++){const sm=new THREE.Mesh(new THREE.IcosahedronGeometry(7+k*2,0),M(0x777777,{transparent:true,opacity:.75}));sm.position.set((r()-.5)*8,78+k*10,(r()-.5)*8);g.add(sm);bobbers.push({o:sm,y:sm.position.y,p:r()*6});}return g;}},
     {r:12,make:r=>{const g=new THREE.Group(),c=new THREE.Mesh(new THREE.DodecahedronGeometry(5,0),M(0x1a1414));c.position.y=3;g.add(c);
       const l=new THREE.Mesh(new THREE.CircleGeometry(7,8),new THREE.MeshBasicMaterial({color:0xff7a00}));l.rotation.x=-Math.PI/2;l.position.set(8,.06,0);g.add(l);return g;}}],
  7:[{r:14,make:r=>{const g=new THREE.Group();for(const x of[-2,2])for(const z of[-2,2]){const p=new THREE.Mesh(new THREE.BoxGeometry(.4,4,.4),M(0x7a5a3a));p.position.set(x,2,z);g.add(p);}
       const b=new THREE.Mesh(new THREE.BoxGeometry(6,3,6),M(0xd8b070));b.position.y=5.5;g.add(b);const rf=new THREE.Mesh(new THREE.ConeGeometry(5.5,3.5,4),M(0xb08a40));rf.position.y=8.7;rf.rotation.y=Math.PI/4;g.add(rf);return g;}},
     {r:20,water:true,make:()=>boat()},{r:16,make:()=>{const g=new THREE.Group();const t=new THREE.Mesh(new THREE.ConeGeometry(4,10,6),M(0x8a6a4a));t.position.y=5;g.add(t);
       const fc=new THREE.Mesh(new THREE.ConeGeometry(1.5,3,6),new THREE.MeshBasicMaterial({color:0xffa030}));fc.position.y=11;g.add(fc);return g;}}],
  8:[{r:30,make:r=>{const g=new THREE.Group(),m=M(0xb05a32);for(const x of[-14,14]){const p=new THREE.Mesh(new THREE.BoxGeometry(8,26,8),m);p.position.set(x,13,0);g.add(p);}
       const t=new THREE.Mesh(new THREE.BoxGeometry(38,7,9),m);t.position.y=29;g.add(t);return g;}},
     {r:34,make:r=>{const g=new THREE.Group(),m=new THREE.Mesh(new THREE.CylinderGeometry(16,22,30+r()*20,6),M(0xa84a2a));m.position.y=m.geometry.parameters.height/2;g.add(m);return g;}}],
  9:[{r:16,make:r=>house(r,0xfff4d8,0xc4283c,9,6)},{r:24,make:r=>{const g=new THREE.Group(),c=[0xff4fa3,0xffe14d,0x29d4ff,0x7dffb0][(r()*4)|0];
       const bl=new THREE.Mesh(new THREE.SphereGeometry(7,10,8),M(c));bl.scale.y=1.2;bl.position.y=0;const bk=new THREE.Mesh(new THREE.BoxGeometry(2.4,2,2.4),M(0x8a5a3a));bk.position.y=-10;
       const gg=new THREE.Group();gg.add(bl,bk);gg.position.y=40+r()*40;g.add(gg);bobbers.push({o:gg,y:gg.position.y,p:r()*6,amp:3});return g;}},
     {r:30,make:()=>{const t=canvasTex('flow',64,64,(g)=>{g.fillStyle='#7ccf5a';g.fillRect(0,0,64,64);for(let k=0;k<90;k++){g.fillStyle=['#ff4fa3','#ffe14d','#ffffff','#7d4dff'][k%4];g.fillRect((k*37)%64,(k*53)%64,3,3);}});
       const p=new THREE.Mesh(new THREE.CircleGeometry(22,10),new THREE.MeshLambertMaterial({map:t}));p.rotation.x=-Math.PI/2;p.position.y=.04;const g=new THREE.Group();g.add(p);return g;}}]
};
// bushes, flowers and rolling hills for a fuller backdrop
function addUnderbrush(rnd,edge,nearTrack,td,water,isB){
  const dm=new THREE.Object3D(),col=new THREE.Color();
  if(!isB){const bushes=[];for(let k=0;k<1500&&bushes.length<420;k++){const i=Math.floor(rnd()*N),s=rnd()<.5?-1:1,o=s*(HW+10+rnd()*45),e=edge(i,o,0);
      if(inTun[i]||nearTrack(e.x,e.z,HW+9))continue;bushes.push([e.x,e.z,.6+rnd()*.9,rnd(),groundH(e.x,e.z)]);}
    const bm=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.6,0),new THREE.MeshPhongMaterial({color:0xffffff,flatShading:true,shininess:0}),bushes.length);
    const bc=td.theme===3?0xe8f0ff:td.theme===6?0x3a2a28:td.theme===2||td.theme===8?0x8a9a4a:new THREE.Color(TH.vegCol).offsetHSL(0,0,.06).getHex();
    bushes.forEach((b,k)=>{dm.position.set(b[0],b[2]*.9+b[4],b[1]);dm.scale.set(b[2]*1.3,b[2],b[2]*1.3);dm.rotation.set(0,b[3]*6,0);dm.updateMatrix();bm.setMatrixAt(k,dm.matrix);
      bm.setColorAt(k,col.setHex(bc).offsetHSL((b[3]-.5)*.05,0,(b[3]-.5)*.12));});world.add(bm);
    if(td.theme!==6&&td.theme!==3){const fl=[];for(let k=0;k<1200&&fl.length<500;k++){const i=Math.floor(rnd()*N),o=(rnd()<.5?-1:1)*(HW+8.5+rnd()*16),e=edge(i,o,0);
        if(inTun[i]||nearTrack(e.x,e.z,HW+8))continue;fl.push([e.x,e.z,rnd(),groundH(e.x,e.z)]);}
      const fm=new THREE.InstancedMesh(new THREE.ConeGeometry(.35,.9,4),new THREE.MeshBasicMaterial({color:0xffffff}),fl.length),fc=[0xff4fa3,0xffe14d,0xffffff,0xff7a1a,0x7d4dff];
      fl.forEach((f,k)=>{dm.position.set(f[0],.45+f[3],f[1]);dm.scale.setScalar(1);dm.rotation.set(0,0,0);dm.updateMatrix();fm.setMatrixAt(k,dm.matrix);fm.setColorAt(k,col.setHex(fc[(f[2]*5)|0]));});world.add(fm);}}
  // rolling hills between the track and the mountains
  const hm=new THREE.InstancedMesh(new THREE.SphereGeometry(1,8,5),new THREE.MeshPhongMaterial({color:0xffffff,flatShading:true,shininess:0}),34),base=TH.veg==='building'?0x2a2a44:TH.ground;
  let hn=0;for(let k=0;k<34;k++){const a=k/34*6.283+rnd()*.15,d=bb.r+(water?430:200)+rnd()*160,w=50+rnd()*90,hx=bb.cx+Math.cos(a)*d,hz=bb.cz+Math.sin(a)*d;
    if(!roadFree(hx,hz,w*1.15+10)){dm.position.set(0,-500,0);dm.scale.set(.01,.01,.01);dm.updateMatrix();hm.setMatrixAt(k,dm.matrix);continue;}hn++;dm.position.set(hx,-2,hz);
    dm.scale.set(w,18+rnd()*30,w*(.7+rnd()*.5));dm.rotation.set(0,rnd()*6,0);dm.updateMatrix();hm.setMatrixAt(k,dm.matrix);hm.setColorAt(k,col.setHex(base).offsetHSL(0,0,-.05-rnd()*.08));}
  world.add(hm);
}

// ================= slipstream effects =================
// Air streaks rush past your car while you draft, and a wind tunnel trails the car you're tucked behind — both in your chosen colour.
function makeStreaks(n){const g=new THREE.Group(),geo=new THREE.BoxGeometry(.035,.035,2.4),items=[];
  for(let i=0;i<n;i++){const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));m.visible=false;g.add(m);items.push({m,life:0});}
  let acc=0,hue=0;
  return {g,update(dt,on,col,speed){acc+=dt*(on?22:0);hue=(hue+dt*.25)%1;
    while(acc>1){acc-=1;const it=items.find(x=>x.life<=0);if(!it){acc=0;break;}it.life=.38;it.m.visible=true;const a=Math.random()*6.28,r=2.2+Math.random()*1.3;
      it.m.position.set(Math.cos(a)*r*1.15,Math.max(.25,1+Math.sin(a)*r*.75),7+Math.random()*4);}
    for(const it of items){if(it.life<=0)continue;it.life-=dt;it.m.position.z-=dt*(34+speed*.45);it.m.material.opacity=Math.sin(Math.PI*Math.max(0,it.life/.38))*.32;
      if(col===-1)it.m.material.color.setHSL((hue+it.m.position.z*.02+1)%1,.7,.7);else it.m.material.color.setHex(col);if(it.life<=0)it.m.visible=false;}}};}
const raceStreaks=makeStreaks(44);scene.add(raceStreaks.g);
const wakeGeo=(()=>{const g=new THREE.ConeGeometry(1.9,16,12,1,true);g.rotateX(Math.PI/2);g.translate(0,0,-8);return g;})();
const wake=new THREE.Mesh(wakeGeo,new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
wake.rotation.order='YXZ';scene.add(wake);let wakeHue=0;
function slipColor(){return player?(looks(player.id).slip??0xffffff):0xffffff;}
function updSlipFX(dt){const on=player&&(state==='race'||state==='done')&&!player.finished;
  const col=slipColor();raceStreaks.g.visible=!!player;
  if(player){raceStreaks.g.position.set(player.x,player.y,player.z);raceStreaks.g.rotation.y=player.ma;raceStreaks.update(dt,on&&player.slip,col,player.v);}
  const t=on&&player.slipT;const target=t?.1*(player.slipCharge||0):0;wake.material.opacity+=(target-wake.material.opacity)*Math.min(1,dt*6);
  wake.visible=wake.material.opacity>.01;
  if(t){wake.position.set(t.x-Math.sin(t.ma)*2.4,t.y+1,t.z-Math.cos(t.ma)*2.4);wake.rotation.y=t.ma;wake.scale.set(.8,.55,1);}
  wakeHue=(wakeHue+dt*.2)%1;if(col===-1)wake.material.color.setHSL(wakeHue,.7,.7);else wake.material.color.setHex(col);}

// ================= smoke =================
const puffs=[],puffG=new THREE.BoxGeometry(.9,.9,.9);
for(let i=0;i<70;i++){const m=new THREE.Mesh(puffG,new THREE.MeshBasicMaterial({color:0xeeeeee,transparent:true,opacity:0}));m.visible=false;scene.add(m);puffs.push({m,life:0});}
let puffI=0;
function puff(x,z,col,y){const p=puffs[puffI++%puffs.length];p.life=.6;p.m.visible=true;p.m.material.color.setHex(col);p.m.position.set(x+(Math.random()-.5),(y||0)+.5,z+(Math.random()-.5));p.m.scale.setScalar(.6);}
const SKN=900,skidM=new THREE.InstancedMesh((()=>{const g=new THREE.PlaneGeometry(.42,1.5);g.rotateX(-Math.PI/2);return g;})(),new THREE.MeshBasicMaterial({color:0x15151a,transparent:true,opacity:.42,depthWrite:false}),SKN);
skidM.frustumCulled=false;scene.add(skidM);let skI=0;const skD=new THREE.Object3D();
function clearSkids(){skD.position.set(0,-99,0);skD.scale.set(.001,.001,.001);skD.updateMatrix();for(let i=0;i<SKN;i++)skidM.setMatrixAt(i,skD.matrix);if(skidM.instanceMatrix)skidM.instanceMatrix.needsUpdate=true;}clearSkids();
function skid(x,z,y,h){skD.position.set(x,y+.08,z);skD.rotation.set(0,h,0);skD.scale.set(1,1,1);skD.updateMatrix();skidM.setMatrixAt(skI++%SKN,skD.matrix);skidM.instanceMatrix.needsUpdate=true;}
function updPuffs(dt){for(const p of puffs){if(p.life<=0)continue;p.life-=dt;const k=Math.max(0,p.life/.6);p.m.material.opacity=k*.7;p.m.scale.setScalar(.6+(1-k)*2.2);p.m.position.y+=dt*1.5;if(p.life<=0)p.m.visible=false;}}

// ================= race state =================
let cars=[],player=null,state='menu',raceTime=0,cd=0,lapStart=0,bestLap=null,shake=0,msgT=0,subT=0,resultsTimer=0,driftTime=0,LAPS=3,wallHits=0;
let mode='single',GP=null,lastRace=null,autoPilot=0,headless=false;
const DIFF={// AI pace (fraction of their car's top speed), cornering skill, rubber band, boost use
  0:{pace:[.79,.82],corner:.7,ahead:.88,behind:1.02,boost:.6},
  1:{pace:[.855,.89],corner:.81,ahead:.95,behind:1.03,boost:.45},
  2:{pace:[.915,.95],corner:.89,ahead:1,behind:1.04,boost:.3}};
function newCar(id,name,isPlayer,L){
  const mesh=headless?null:makeCar(L||looks(id));if(mesh)world.add(mesh);
  return {mesh,id,spec:spec(id,!isPlayer||(mode==='online'&&NET.race&&!NET.race.up)),name,isPlayer,x:0,z:0,h:0,ma:0,alpha:0,v:0,idx:0,lap:0,half:true,prog:0,lat:0,boost:0,lane:0,laneT:0,laneTimer:0,
    skill:1,cornerSkill:1,y:0,grade:0,db:0,dIn:0,remote:false,nid:null,finished:false,finishTime:0,drifting:false,driftDir:0,exitT:0,prevBrake:false,boosting:false,slip:false,steerS:0,puffT:0,racer:-1};
}
function pickOpponents(n){n=n??(SV.set.racers-1);const others=[...Array(10).keys()].filter(r=>r!==SV.sel.r);
  for(let i=others.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[others[i],others[j]]=[others[j],others[i]];}
  return others.slice(0,n).map(r=>({r,t:TYPES[Math.floor(Math.random()*4)]}));}
let rivals=null;
function syncRivals(){const n=SV.set.racers-1;if(!rivals)rivals=pickOpponents(n);
  rivals=rivals.filter(o=>o.r!==SV.sel.r);const used=new Set(rivals.map(o=>o.r));
  while(rivals.length<n){const free=[...Array(10).keys()].filter(r=>r!==SV.sel.r&&!used.has(r));if(!free.length)break;const r=free[Math.floor(Math.random()*free.length)];used.add(r);rivals.push({r,t:TYPES[Math.floor(Math.random()*4)]});}
  rivals=rivals.slice(0,n);return rivals;}
function startRace(ti,opps){
  LAPS=SV.set.laps;if(!headless||TI!==ti||!P.length)buildTrack(ti);cars=[];wallHits=0;
  const slots=opps.length+1,pid=carId(SV.sel.r,TYPES[SV.sel.t]),pSlot=mode==='gp'&&GP&&GP.race>0?gridSlotFromStandings(slots):Math.max(0,slots-2),df=DIFF[SV.set.diff];let ai=0;
  for(let k=0;k<slots;k++){let c;
    if(k===pSlot){c=newCar(pid,'YOU',true);player=c;}
    else{const o=opps[ai];c=newCar(carId(o.r,o.t),RACERS[o.r].name.split(' ')[0],false);c.racer=o.r;
      c.skill=df.pace[1]-(df.pace[1]-df.pace[0])*(ai/Math.max(1,opps.length-1));c.cornerSkill=df.corner;ai++;}
    const row=Math.floor(k/2),side=k%2?1:-1,i=((N-3-row*6)%N+N)%N;
    c.idx=i;c.lane=side*4.5;c.laneT=c.lane;c.x=P[i].x+R[i].x*c.lane;c.z=P[i].z+R[i].z*c.lane;c.h=c.ma=Math.atan2(T[i].x,T[i].z);c.laneTimer=2+Math.random()*3;cars.push(c);
  }
  if(!headless)initAudio();raceTime=0;lapStart=0;bestLap=null;driftTime=0;state='countdown';cd=3.999;resultsTimer=0;lastRace={ti,opps};
  if(!headless){const rec=SV.rec[ti];$('best').textContent=rec?'RECORD '+fmt(rec):'';closeScreens();showHUD(true);gantry.forEach(m=>m.color.setHex(0x331111));}
}
function gridSlotFromStandings(n){const st=gpTable();const pos=st.findIndex(e=>e.key==='P');return clamp(pos+1,0,n-1);}

// ================= input =================
const keys={};let lastInput='pointer';
addEventListener('keydown',e=>{keys[e.code]=true;lastInput='key';document.body.classList.add('kbd');
  if(inMenu()){menuKey(e);return;}
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
  if(e.code==='Escape'||e.code==='KeyP')togglePause();});
addEventListener('keyup',e=>{keys[e.code]=false;});
addEventListener('pointerdown',()=>{lastInput='pointer';document.body.classList.remove('kbd');},true);
const tc={left:false,right:false,brake:false,drift:false,boost:false};
[['tL','left'],['tR','right'],['tK','brake'],['tD','drift'],['tB','boost']].forEach(([id,k])=>{
  const el=$(id);const on=e=>{e.preventDefault();tc[k]=true;el.classList.add('on');};const off=e=>{e.preventDefault();tc[k]=false;el.classList.remove('on');};
  el.addEventListener('pointerdown',on);el.addEventListener('pointerup',off);el.addEventListener('pointercancel',off);el.addEventListener('pointerleave',off);});
let pad=null,padPrev={},padName='',repeatT=0;
function readPad(dt){
  let gp=null;try{const l=navigator.getGamepads?navigator.getGamepads():[];for(const g of l){if(g&&g.connected){gp=g;break;}}}catch(e){}
  if(!gp){if(padName){padName='';$('padStatus').textContent='';}pad=null;return;}
  if(gp.id!==padName){padName=gp.id;$('padStatus').textContent='🎮 Controller connected';}
  const b=i=>gp.buttons[i]||{pressed:false,value:0};
  let sx=gp.axes[0]||0,sy=gp.axes[1]||0;sx=Math.abs(sx)<.15?0:Math.sign(sx)*(Math.abs(sx)-.15)/.85;
  if(b(14).pressed)sx=-1;if(b(15).pressed)sx=1;
  const now={a:b(0).pressed,b:b(1).pressed,x:b(2).pressed,y:b(3).pressed,lb:b(4).pressed,rb:b(5).pressed,lt:b(6).value>.5,rt:b(7).value>.5,start:b(9).pressed,select:b(8).pressed,
    left:b(14).pressed||sx<-.6,right:b(15).pressed||sx>.6,up:b(12).pressed||sy<-.6,down:b(13).pressed||sy>.6};
  const press=k=>now[k]&&!padPrev[k];
  if(Object.keys(now).some(k=>now[k])){lastInput='pad';document.body.classList.add('kbd');}
  const rx=gp.axes[2]||0,ry=gp.axes[3]||0;pad={steer:sx,gas:b(7).value,brake:b(6).value,drift:now.a||now.rb,boost:now.x||now.b||now.lb,rx:Math.abs(rx)>.15?rx:0,ry:Math.abs(ry)>.15?ry:0};
  if(inMenu()){let dir=null;for(const k of['left','right','up','down'])if(now[k]){dir=k;break;}
    if(dir){if(!padPrev[dir]){navMove(dir);repeatT=.35;}else{repeatT-=dt;if(repeatT<=0){navMove(dir);repeatT=.12;}}}
    if(gView){if(press('b')||press('y')||press('a'))setGView(false);padPrev=now;return;}
    if(press('a')||press('start'))navActivate();if(press('b'))goBack();
    for(const k of['lb','rb','lt','rt','y','x'])if(press(k))screenHook(k);
  }else if(press('start'))togglePause();
  padPrev=now;
}
function playerInput(c,dt){
  let st=0;if(keys.ArrowLeft||keys.KeyA||tc.left)st-=1;if(keys.ArrowRight||keys.KeyD||tc.right)st+=1;
  let gas=isTouch?!tc.brake:!!(keys.ArrowUp||keys.KeyW),brake=!!(keys.ArrowDown||keys.KeyS||tc.brake);
  let drift=!!(keys.Space||tc.drift),boost=!!(keys.ShiftLeft||keys.ShiftRight||keys.KeyX||tc.boost);
  if(pad){if(Math.abs(pad.steer)>Math.abs(st))st=pad.steer;if(pad.gas>.2)gas=true;if(pad.brake>.3)brake=true;drift=drift||pad.drift;boost=boost||pad.boost;}
  const analog=pad&&Math.abs(pad.steer)>0&&Math.abs(pad.steer)<1;
  c.steerS=analog?st:c.steerS+(st-c.steerS)*Math.min(1,dt*8);
  return {steer:c.steerS,gas,brake,drift,boost};
}

// ================= AI =================
// Looks ahead along the racing line, works out how fast the coming corner can be taken
// (faster if it drifts), drifts through tight corners to earn boost, and boosts on straights.
function aiInput(c,dt){
  const df=DIFF[SV.set.diff];
  c.laneTimer-=dt;if(c.laneTimer<0){c.laneT=(Math.random()*2-1)*5.5;c.laneTimer=2+Math.random()*4;}
  // swing wide before corners and cut to the inside: a simple racing line
  const ahead=curvA[(c.idx+30)%N]||0;const lineOff=clamp(-ahead*5,-5.5,5.5);
  c.lane+=((c.laneT*.4+lineOff*.6)-c.lane)*Math.min(1,dt*.9);
  const look=Math.round(7+Math.max(0,c.v)*.11),j=(c.idx+look)%N;
  const want=Math.atan2(P[j].x+R[j].x*c.lane-c.x,P[j].z+R[j].z*c.lane-c.z),err=angDiff(want,c.ma);
  // corner speed: peak curvature in the next stretch
  let kmax=0;const span=Math.round(20+c.v*.6);for(let k=8;k<span;k+=4){kmax=Math.max(kmax,Math.abs(curvA[(c.idx+k)%N]||0));}
  const kappa=kmax/40;// rad per unit
  const canDrift=kmax>.55&&c.v>24;
  const rate=c.spec.turn*(canDrift?.98*c.spec.driftTurn:.8)*c.cornerSkill;
  let target=Math.min(c.spec.top*c.skill,kappa>1e-4?rate/kappa*.95:999);
  if(!c.isPlayer&&player&&!player.finished){const gap=(c.prog-player.prog)/N;if(gap>.1)target*=df.ahead;else if(gap<-.06)target*=df.behind;}
  const steer=clamp(-err*2.7,-1,1),turnDir=Math.sign(-(curvA[(c.idx+12)%N]||0));
  const drift=canDrift&&Math.sign(steer)===turnDir&&Math.abs(err)>.03;
  return {steer,gas:c.v<target,brake:c.v>target+6,drift,boost:c.boost>(c.isPlayer?.3:df.boost)&&kmax<.25,ai:true};
}

// ================= physics =================
// The direction of travel (ma) is what steering controls; the nose (h) is offset by the slide angle (alpha).
// Drifting turns the car harder and smoothly swings the tail out, so it never snaps or spins.
function physics(c,inp,dt){
  const s=c.spec,off=Math.abs(c.lat)>HW+1.6;let maxV=s.top*(c.isPlayer?1:c.skill);c.thr=inp.gas;
  c.boosting=inp.boost&&c.boost>.01&&c.v>5;
  if(c.boosting){maxV*=s.bpow;c.boost=Math.max(0,c.boost-dt*s.drain);}
  if(c.slip)maxV*=1.04;if(off)maxV*=.62;
  if(inp.gas){if(c.v<maxV)c.v+=s.acc*(c.boosting?1.6:1)*(1-.4*clamp(c.v/maxV,0,1))*dt;}else c.v-=Math.sign(c.v)*Math.min(Math.abs(c.v),9*dt);
  if(c.v>maxV)c.v-=Math.min(c.v-maxV,(off?45:20)*dt);
  const brakeTap=inp.brake&&!c.prevBrake;c.prevBrake=inp.brake;
  c.tapT=(c.tapT||0)+dt;let dbl=false;if(brakeTap){if(c.tapT<.35)dbl=true;c.tapT=0;}
  if(dbl&&!inp.ai){if(c.latch){c.latch=false;}else c.latch=true;}
  const wantDrift=inp.drift||c.latch;
  if(!c.drifting&&wantDrift&&c.v>19&&Math.abs(inp.steer)>.25){c.drifting=true;c.driftDir=Math.sign(inp.steer);c.exitT=0;c.dIn=Math.abs(inp.steer)*.8;}
  if(c.latch&&c.v<15)c.latch=false;
  if(inp.brake&&!(c.latch&&c.tapT<.25))c.v-=(c.v>0?(c.drifting?16:48):15)*dt;
  c.v=Math.max(-14,c.v);
  const spdF=Math.min(1,Math.abs(c.v)/12)*(c.v<0?-1:1);
  // grip steering, and a drift rate the car eases into over ~0.25 s so nothing snaps
  const gripRate=s.turn*inp.steer*spdF*(1-.2*clamp(c.v/s.top,0,1.2))*(off?.8:1);
  if(c.drifting){const into=inp.steer*c.driftDir;c.dIn+=(into-c.dIn)*Math.min(1,dt*6);c.db=Math.min(1,c.db+dt*6.5);}
  else{c.db=Math.max(0,c.db-dt*6);c.dIn+=(inp.steer*c.driftDir-c.dIn)*Math.min(1,dt*8);}
  const driftRate=c.driftDir*s.turn*(.5+.5*c.dIn)*s.driftTurn*spdF;
  c.ma-=(c.db>0?gripRate*(1-c.db)+driftRate*c.db:gripRate)*dt;
  const tgtA=c.drifting?c.driftDir*clamp(.46+.26*c.dIn,.18,.72)*Math.min(1,c.db*1.3):0;
  c.alpha+=(tgtA-c.alpha)*Math.min(1,dt*(c.drifting?5:4.2));
  if(c.drifting){
    c.v-=c.v*s.scrub*.35*dt;c.boost=Math.min(1,c.boost+dt*.24*s.driftGain*c.db);if(c.isPlayer)driftTime+=dt;
    const into=inp.steer*c.driftDir;
    if(c.latch&&!inp.drift){if(into<-.5||Math.abs(inp.steer)<.12)c.exitT+=dt;else c.exitT=Math.max(0,c.exitT-dt*2);if(c.exitT>.6){c.latch=false;}}
    if(!inp.drift&&!c.latch)c.drifting=false;
    if(c.v<15){c.drifting=false;c.latch=false;}
    if(c.mesh){c.puffT-=dt;if(c.puffT<0){c.puffT=.05;const bx=c.x-Math.sin(c.h)*1.9,bz=c.z-Math.cos(c.h)*1.9,cx=Math.cos(c.h)*1.1,cz=Math.sin(c.h)*1.1;
      puff(bx+cx,bz-cz,0xf4f4f4,c.y);puff(bx-cx,bz+cz,0xf4f4f4,c.y);skid(bx+cx,bz-cz,c.y,c.h);skid(bx-cx,bz+cz,c.y,c.h);}}
  }else if(off&&c.v>20&&c.mesh){c.puffT-=dt;if(c.puffT<0){c.puffT=.08;puff(c.x-Math.sin(c.h)*2,c.z-Math.cos(c.h)*2,0xb8956a,c.y);}}
  if(c.grade)c.v-=c.grade*10*dt;
  if(c.v>SPEED_CAP)c.v=SPEED_CAP;
  c.h=c.ma-c.alpha;
  c.x+=Math.sin(c.ma)*c.v*dt;c.z+=Math.cos(c.ma)*c.v*dt;
}
function surfY(c){if(c.isPlayer&&window.__odo){const o=window.__odo;if(o.px!=null)o.d+=Math.hypot(c.x-o.px,c.z-o.pz);o.px=c.x;o.pz=c.z;o.n++;o.vs+=c.v;o.maxv=Math.max(o.maxv,c.v);}const i=c.idx,a=HG[(i-1+N)%N],b=HG[(i+1)%N],pr=(c.x-P[i].x)*T[i].x+(c.z-P[i].z)*T[i].z;
  c.grade=(HG[(i+2)%N]-HG[(i-2+N)%N])/8;c.y=HG[i]+pr*(b-a)/4+clamp(c.lat,-WALL,WALL)*BK[i];}
function updateIdx(c){
  let best=c.idx,bd=1e18;for(let k=-25;k<=25;k++){const i=(c.idx+k+N)%N,dx=P[i].x-c.x,dz=P[i].z-c.z,d=dx*dx+dz*dz;if(d<bd){bd=d;best=i;}}
  const prev=c.idx;c.idx=best;
  if(c.remote){}else if(prev>N*.75&&best<N*.25){if(c.half){c.lap++;c.half=false;onLap(c);}}else if(prev<N*.25&&best>N*.75){c.lap--;c.half=true;}
  if(best>N*.4&&best<N*.6)c.half=true;c.prog=c.lap*N+best;c.lat=(c.x-P[best].x)*R[best].x+(c.z-P[best].z)*R[best].z;
}
function walls(c){if(Math.abs(c.lat)>WALL){const r=R[c.idx],ex=c.lat-Math.sign(c.lat)*WALL;c.x-=r.x*ex;c.z-=r.z*ex;
  const th=Math.atan2(T[c.idx].x,T[c.idx].z);c.ma+=angDiff(th,c.ma)*.35;c.alpha*=.7;if(Math.abs(angDiff(th,c.ma))>.25){c.drifting=false;c.latch=false;}c.v*=.985;c.lat=Math.sign(c.lat)*WALL;
  if(c.isPlayer){if(!c.onWall){wallHits++;if(window.__wallLog)window.__wallLog.push([+raceTime.toFixed(1),c.idx,+c.lat.toFixed(1),+c.v.toFixed(0),c.drifting?1:0,+angDiff(Math.atan2(T[c.idx].x,T[c.idx].z),c.ma).toFixed(2)]);}c.onWall=true;if(c.v>25){shake=Math.max(shake,.25);if(Math.random()<.2)thud();}}}else c.onWall=false;}
function collisions(){for(let i=0;i<cars.length;i++)for(let j=i+1;j<cars.length;j++){const a=cars[i],b=cars[j],dx=b.x-a.x,dz=b.z-a.z,d2=dx*dx+dz*dz;
  if(a.remote&&b.remote)continue;
  if(d2<10.24&&d2>1e-4){const d=Math.sqrt(d2),p=(3.2-d)/2,nx=dx/d,nz=dz/d,pa=b.remote?p*2:(a.remote?0:p),pb=a.remote?p*2:(b.remote?0:p);a.x-=nx*pa;a.z-=nz*pa;b.x+=nx*pb;b.z+=nz*pb;
    if((dx*Math.sin(a.ma)+dz*Math.cos(a.ma))>0)a.v*=.99;else b.v*=.99;if((a.isPlayer||b.isPlayer)&&p>.3){shake=Math.max(shake,.18);thud();}}}}
function slipstream(c,dt){c.slip=false;c.slipT=null;if(c.v<26)return;let best=1e9;
  for(const o of cars){if(o===c)continue;const dx=o.x-c.x,dz=o.z-c.z,d=Math.hypot(dx,dz);
    if(d>3.5&&d<26&&d<best&&(dx*Math.sin(c.ma)+dz*Math.cos(c.ma))/d>.93){best=d;c.slipT=o;}}
  if(c.slipT){c.slipCharge=Math.min(1,(c.slipCharge||0)+dt*2.5);c.slip=c.slipCharge>.35;if(c.slip)c.boost=Math.min(1,c.boost+dt*.2*(1.3-best/26));}
  else c.slipCharge=Math.max(0,(c.slipCharge||0)-dt*3);}
function onLap(c){if(c.isPlayer&&window.__lapLog)window.__lapLog.push([+raceTime.toFixed(2),c.lap,c.idx]);
  if(c.isPlayer&&!c.finished){if(c.lap===1)lapStart=raceTime;else{const lt=raceTime-lapStart;lapStart=raceTime;if(bestLap==null||lt<bestLap)bestLap=lt;
    if(c.lap<=LAPS&&!headless)flash(c.lap===LAPS?'FINAL LAP!':'LAP '+c.lap,fmt(lt));}}
  if(c.lap>LAPS&&!c.finished){c.finished=true;c.finishTime=raceTime;if(c.isPlayer)finishRace();}
}
const rankKey=c=>c.finished?1e9-c.finishTime:c.prog;
const standings=()=>cars.slice().sort((a,b)=>rankKey(b)-rankKey(a));

// one simulation tick (no drawing) — also used by the balance tests
function step(dt){
  if(state==='countdown'){const pc=Math.ceil(cd);cd-=dt;if(mode==='online'&&NET.race)cd=(NET.race.startAt-srvNow())/1000;const cc=Math.ceil(cd);
    if(!headless){const lit=4-Math.max(0,cc);gantry.forEach((m,k)=>m.color.setHex(cd<=0?0x22ff66:(k<lit?0xff2222:0x331111)));
      if(cd>0){if(cc!==pc)beep(440,.15);$('msg').textContent=cc;$('msg').style.opacity=1;msgT=1;}}
    if(cd<=0){if(mode==='online'&&NET.race)raceTime=Math.max(0,-cd);state='race';if(!headless){flash('GO!');beep(880,.3);gantry.forEach(m=>m.color.setHex(0x22ff66));}}}
  const racing=state==='race'||state==='done';if(racing)raceTime+=dt;
  for(const c of cars){let inp;
    if(c.remote){netRemote(c,dt);updateIdx(c);c.prog=c.lap*N+c.idx;surfY(c);continue;}
    if(!racing){inp={steer:0,gas:false,brake:false,drift:false,boost:false};if(c.isPlayer&&!autoPilot&&!headless)c.thr=playerInput(c,dt).gas;}
    else if(c.isPlayer&&window.__inp)inp=window.__inp(c,raceTime);
    else if(c.isPlayer&&!c.finished&&!autoPilot)inp=playerInput(c,dt);
    else if(c.isPlayer&&mode==='online'){inp={steer:0,gas:false,brake:true,drift:false,boost:false};}else inp=aiInput(c,dt);
    if(racing||!c.isPlayer||autoPilot||headless){slipstream(c,dt);physics(c,inp,dt);}else{const th=c.thr;physics(c,inp,dt);c.thr=th;}updateIdx(c);walls(c);surfY(c);}
  collisions();
}

// ================= economy =================
const PRIZE=[1500,1000,750,500,350,250,200,150,100,75],PTS=[10,8,6,5,4,3,2,1,0,0],DIFF_MULT=[.8,1,1.4],DIFF_NAME=['Easy','Normal','Hard'];
let lastEarn=null;
function finishRace(){
  state='done';const st=standings(),place=st.indexOf(player)+1;
  if(headless)return;
  if(mode==='online')netFinish();
  if(bestLap!=null)submitRecord(TI,bestLap);
  flash(place===1?'YOU WIN!':'FINISH!',ord(place)+' place');resultsTimer=3;beep(660,.12);setTimeout(()=>beep(880,.25),130);
  const mult=DIFF_MULT[SV.set.diff]*(LAPS/3)*(1+(cars.length-6)*.05);const e={place:Math.round(PRIZE[place-1]*mult),drift:Math.round(driftTime*15),record:0};
  if(bestLap!=null&&(SV.rec[TI]==null||bestLap<SV.rec[TI])){if(SV.rec[TI]!=null)e.record=500;SV.rec[TI]=+bestLap.toFixed(3);}
  e.total=e.place+e.drift+e.record;SV.money+=e.total;lastEarn=e;save();
}

// ================= audio =================
// Engine: layered detuned oscillators through soft clipping and a throttle-driven filter, with a 5-speed gearbox.
// Extra layers: tire screech while drifting, rumble off-road, wind at speed and a boost whoosh.
let AC=null,AU=null;
function initAudio(){if(AC){try{AC.resume();}catch(e){}return;}
  try{AC=new(window.AudioContext||window.webkitAudioContext)();
    const master=AC.createGain();master.gain.value=.9;const comp=AC.createDynamicsCompressor();comp.threshold.value=-18;comp.ratio.value=4;master.connect(comp);comp.connect(AC.destination);
    const eg=AC.createGain();eg.gain.value=0;const lp=AC.createBiquadFilter();lp.type='lowpass';lp.Q.value=1.2;
    const sh=AC.createWaveShaper(),cv=new Float32Array(512);for(let i=0;i<512;i++){const x=i/255.5-1;cv[i]=Math.tanh(x*2.2);}sh.curve=cv;
    const oscs=[['sawtooth',1,.32],['sawtooth',1.007,.26],['square',.5,.3],['triangle',2,.12],['sine',.25,.35]].map(([t,m,g])=>{const o=AC.createOscillator();o.type=t;const gg=AC.createGain();gg.gain.value=g;o.connect(gg);gg.connect(sh);o.start();return{o,m};});
    sh.connect(lp);lp.connect(eg);eg.connect(master);
    const nb=AC.createBuffer(1,AC.sampleRate*2,AC.sampleRate),nd=nb.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;
    const noise=(type,f,q)=>{const s=AC.createBufferSource();s.buffer=nb;s.loop=true;const fl=AC.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q;const g=AC.createGain();g.gain.value=0;s.connect(fl);fl.connect(g);g.connect(master);s.start();return{g,fl};};
    AU={oscs,lp,eg,screech:noise('bandpass',1150,6),rumble:noise('lowpass',160,1),wind:noise('highpass',2200,.6),whoosh:noise('bandpass',520,.9),gear:0,shiftT:0};
  }catch(e){AC=null;AU=null;}}
function beep(fr,dur=.15,vol=.12,type='square'){if(!AC||!SV.set.sound||headless)return;try{const o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.value=fr;
  g.gain.setValueAtTime(vol,AC.currentTime);g.gain.exponentialRampToValueAtTime(.001,AC.currentTime+dur);o.connect(g);g.connect(AC.destination);o.start();o.stop(AC.currentTime+dur);}catch(e){}}
let lastThud=0;function thud(){const n=performance.now();if(n-lastThud<200)return;lastThud=n;beep(90,.12,.15,'triangle');}
const click=()=>beep(520,.05,.06);
const GEARS=[0,.17,.33,.5,.69,.9,1.5];
function updAudio(dt){if(!AU)return;const t=AC.currentTime,on=SV.set.sound&&(state==='race'||state==='countdown'||state==='done')&&player&&!cur;
  const v=player?Math.max(0,player.v):0,r=player?clamp(v/player.spec.top,0,1.4):0,thr=player&&player.thr?1:0;
  let g=0;while(g<5&&r>GEARS[g+1])g++;if(g>AU.gear)AU.shiftT=.14;AU.gear=g;AU.shiftT-=dt||0;
  let rpm=.3+.7*clamp((r-GEARS[g])/(GEARS[g+1]-GEARS[g]),0,1);if(g===5)rpm=Math.min(1.05,.3+.7*(r-GEARS[5])/(1.15-GEARS[5]));
  if(state==='countdown')rpm=.22+thr*.55;if(player&&player.boosting)rpm=Math.min(1.1,rpm+.06);
  const f=34+rpm*96;for(const o of AU.oscs)o.o.frequency.setTargetAtTime(f*o.m,t,.035);
  AU.lp.frequency.setTargetAtTime(300+rpm*1400+thr*900,t,.05);
  const tun=player&&inTun[player.idx]?1.45:1,dip=AU.shiftT>0?.4:1;
  AU.eg.gain.setTargetAtTime(on?(.05+.05*thr+.03*rpm)*dip*tun:0,t,.04);
  const dr=on&&player.drifting;AU.screech.g.gain.setTargetAtTime(dr?.05+Math.abs(player.alpha)*.1:0,t,.07);AU.screech.fl.frequency.setTargetAtTime(1000+Math.sin(t*9)*120+Math.random()*120,t,.04);
  AU.rumble.g.gain.setTargetAtTime(on&&Math.abs(player.lat)>HW+1.6&&v>8?.22:0,t,.06);
  AU.wind.g.gain.setTargetAtTime(on?r*r*.03+(player.slip?.06:0):0,t,.12);AU.whoosh.g.gain.setTargetAtTime(on&&player.boosting?.12:0,t,.08);}

// ================= menus / navigation =================
let cur=null;
const SCR={title:{bg:'orbit'},main:{bg:'orbit',back:'title'},racer:{bg:'show',back:'setup'},car:{bg:'show',back:'racer'},
  setup:{bg:'orbit',back:'main'},online:{bg:'orbit',back:'main'},room:{bg:'show',back:'online'},track:{bg:'orbit',back:'setup'},cup:{bg:'orbit',back:'setup'},garage:{bg:'show',back:'main'},settings:{bg:'orbit',back:'main'},
  results:{bg:'race'},stand:{bg:'race'},pause:{bg:'race'}};
let bgMode='orbit',menuT=0;
function inMenu(){return cur!==null;}
function go(name,opts){
  if(SCR[name].bg!=='race'&&state!=='menu'){state='menu';showHUD(false);}
  document.querySelectorAll('.screen').forEach(s=>s.classList.add('hidden'));
  cur=name;$('s-'+name).classList.remove('hidden');bgMode=SCR[name].bg;
  document.body.dataset.scr=name;if(name!=='garage'&&gView){gView=false;$('s-garage').classList.remove('viewing');}
  $('cash').classList.toggle('hidden',name==='title'||name==='pause');$('cash').textContent=money(SV.money);
  const r=RENDER[name];if(r)r(opts||{});focusFirst();
}
function closeScreens(){document.querySelectorAll('.screen').forEach(s=>s.classList.add('hidden'));cur=null;$('cash').classList.add('hidden');document.body.dataset.scr='';}
function goBack(){if(!cur)return;if(cur==='racer'&&mode==='online'){click();go('room');return;}if(gView){setGView(false);return;}if(cur==='pause'){togglePause();return;}const b=SCR[cur].back;if(b){click();go(b);}}
function focusables(){const el=$('s-'+cur);return el?[...el.querySelectorAll('button:not([disabled])')].filter(b=>b.offsetParent!==null):[];}
function focusFirst(){const f=focusables();if(!f.length)return;const s=f.find(b=>b.classList.contains('sel'))||f[0];s.focus({preventScroll:true});s.scrollIntoView({block:'nearest',inline:'nearest'});}
function navMove(dir){const f=focusables();if(!f.length)return;let a=document.activeElement;if(!f.includes(a)){focusFirst();return;}
  const ra=a.getBoundingClientRect(),ax=ra.left+ra.width/2,ay=ra.top+ra.height/2;let best=null,bs=1e9;
  for(const b of f){if(b===a)continue;const rb=b.getBoundingClientRect(),bx=rb.left+rb.width/2,by=rb.top+rb.height/2,dx=bx-ax,dy=by-ay;
    let p,s;if(dir==='left'){p=-dx;s=Math.abs(dy);}else if(dir==='right'){p=dx;s=Math.abs(dy);}else if(dir==='up'){p=-dy;s=Math.abs(dx);}else{p=dy;s=Math.abs(dx);}
    if(p<4)continue;const sc=p+s*2.2;if(sc<bs){bs=sc;best=b;}}
  if(best){best.focus({preventScroll:true});best.scrollIntoView({block:'nearest',inline:'nearest'});beep(700,.03,.04);}}
function navActivate(){const a=document.activeElement;if(a&&a.tagName==='BUTTON'&&focusables().includes(a))a.click();else focusFirst();}
function screenHook(k){const h=HOOK[cur];if(h&&h[k])h[k]();}
function menuKey(e){if(e.target&&e.target.tagName==='INPUT'){if(e.code==='Escape')e.target.blur();return;}const map={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'};
  if(map[e.code]){e.preventDefault();navMove(map[e.code]);return;}
  if(e.code==='Escape'||e.code==='Backspace'){e.preventDefault();goBack();return;}
  const hk={KeyQ:'lb',KeyE:'rb',KeyZ:'lt',KeyC:'rt',KeyT:'y'}[e.code];if(hk)screenHook(hk);
  if(cur==='title'){e.preventDefault();toMain();}}
function toMain(){initAudio();click();go('main');}
function toast(t){const el=$('toast');el.textContent=t;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),1600);}
function onFocusPreview(el,fn){el.addEventListener('focus',fn);el.addEventListener('pointerenter',()=>{if(!isTouch)fn();});}
const img=src=>src?`<img src="${src}" alt="">`:'<div class="noimg"></div>';
function statBars(id,showUp){const c=carInfo(id),u=up(id),col=TYPE_COLOR[c.type];
  const row=(l,v,b)=>`<div class="sb"><b>${l}</b><i>${Array.from({length:10},(_,k)=>`<u style="background:${k<v?col:(k<v+b?'#fff':'')}"></u>`).join('')}</i><em>${v}${b?'<small>+'+b+'</small>':''}</em></div>`;
  const bu=showUp?[Math.round(u.eng*.4),Math.round(u.tur*.4),Math.round(u.tir*.4)]:[0,0,0];
  return row('SPD',c.spd,bu[0])+row('ACC',c.acc,bu[1])+row('DRIFT',c.drf,bu[2]);}
function thumb(ti,w,h){const cv=document.createElement('canvas');cv.width=w*2;cv.height=h*2;const g=cv.getContext('2d');const S=D.resample(D.catmull(TRACKS[ti].pts,8),12);
  let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;S.forEach(p=>{x0=Math.min(x0,p[0]);x1=Math.max(x1,p[0]);z0=Math.min(z0,p[1]);z1=Math.max(z1,p[1]);});
  const s=Math.min((w*2-16)/(x1-x0),(h*2-16)/(z1-z0)),ox=w-(x0+x1)/2*s,oz=h-(z0+z1)/2*s;
  g.lineJoin='round';g.strokeStyle=hex(THEMES[TRACKS[ti].theme].wall[1]);g.lineWidth=10;g.beginPath();S.forEach((p,i)=>i?g.lineTo(ox+p[0]*s,oz+p[1]*s):g.moveTo(ox+p[0]*s,oz+p[1]*s));g.closePath();g.stroke();
  g.strokeStyle='#fff';g.lineWidth=7;g.stroke();g.strokeStyle='#3a3f4a';g.lineWidth=4;g.stroke();return cv;}
function diffChips(host){host.innerHTML='<span>DIFFICULTY</span>';[0,1,2].forEach(d=>{const b=document.createElement('button');b.className='chip d'+d+(SV.set.diff===d?' on':'');b.textContent=DIFF_NAME[d];
  b.onclick=()=>{SV.set.diff=d;save();click();host.querySelectorAll('.chip').forEach((x,k)=>x.classList.toggle('on',k===d));};host.appendChild(b);});
  const n=document.createElement('small');n.textContent='Hard pays ×1.4';host.appendChild(n);}
const DESC={balanced:'Even all-rounder. Easy to drive anywhere.',speed:'Highest top speed. Shines on long straights.',accel:'Explodes out of corners and recovers fast after bumps.',drift:'Holds long, tight drifts and charges boost quickest.'};

const RENDER={
  main(){if(mode==='online')mode='single';},
  setup(o){const gp=mode==='gp',id=carId(SV.sel.r,TYPES[SV.sel.t]),c=carInfo(id),R0=RACERS[SV.sel.r];syncRivals();
    $('suTitle').textContent=gp?'GRAND PRIX SETUP':'RACE SETUP';
    $('suYou').innerHTML=`<div class="por" style="--tc:${hex(R0.body)}">${img(racerThumb(SV.sel.r))}</div><div class="suy"><b>${R0.name}</b><span style="color:${TYPE_COLOR[c.type]}">${c.name} · ${TYPE_LABEL[c.type]}</span></div><div class="sucar">${img(carThumb(id))}</div>`;
    const ti=gp?SV.sel.cup*5:SV.sel.track,td=TRACKS[ti],th=THEMES[td.theme];
    $('suTrack').innerHTML='';$('suTrack').appendChild(thumb(ti,90,58));
    $('suTrack').insertAdjacentHTML('beforeend',gp?`<div class="suy"><b>${th.cup}</b><span>${th.name} · 5 races</span></div>`:`<div class="suy"><b>${ti+1}. ${td.name}</b><span>${th.name} · ${(td.len*TS/1000).toFixed(1)} km</span></div>`);
    $('suPickTrack').textContent=gp?'CHOOSE CUP':'CHOOSE TRACK';
    const step=(d)=>{if(gp)SV.sel.cup=(SV.sel.cup+d+10)%10;else SV.sel.track=(SV.sel.track+d+50)%50;save();click();RENDER.setup({keep:d<0?'tprev':'tnext'});};
    $('suPrevT').onclick=()=>step(-1);$('suNextT').onclick=()=>step(1);$('suPickTrack').onclick=()=>{click();go(gp?'cup':'track');};
    $('suCar').onclick=()=>{click();go('racer');};$('suGarage').onclick=()=>{click();go('garage');};
    const rows=$('suRows');rows.innerHTML='';
    const row=(label,val,dec,inc,k)=>{const d=document.createElement('div');d.className='setrow';d.innerHTML=`<span>${label}</span>`;
      const a=document.createElement('button');a.textContent='◀';a.dataset.k=k+0;a.onclick=()=>{dec();save();click();RENDER.setup({keep:k+0});};
      const v=document.createElement('em');v.textContent=val;const b=document.createElement('button');b.textContent='▶';b.dataset.k=k+1;b.onclick=()=>{inc();save();click();RENDER.setup({keep:k+1});};
      d.append(a,v,b);rows.appendChild(d);};
    row(gp?'Laps per race':'Laps',SV.set.laps,()=>SV.set.laps=Math.max(1,SV.set.laps-1),()=>SV.set.laps=Math.min(10,SV.set.laps+1),'laps');
    row('Racers',SV.set.racers,()=>SV.set.racers=Math.max(2,SV.set.racers-1),()=>SV.set.racers=Math.min(10,SV.set.racers+1),'rac');
    row('Difficulty',DIFF_NAME[SV.set.diff],()=>SV.set.diff=Math.max(0,SV.set.diff-1),()=>SV.set.diff=Math.min(2,SV.set.diff+1),'dif');
    const rl=$('suRivals');rl.innerHTML=rivals.map((o,i)=>{const cc=D.carDef(o.r,o.t),RR=RACERS[o.r];
      return `<div class="riv"><i style="background:${hex(RR.body)}"></i><b>${RR.name}</b><span style="color:${TYPE_COLOR[o.t]}">${cc.name}</span></div>`;}).join('');
    $('suCount').textContent=`RIVALS (${rivals.length})`;
    $('suShuffle').onclick=()=>{rivals=null;syncRivals();click();RENDER.setup({keep:'shuffle'});};
    $('suGo').textContent=gp?'START CUP':'START RACE';
    $('suGo').onclick=()=>{click();if(gp)startGP(SV.sel.cup);else startRace(SV.sel.track,rivals.map(o=>({...o})));};
    previewTrack(ti);worldTop(gp?-1:ti,$('suWorld'));
    if(o&&o.keep){const b=document.querySelector(`#s-setup [data-k="${o.keep}"]`)||document.querySelector(`#s-setup #${{tprev:'suPrevT',tnext:'suNextT',shuffle:'suShuffle'}[o.keep]||'x'}`);if(b)b.focus({preventScroll:true});}
    HOOK.setup={lb:()=>step(-1),rb:()=>step(1),y:()=>$('suShuffle').click()};},
  racer(){const el=$('racerGrid');el.innerHTML='';
    RACERS.forEach((R,i)=>{const b=document.createElement('button');b.className='opt racer'+(i===SV.sel.r?' sel':'');b.style.setProperty('--tc',hex(R.body));
      b.innerHTML=`<div class="por">${img(racerThumb(i))}</div><div>${R.name}</div><small>Team ${R.team}</small>`;
      onFocusPreview(b,()=>{setShowCar(carId(i,TYPES[SV.sel.t]));$('racerBio').innerHTML=`<b>${R.name}</b> — ${R.bio}`;});
      b.onclick=()=>{SV.sel.r=i;save();click();go('car');};el.appendChild(b);});
    setShowCar(carId(SV.sel.r,TYPES[SV.sel.t]));$('racerBio').innerHTML=`<b>${RACERS[SV.sel.r].name}</b> — ${RACERS[SV.sel.r].bio}`;
    $('racerTitle').textContent=mode==='gp'?'GRAND PRIX — CHOOSE RACER':'CHOOSE YOUR RACER';},
  car(){const el=$('carGrid');el.innerHTML='';$('carTitle').textContent=RACERS[SV.sel.r].name.toUpperCase()+"'S CARS";
    TYPES.forEach((t,k)=>{const id=carId(SV.sel.r,t),c=carInfo(id);const b=document.createElement('button');b.className='opt carc'+(k===SV.sel.t?' sel':'');b.style.setProperty('--tc',TYPE_COLOR[t]);
      b.innerHTML=`<div class="tl">${TYPE_LABEL[t].toUpperCase()}</div><div class="cimg">${img(carThumb(id))}</div><div class="cn">${c.name}</div>${statBars(id,true)}`;
      onFocusPreview(b,()=>{setShowCar(id);$('carDesc').textContent=TYPE_LABEL[t]+': '+DESC[t];});b.onclick=()=>{SV.sel.t=k;save();click();if(mode==='online'){netPushMe();go('room');}else go('setup');};el.appendChild(b);});
    setShowCar(carId(SV.sel.r,TYPES[SV.sel.t]));$('carDesc').textContent=TYPE_LABEL[TYPES[SV.sel.t]]+': '+DESC[TYPES[SV.sel.t]];},
  track(o){const tabs=$('cupTabs');tabs.innerHTML='';const cup=o.cup!=null?o.cup:Math.floor(SV.sel.track/5);
    THEMES.forEach((th,i)=>{const b=document.createElement('button');b.className='tab'+(i===cup?' on':'');b.style.setProperty('--tc',hex(th.night?th.wall[1]:th.sky));b.textContent=th.cup.replace(' Cup','');
      b.onclick=()=>{click();RENDER.track({cup:i});};tabs.appendChild(b);});
    const el=$('trackGrid');el.innerHTML='';
    for(let k=0;k<5;k++){const ti=cup*5+k,td=TRACKS[ti];const b=document.createElement('button');b.className='opt trk'+(ti===SV.sel.track?' sel':'');
      b.appendChild(thumb(ti,110,72));b.insertAdjacentHTML('beforeend',`<div>${ti+1}. ${td.name}</div><small>${(td.len*TS/1000).toFixed(1)} km · ${SV.rec[ti]?'Best '+fmt(SV.rec[ti]):'No record'}</small>`);
      onFocusPreview(b,()=>previewTrack(ti));b.onclick=()=>{SV.sel.track=ti;save();click();go('setup');};el.appendChild(b);}
    $('trackCup').textContent=THEMES[cup].cup.toUpperCase()+' · '+THEMES[cup].name;diffChips($('trackDiff'));
    $('trackCar').innerHTML=img(carThumb(carId(SV.sel.r,TYPES[SV.sel.t])))+`<span>${carInfo(carId(SV.sel.r,TYPES[SV.sel.t])).name}</span>`;
    HOOK.track={lb:()=>RENDER.track({cup:(cup+9)%10}),rb:()=>RENDER.track({cup:(cup+1)%10})};
    previewTrack(o.cup!=null?cup*5:SV.sel.track);if(o.cup!=null){const f=el.querySelector('button');if(f)f.focus({preventScroll:true});}},
  cup(){const el=$('cupGrid');el.innerHTML='';
    THEMES.forEach((th,i)=>{const b=document.createElement('button');b.className='opt cupc'+(i===SV.sel.cup?' sel':'');b.style.setProperty('--tc',hex(th.night?th.wall[1]:th.sky));
      const best=SV.gp[i];b.innerHTML=`<div>${th.cup}</div><small>${th.name} · 5 races</small><small class="trophy">${best?['🥇 Won','🥈 2nd','🥉 3rd'][best-1]:'—'}</small>`;
      onFocusPreview(b,()=>previewTrack(i*5));b.onclick=()=>{SV.sel.cup=i;save();click();go('setup');};el.appendChild(b);});
    diffChips($('cupDiff'));previewTrack(SV.sel.cup*5);},
  garage(o){renderGarage(o);},
  settings(){const s=SV.set,el=$('setList');el.innerHTML='';
    const row=(label,val,dec,inc)=>{const d=document.createElement('div');d.className='setrow';d.innerHTML=`<span>${label}</span>`;
      const a=document.createElement('button');a.textContent='◀';a.dataset.k=label+0;a.onclick=()=>{dec();save();click();RENDER.settings();refocus(label+0);};
      const v=document.createElement('em');v.textContent=val;const b=document.createElement('button');b.textContent='▶';b.dataset.k=label+1;b.onclick=()=>{inc();save();click();RENDER.settings();refocus(label+1);};
      d.append(a,v,b);el.appendChild(d);};
    row('Laps',s.laps,()=>s.laps=Math.max(1,s.laps-1),()=>s.laps=Math.min(10,s.laps+1));
    row('Difficulty',DIFF_NAME[s.diff],()=>s.diff=Math.max(0,s.diff-1),()=>s.diff=Math.min(2,s.diff+1));
    row('Sound',s.sound?'On':'Off',()=>s.sound=!s.sound,()=>s.sound=!s.sound);
    row('Camera',['Near','Far'][s.cam],()=>s.cam=1-s.cam,()=>s.cam=1-s.cam);
    row('Racers',s.racers,()=>s.racers=Math.max(2,s.racers-1),()=>s.racers=Math.min(10,s.racers+1));
    row('Name tags',s.tags?'On':'Off',()=>s.tags=!s.tags,()=>s.tags=!s.tags);
    const rs=document.createElement('button');rs.className='sec';rs.textContent='Reset all progress';let armed=false;
    rs.onclick=()=>{if(!armed){armed=true;rs.textContent='Press again to confirm';return;}SV=JSON.parse(JSON.stringify(DEF));save();toast('Progress reset');go('main');};
    el.appendChild(rs);},
  online(){renderOnline();},room(){NET.sig='';renderRoom();},
  results(){renderResults();},stand(){renderStand();},pause(){}
};
function refocus(k){const b=document.querySelector(`[data-k="${k}"]`);if(b)b.focus();}
const HOOK={};
let previewTO=0;function previewTrack(ti){clearTimeout(previewTO);previewTO=setTimeout(()=>{if(TI!==ti||!world)buildTrack(ti);},120);}

// ================= garage =================
// Left: a simple category list. Right: what that category does and one clear action.
const CATS=[{k:'eng',n:'Engine',g:'PERFORMANCE',ico:'⚙'},{k:'tur',n:'Turbo',g:'PERFORMANCE',ico:'🌀'},{k:'tir',n:'Tires',g:'PERFORMANCE',ico:'◎'},{k:'nit',n:'Nitro',g:'PERFORMANCE',ico:'🔥'},
  {k:'paint',n:'Paint',g:'PAINT & DECALS',ico:'🎨'},{k:'accent',n:'Accent',g:'PAINT & DECALS',ico:'▰'},{k:'tone',n:'Livery',g:'PAINT & DECALS',ico:'◧'},{k:'stripe',n:'Stripes',g:'PAINT & DECALS',ico:'∥'},{k:'num',n:'Race No.',g:'PAINT & DECALS',ico:'#'},
  {k:'spoiler',n:'Spoiler',g:'BODY PARTS',ico:'⌐'},{k:'hood',n:'Hood',g:'BODY PARTS',ico:'▲'},{k:'kit',n:'Body Kit',g:'BODY PARTS',ico:'◆'},
  {k:'wheel',n:'Wheels',g:'WHEELS & LIGHTS',ico:'⚙'},{k:'rim',n:'Rim Color',g:'WHEELS & LIGHTS',ico:'◉'},{k:'tint',n:'Windows',g:'WHEELS & LIGHTS',ico:'▭'},{k:'lights',n:'Headlights',g:'WHEELS & LIGHTS',ico:'💡'},{k:'glow',n:'Underglow',g:'WHEELS & LIGHTS',ico:'✦'},{k:'slip',n:'Slipstream',g:'WHEELS & LIGHTS',ico:'≋'}];
const STY={paint:{cur:L=>L.body,list:()=>PAINTS,cost:250},accent:{cur:L=>L.accent,list:()=>PAINTS,cost:200},rim:{cur:L=>L.rim,list:()=>RIMS,cost:150},
  spoiler:{cur:L=>L.spoiler,names:()=>D.SPOILERS,cost:400},stripe:{cur:L=>L.stripe,names:()=>D.STRIPES,cost:150},hood:{cur:L=>L.hood,names:()=>D.HOODS,cost:350},
  kit:{cur:L=>L.kit,names:()=>D.KITS,cost:600},wheel:{cur:L=>L.wheel,names:()=>D.WHEELS,cost:300},tone:{cur:L=>L.tone,names:()=>D.TONES,cost:250},
  num:{cur:L=>L.num,names:()=>['None','Doors','Doors + Hood'],cost:150},
  glow:{cur:L=>L.glow,list:()=>[null,0x29d4ff,0xff2d6b,0x7dffb0,0xffe14d,0x7d4dff,0xff7a1a],cost:500,off:'Off'},
  tint:{cur:L=>L.tint,list:()=>[null,0x07070a,0xa8b8c8,0x4a2a7a,0x9a7a1a,0x1a6a5a],cost:200,off:'Stock'},
  slip:{cur:L=>L.slip,list:()=>[null,0x29d4ff,0xff2d6b,0xffe14d,0x7dffb0,0x7d4dff,0xff7a1a,0x111133,-1],cost:300,off:'White'},
  lights:{cur:L=>L.lights,list:()=>[null,0xfff08a,0x8ac8ff,0xff8ad8,0x9affb0],cost:150,off:'Stock'}};
const PART_INFO={eng:'Raises top speed.',tur:'Faster acceleration out of corners.',tir:'Sharper turning and quicker drift boost charge.',nit:'Boost lasts longer and pushes harder.'};
const PART_COST=l=>400+l*400;
const swatchBg=v=>v===-1?'linear-gradient(135deg,#ff2d6b,#ffe14d,#7dffb0,#29d4ff,#7d4dff)':hex(v);
const PAINTS=[0xff3b3b,0xff7a1a,0xffd400,0x2ecc71,0x1f9a5a,0x18c8d8,0x2f7bff,0x7d4dff,0xff4fa3,0xffffff,0x8a8f99,0x16161c];
const RIMS=[0x222222,0xdddddd,0xffd400,0xff3b3b,0x29d4ff,0xff4fa3];
const COST={paint:250,accent:200,rim:150,spoiler:400,stripe:150};
let gCat='eng';
function gCar(){return carId(SV.sel.r,TYPES[SV.sel.t]);}
function catValue(k){const id=gCar(),u=up(id),L=looks(id);
  if(['eng','tur','tir','nit'].includes(k))return `<span class="lv">${u[k]}/5</span>`;
  const st=STY[k],v=st.cur(L);if(st.list)return v==null?`<span class="lv">${st.off}</span>`:`<span class="dot" style="background:${swatchBg(v)}"></span>`;
  return `<span class="lv">${st.names()[v]}</span>`;}
function renderGarage(o){
  const r=SV.sel.r,t=SV.sel.t,id=gCar(),c=carInfo(id);setShowCar(id,false);
  $('gRacer').innerHTML=`<span class="gport">${img(racerThumb(r))}</span>${RACERS[r].name}`;
  const tabs=$('gTypes');tabs.innerHTML='';
  TYPES.forEach((ty,k)=>{const b=document.createElement('button');b.className='tab'+(k===t?' on':'');b.style.setProperty('--tc',TYPE_COLOR[ty]);b.textContent=TYPE_LABEL[ty];b.dataset.f='type'+k;
    b.onclick=()=>{SV.sel.t=k;save();click();renderGarage({keep:'type'+k});};tabs.appendChild(b);});
  $('gName').innerHTML=`${c.name} <span style="color:${TYPE_COLOR[c.type]}">${TYPE_LABEL[c.type]}</span>`;
  $('gStats').innerHTML=statBars(id,true);
  const cl=$('gCats');cl.innerHTML='';let grp='';
  CATS.forEach(ct=>{if(ct.g!==grp){grp=ct.g;cl.insertAdjacentHTML('beforeend',`<div class="ghd">${grp}</div>`);}
    const b=document.createElement('button');b.className='gcat'+(ct.k===gCat?' sel':'');b.dataset.f='cat'+ct.k;b.innerHTML=`<i>${ct.ico}</i><span>${ct.n}</span>${catValue(ct.k)}`;
    b.addEventListener('focus',()=>{if(gCat!==ct.k){gCat=ct.k;cl.querySelectorAll('.gcat').forEach(x=>x.classList.toggle('sel',x===b));renderGDetail();}});
    b.onclick=()=>{gCat=ct.k;cl.querySelectorAll('.gcat').forEach(x=>x.classList.toggle('sel',x===b));renderGDetail();click();
      if(lastInput!=='pointer'){const f=$('gDetail').querySelector('button:not([disabled])');if(f)f.focus();}};
    cl.appendChild(b);});
  renderGDetail();$('cash').textContent=money(SV.money);
  if(o&&o.keep){const k=document.querySelector(`#s-garage [data-f="${o.keep}"]`);if(k&&!k.disabled)k.focus({preventScroll:true});}
  HOOK.garage={lb:()=>{SV.sel.r=(r+9)%10;save();click();renderGarage({keep:'cat'+gCat});},rb:()=>{SV.sel.r=(r+1)%10;save();click();renderGarage({keep:'cat'+gCat});},
    lt:()=>{SV.sel.t=(t+3)%4;save();click();renderGarage({keep:'cat'+gCat});},rt:()=>{SV.sel.t=(t+1)%4;save();click();renderGarage({keep:'cat'+gCat});},y:()=>setGView(true)};
}
function renderGDetail(){
  const id=gCar(),u=up(id),L=looks(id),c=carInfo(id),el=$('gDetail'),ct=CATS.find(x=>x.k===gCat);el.innerHTML=`<div class="dtitle">${ct.ico} ${ct.n.toUpperCase()}</div>`;
  if(['eng','tur','tir','nit'].includes(gCat)){
    const lv=u[gCat],a=specFrom(c,u),bU=Object.assign({},u,{[gCat]:Math.min(5,lv+1)}),b=specFrom(c,bU);
    const line={eng:['Top speed',x=>Math.round(x.top*2.3)+' km/h'],tur:['Acceleration',x=>(x.acc).toFixed(1)],tir:['Turning',x=>Math.round(x.turn*50)+' / Drift charge '+Math.round(x.driftGain*100)+'%'],
      nit:['Boost',x=>(1/x.drain).toFixed(1)+' s · +'+Math.round((x.bpow-1)*100)+'% speed']}[gCat];
    el.insertAdjacentHTML('beforeend',`<div class="ddesc">${PART_INFO[gCat]}</div><div class="pips big">${[0,1,2,3,4].map(i=>`<i class="${i<lv?'on':''}"></i>`).join('')}</div>
      <div class="dstat">${line[0]}<br><b>${line[1](a)}</b>${lv<5?` → <b class="upv">${line[1](b)}</b>`:''}</div>`);
    const btn=document.createElement('button');btn.className='buybig';btn.dataset.f='buy';
    if(lv>=5){btn.textContent='MAXED OUT';btn.disabled=true;}else{const cost=PART_COST(lv);btn.innerHTML=`UPGRADE · ${money(cost)}`;if(SV.money<cost)btn.classList.add('poor');
      btn.onclick=()=>{if(SV.money<cost){toast('Not enough cash, go win some races!');beep(160,.15);return;}SV.money-=cost;u[gCat]++;save();beep(990,.1);toast(ct.n+' → level '+u[gCat]);renderGarage({keep:'buy'});};}
    el.appendChild(btn);
  }else{
    const key=gCat,st=STY[key],cost=st.cost,curV=st.cur(L),list=st.list?st.list():st.names().map((_,i)=>i);
    el.insertAdjacentHTML('beforeend',`<div class="ddesc">${money(cost)} per change. Your current pick is outlined.</div>`);
    const w=document.createElement('div');w.className='sws';
    list.forEach((v,i)=>{const b=document.createElement('button');b.className='sw'+(v===curV?' sel':'');b.dataset.f=key+i;
      if(!st.list){b.classList.add('wide');b.textContent=st.names()[v];}else if(v==null){b.classList.add('wide');b.textContent=st.off;}else{b.style.background=swatchBg(v);if(v===-1)b.title='Rainbow';}
      b.onclick=()=>{if(v===curV)return;if(SV.money<cost){toast('Not enough cash');beep(160,.15);return;}SV.money-=cost;
        u[key]=v;save();beep(990,.1);renderGarage({keep:key+i});};w.appendChild(b);});
    el.appendChild(w);
    const rb=document.createElement('button');rb.className='sec';rb.textContent='Factory look (free)';rb.dataset.f='factory';
    rb.onclick=()=>{for(const k in STY)u[k]=null;save();click();renderGarage({keep:'factory'});};el.appendChild(rb);
  }
}
$('gPrev').onclick=()=>HOOK.garage.lb();$('gNext').onclick=()=>HOOK.garage.rb();

// ---- garage car viewer: centered in the free space, drag/pinch/stick to spin & zoom, full-screen view mode ----
let vYaw=.6,vPitch=.28,vZoom=1,vTouched=-1e9,gView=false;const ptrs=new Map();let pinch0=0,zoom0=1;
function setGView(on){gView=on;$('s-garage').classList.toggle('viewing',on);click();if(!on){const b=document.querySelector('#s-garage [data-f="cat'+gCat+'"]');if(b)b.focus({preventScroll:true});}else $('gViewExit').focus({preventScroll:true});}
$('gViewBtn').onclick=()=>setGView(true);$('gViewExit').onclick=()=>setGView(false);
const gs=$('s-garage');
gs.addEventListener('pointerdown',e=>{if(e.target.closest('.panel')||e.target.closest('button'))return;ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(ptrs.size===2){const[a,b]=[...ptrs.values()];pinch0=Math.hypot(a.x-b.x,a.y-b.y);zoom0=vZoom;}try{gs.setPointerCapture(e.pointerId);}catch(_){}vTouched=performance.now();});
gs.addEventListener('pointermove',e=>{const p=ptrs.get(e.pointerId);if(!p)return;
  if(ptrs.size===1){vYaw-=(e.clientX-p.x)*.012;vPitch=clamp(vPitch+(e.clientY-p.y)*.006,.02,1.1);}
  p.x=e.clientX;p.y=e.clientY;if(ptrs.size===2){const[a,b]=[...ptrs.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);if(pinch0>0)vZoom=clamp(zoom0*pinch0/d,.45,1.8);}vTouched=performance.now();});
const ptrUp=e=>{ptrs.delete(e.pointerId);pinch0=0;};gs.addEventListener('pointerup',ptrUp);gs.addEventListener('pointercancel',ptrUp);
gs.addEventListener('wheel',e=>{if(e.target.closest('.panel'))return;e.preventDefault();vZoom=clamp(vZoom*(1+e.deltaY*.0012),.45,1.8);vTouched=performance.now();},{passive:false});
function garageCam(dt){
  if(pad&&(pad.rx||pad.ry)){vYaw-=pad.rx*dt*2.2;vZoom=clamp(vZoom+pad.ry*dt*.9,.45,1.8);vTouched=performance.now();}
  if(performance.now()-vTouched>3500)vYaw+=dt*.25;
  const W=innerWidth,H=innerHeight,fov=40,tv=Math.tan(fov/2*Math.PI/180),th=tv*W/H;
  let offX=0,offY=0,fx=1,fy=1;
  if(!gView){const r=gs.querySelector('.panel').getBoundingClientRect();
    if(r.left>W*.25){fx=r.left/W;offX=W/2-r.left/2;}else if(r.top>H*.2){fy=r.top/H;offY=H/2-r.top/2;}}
  const d=clamp(Math.max(5.4/(1.5*fx*th),2.6/(1.3*fy*tv)),5,22)*vZoom;
  camera.fov=fov;camera.setViewOffset(W,H,offX,offY,W,H);
  const tY=.75;camera.position.set(Math.sin(vYaw)*Math.cos(vPitch)*d,tY+Math.sin(vPitch)*d,Math.cos(vYaw)*Math.cos(vPitch)*d);camera.lookAt(0,tY,0);
  camera.updateProjectionMatrix();
}

// ================= grand prix =================
function startGP(cup){mode='gp';GP={cup,race:0,opps:syncRivals().map(o=>({...o})),pts:{P:0},earn:0};GP.opps.forEach(o=>GP.pts[o.r]=0);startRace(cup*5,GP.opps);}
function gpTable(){const e=[{key:'P',name:'YOU ('+RACERS[SV.sel.r].name.split(' ')[0]+')',pts:GP.pts.P,me:true}];
  GP.opps.forEach(o=>e.push({key:o.r,name:RACERS[o.r].name,pts:GP.pts[o.r]}));return e.sort((a,b)=>b.pts-a.pts);}
function renderResults(){
  const st=standings(),place=st.indexOf(player)+1,e=lastEarn;
  $('rTitle').textContent=place===1?'VICTORY!':ord(place)+' PLACE';$('rTrack').textContent=TRACKS[TI].name+' · '+DIFF_NAME[SV.set.diff]+(mode==='gp'?` · Race ${GP.race+1}/5`:'');
  $('rPod').innerHTML=img(place<=3?racerThumb(SV.sel.r):'');
  $('rTable').innerHTML=st.map((c,i)=>`<tr class="${c.isPlayer?'me':''}"><td>${ord(i+1)}</td><td>${c.isPlayer?'YOU':esc(c.name)}${c.remote&&c.nid&&!c.nid.startsWith('bot')?' 🌐':''}</td><td>${c.finished?fmt(c.finishTime):(mode==='online'?'racing…':'—')}</td>${mode==='gp'?`<td>+${PTS[i]}</td>`:''}</tr>`).join('');
  $('rEarn').innerHTML=`Prize ${money(e.place)} · Drift bonus ${money(e.drift)}${e.record?' · New record '+money(e.record):''}<br><b>+${money(e.total)}</b> · Best lap ${fmt(bestLap)}`;
  const bt=$('rButtons');bt.innerHTML='';
  const mkb=(t,cls,fn)=>{const b=document.createElement('button');b.className=cls;b.textContent=t;b.onclick=()=>{click();fn();};bt.appendChild(b);};
  if(mode==='online'){mkb('BACK TO ROOM','big',()=>netLeaveRace());}
  else if(mode==='gp'){st.forEach((c,i)=>{GP.pts[c.isPlayer?'P':c.racer]+=PTS[i];});GP.earn+=e.total;mkb('STANDINGS','big',()=>go('stand'));}
  else{mkb('RACE AGAIN','big',()=>startRace(lastRace.ti,lastRace.opps));mkb('RACE SETUP','sec',()=>go('setup'));mkb('MENU','sec',()=>go('main'));}
}
function renderStand(){
  const tb=gpTable(),last=GP.race>=4;
  $('sTitle').textContent=last?THEMES[GP.cup].cup.toUpperCase()+' FINAL':'STANDINGS · '+(GP.race+1)+'/5';
  $('sTable').innerHTML=tb.map((e,i)=>`<tr class="${e.me?'me':''}"><td>${ord(i+1)}</td><td>${e.name}</td><td>${e.pts} pts</td></tr>`).join('');
  const bt=$('sButtons');bt.innerHTML='';$('sNote').innerHTML='';
  const mkb=(t,cls,fn)=>{const b=document.createElement('button');b.className=cls;b.textContent=t;b.onclick=()=>{click();fn();};bt.appendChild(b);};
  if(!last){const nt=GP.cup*5+GP.race+1;$('sNote').textContent='Next: '+TRACKS[nt].name;mkb('NEXT RACE','big',()=>{GP.race++;startRace(nt,GP.opps);});mkb('QUIT CUP','sec',()=>go('main'));}
  else{if(!GP.done){GP.done=true;const pos=tb.findIndex(e=>e.me)+1;const bonus=pos<=3?Math.round([5000,3000,2000][pos-1]*DIFF_MULT[SV.set.diff]):0;
      SV.money+=bonus;if(pos<=3&&(!SV.gp[GP.cup]||pos<SV.gp[GP.cup]))SV.gp[GP.cup]=pos;save();GP.bonus=bonus;GP.pos=pos;}
    $('sNote').innerHTML=(GP.pos===1?'🏆 CUP CHAMPION! ':GP.pos<=3?'Podium finish! ':'')+`Cup bonus ${money(GP.bonus)} · Total earned ${money(GP.earn+GP.bonus)}`;
    $('cash').textContent=money(SV.money);mkb('MAIN MENU','big',()=>go('main'));mkb('GARAGE','sec',()=>go('garage'));}
}

// ================= HUD / pause =================
function showHUD(on){$('hud').classList.toggle('hidden',!on);if(!on)tagEls.forEach(e=>e.style.display='none');$('touch').classList.toggle('hidden',!(on&&isTouch));$('pauseBtn').classList.toggle('hidden',!on);}
function flash(m,s){$('msg').textContent=m;$('msg').style.opacity=1;msgT=1.6;if(s!=null){$('sub').textContent=s;subT=1.6;}}
let prevState='race';
function togglePause(){
  if(mode==='online'&&(state==='race'||state==='countdown'||state==='done')){if(confirmLeave())netLeaveRace();return;}
  if(state==='race'||state==='countdown'||(state==='done'&&resultsTimer>0)){prevState=state;state='paused';showHUD(false);go('pause');}
  else if(state==='paused'){state=prevState;closeScreens();showHUD(true);last=performance.now();}}
$('pauseBtn').onclick=togglePause;$('resume').onclick=togglePause;
$('restart').onclick=()=>{state='menu';startRace(lastRace.ti,lastRace.opps);};
$('quit').onclick=()=>{state='menu';cars=[];player=null;go('main');};
$('btnSingle').onclick=()=>{mode='single';click();go('setup');};
$('btnGP').onclick=()=>{mode='gp';click();go('setup');};
$('btnGarage').onclick=()=>{click();go('garage');};
$('btnSettings').onclick=()=>{click();go('settings');};
$('btnOnline').onclick=()=>{mode='online';click();go('online');};
$('s-title').addEventListener('click',toMain);
document.querySelectorAll('[data-back]').forEach(b=>b.onclick=goBack);
$('carGarage').onclick=()=>{click();go('garage');};

const mm=$('mm').getContext('2d');
function drawMap(){mm.clearRect(0,0,240,240);mm.save();mm.scale(2,2);const X=x=>6+(x-bb.minX)*bb.s,Z=z=>6+(z-bb.minZ)*bb.s;
  mm.strokeStyle='rgba(255,255,255,.9)';mm.lineWidth=3;mm.beginPath();for(let i=0;i<=N;i+=3){const p=P[i%N];i?mm.lineTo(X(p.x),Z(p.z)):mm.moveTo(X(p.x),Z(p.z));}mm.closePath();mm.stroke();
  for(const c of cars){if(c.isPlayer||!c.mesh)continue;mm.fillStyle='#'+c.mesh.userData.bodyMat.color.getHexString();mm.beginPath();mm.arc(X(c.x),Z(c.z),3,0,7);mm.fill();}
  if(player){mm.fillStyle='#fff36b';mm.strokeStyle='#2a0a4a';mm.lineWidth=1.5;mm.beginPath();mm.arc(X(player.x),Z(player.z),4.5,0,7);mm.fill();mm.stroke();}mm.restore();}

// ================= race names: leaderboard tower + name tags =================
function carColor(c){return hex(looks(c.id).body);}
function updTower(st){const el=$('tower');if(!el)return;
  el.innerHTML=st.map((c,i)=>`<div class="${c.isPlayer?'me':''}"><em>${i+1}</em><i style="background:${carColor(c)}"></i>${c.isPlayer?'YOU':c.name}${c.finished?' ✓':''}</div>`).join('');}
const tagV=new THREE.Vector3();let tagEls=[];
function updTags(){const host=$('tags');if(!host)return;
  while(tagEls.length<cars.length){const d=document.createElement('div');d.className='tag';host.appendChild(d);tagEls.push(d);}
  const W=innerWidth,H=innerHeight;
  cars.forEach((c,k)=>{const el=tagEls[k];if(c.isPlayer||!player){el.style.display='none';return;}
    const d=Math.hypot(c.x-player.x,c.z-player.z);tagV.set(c.x,(c.y||0)+2.7,c.z);if(tagV.project)tagV.project(camera);
    if(!tagV.project||d>110||tagV.z>1||tagV.z<-1){el.style.display='none';return;}
    el.style.display='block';el.textContent=c.name;el.style.borderColor=carColor(c);el.style.opacity=clamp(1.3-d/110,0,1);
    el.style.transform=`translate(${(tagV.x*.5+.5)*W}px,${(-tagV.y*.5+.5)*H}px) translate(-50%,-100%)`;});
  for(let k=cars.length;k<tagEls.length;k++)tagEls[k].style.display='none';}

// ================= main loop =================
let camH=0,camY=0,last=performance.now(),hudT=0,showA=0;
function loop(now){
  requestAnimationFrame(loop);const dt=Math.min(.05,(now-last)/1000);last=now;
  readPad(dt);updAudio(dt);for(const s of spinners)s.rotation.z+=dt*.8;const tt=now/1000;for(const b of bobbers)b.o.position.y=b.y+Math.sin(tt*.6+b.p)*(b.amp||.4);
  if(state==='menu'||(cur&&bgMode!=='race')){
    if(bgMode==='show'){{const ss=showStreaks.get(),on=cur==='garage'&&gCat==='slip';ss.g.visible=on;ss.g.rotation.y=.55;ss.g.position.x=0;ss.update(dt,on,looks(gCar()).slip??0xffffff,70);}
      if(cur==='garage')garageCam(dt);else{if(camera.view&&camera.view.enabled)camera.clearViewOffset();showA+=dt*.3;camera.position.set(Math.sin(showA)*10.5,3.4,Math.cos(showA)*10.5);
      camera.lookAt(-.4,-.2,0);camera.fov=48;camera.updateProjectionMatrix();}renderer.render(show,camera);}
    else{if(camera.view&&camera.view.enabled)camera.clearViewOffset();menuT+=dt*.08;const r=bb.r*1.25+120;camera.position.set(bb.cx+Math.cos(menuT)*r,150,bb.cz+Math.sin(menuT)*r);camera.lookAt(bb.cx,0,bb.cz);camera.fov=60;camera.updateProjectionMatrix();renderer.render(scene,camera);}
    return;}
  if(state==='paused'){renderer.render(scene,camera);return;}
  if(camera.view&&camera.view.enabled)camera.clearViewOffset();
  step(dt);
  for(const c of cars){c.mesh.position.set(c.x,c.y,c.z);c.mesh.rotation.y=c.h;c.mesh.rotation.x=-Math.atan(c.grade||0)*.9;c.mesh.rotation.z=-Math.atan(BK[c.idx]||0)+clamp(c.alpha*-.12,-.08,.08);
    for(const f of c.mesh.userData.flames){f.visible=c.boosting;if(c.boosting)f.scale.set(1,1,.7+Math.random()*.7);}}
  updPuffs(dt);updSlipFX(dt);if(mode==='online')netTick(dt);
  if(resultsTimer>0){resultsTimer-=dt;if(resultsTimer<=0){showHUD(false);go('results');}}
  if(player&&TH){const dark=inTun[player.idx]?1:0,hi=TH.night?.6:1;hemi.intensity+=((dark?.35:hi)-hemi.intensity)*Math.min(1,dt*4);sun.intensity+=((dark?.1:(TH.night?.35:.85))-sun.intensity)*Math.min(1,dt*4);}
  if(player){const tgt=player.ma-player.alpha*.12;camH+=angDiff(tgt,camH)*Math.min(1,dt*4.5);camY+=(player.y-camY)*Math.min(1,dt*7);
    const back=(SV.set.cam?12:9)+player.v*.012,upY=SV.set.cam?5:3.6;
    camera.position.set(player.x-Math.sin(camH)*back,upY+camY,player.z-Math.cos(camH)*back);
    if(shake>0){shake-=dt;camera.position.x+=(Math.random()-.5)*shake*2;camera.position.y+=(Math.random()-.5)*shake;}
    camera.lookAt(player.x+Math.sin(camH)*6,1.3+camY,player.z+Math.cos(camH)*6);
    const f=66+clamp(player.v/player.spec.top,0,1.3)*10+(player.boosting?8:0);camera.fov+=(f-camera.fov)*Math.min(1,dt*4);camera.updateProjectionMatrix();}
  if(msgT>0){msgT-=dt;if(msgT<=0)$('msg').style.opacity=0;}if(subT>0){subT-=dt;if(subT<=0)$('sub').textContent='';}
  if(SV.set.tags)updTags();
  hudT-=dt;if(player&&hudT<=0){hudT=.05;const stn=standings(),place=stn.indexOf(player)+1;updTower(stn);$('pos').innerHTML=ord(place)+'<small>/'+cars.length+'</small>';
    $('lap').textContent='LAP '+clamp(player.lap,1,LAPS)+'/'+LAPS;$('time').textContent=fmt(raceTime);
    $('spd').innerHTML=Math.max(0,Math.round(player.v*2.3))+'<small> KM/H</small>';$('boostfill').style.width=(player.boost*100)+'%';$('boostbar').classList.toggle('full',player.boost>.98);
    $('blabel').textContent=player.boosting?'BOOSTING!':player.slip?'SLIPSTREAM':player.drifting?'DRIFT CHARGE':'BOOST';
    {const sc=slipColor();$('blabel').style.color=player.slip&&!player.boosting?(sc===-1?'hsl('+((performance.now()/30)%360)+',70%,70%)':hex(sc)):'';}drawMap();}
  renderer.render(scene,camera);
}

// ================= ONLINE (Firebase Realtime Database over REST + live streaming) =================
// Works on the GitHub Pages build. Change FB_URL to use a different database.
const FB_URL=(()=>{try{const q=new URLSearchParams(location.search).get('fb');if(q)return q.replace(/\/$/,'');}catch(e){}
  return 'https://oathless-e60d0-default-rtdb.firebaseio.com/slipstream96';})();
const esc=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fb={u:p=>FB_URL+'/'+p+'.json',
  async req(m,p,v){const r=await fetch(fb.u(p),{method:m,body:v===undefined?undefined:JSON.stringify(v)});if(!r.ok)throw new Error('fb '+r.status);return r.json();},
  get:p=>fb.req('GET',p),put:(p,v)=>fb.req('PUT',p,v),patch:(p,v)=>fb.req('PATCH',p,v),del:p=>fb.req('DELETE',p),
  stream(p,cb){const es=new EventSource(fb.u(p)),st={data:null};
    const set=(parts,val)=>{if(!parts.length){st.data=val;return;}if(st.data==null||typeof st.data!=='object')st.data={};let o=st.data;
      for(let i=0;i<parts.length-1;i++){if(o[parts[i]]==null||typeof o[parts[i]]!=='object')o[parts[i]]={};o=o[parts[i]];}
      const k=parts[parts.length-1];if(val===null)delete o[k];else o[k]=val;};
    const on=(ev,patch)=>{let m;try{m=JSON.parse(ev.data);}catch(e){return;}if(!m||typeof m.path!=='string')return;const parts=m.path.split('/').filter(Boolean);
      if(patch&&m.data&&typeof m.data==='object'){for(const k in m.data)set([...parts,k],m.data[k]);}else set(parts,m.data);cb(st.data);};
    es.addEventListener('put',e=>on(e,false));es.addEventListener('patch',e=>on(e,true));return es;}};
const SV_TS={'.sv':'timestamp'};
const NET={uid:(()=>{let u=null;try{u=localStorage.getItem('ss96_uid');}catch(e){}if(!u){u='p'+Math.random().toString(36).slice(2,10);try{localStorage.setItem('ss96_uid',u);}catch(e){}}return u;})(),
  ok:null,code:null,es:null,room:null,race:null,lastStart:0,sendT:0,hb:null,snaps:{},sig:''};
let srvOff=0;const srvNow=()=>Date.now()+srvOff;
async function netCheck(){try{const t0=Date.now();await fb.put('time/'+NET.uid,SV_TS);const v=await fb.get('time/'+NET.uid);const t1=Date.now();
  if(typeof v!=='number')throw 0;srvOff=v-(t0+t1)/2;NET.ok=true;}catch(e){NET.ok=false;}return NET.ok;}
function myName(){return (SV.name||'').trim()||'Racer';}
function myEntry(){const id=carId(SV.sel.r,TYPES[SV.sel.t]);return {name:myName().slice(0,16),r:SV.sel.r,t:SV.sel.t,L:looks(id),ready:false,seen:SV_TS};}
function netPushMe(){if(NET.code)fb.patch('rooms/'+NET.code+'/players/'+NET.uid,Object.assign(myEntry(),{ready:false})).catch(()=>{});}
const amHost=()=>NET.room&&NET.room.host===NET.uid;
function activePlayers(){const p=(NET.room&&NET.room.players)||{},now=srvNow();return Object.keys(p).filter(k=>p[k]&&(typeof p[k].seen!=='number'||now-p[k].seen<15000)).sort();}

// ----- lobby browser -----
async function netListRooms(){const el=$('onRooms');if(!el)return;
  try{const L=await fb.get('lobbies')||{},now=srvNow();const rows=Object.entries(L).filter(([c,v])=>v&&v.status==='lobby'&&now-(v.updated||0)<20000).sort((a,b)=>b[1].updated-a[1].updated);
    el.innerHTML=rows.length?'':'<div class="riv"><b>No open rooms right now. Create one!</b></div>';
    for(const[c,v]of rows){const b=document.createElement('button');b.className='opt roomrow';b.innerHTML=`<b>${esc(c)}</b><span>${esc(v.hostName)}'s room · ${esc(TRACKS[v.track]?.name||'')} · ${v.n||1}/10</span>`;b.onclick=()=>netJoin(c);el.appendChild(b);}
  }catch(e){el.innerHTML='<div class="riv"><b>Could not load rooms.</b></div>';}}
let roomsTimer=0;
async function renderOnline(){
  $('onName').value=myName()==='Racer'&&!SV.name?'':myName();$('onStatus').textContent='Connecting…';$('onBody').classList.add('dim');
  const ok=NET.ok===true||await netCheck();
  if(!ok){$('onStatus').innerHTML='Online play needs the GitHub Pages version of the game (this preview can\'t reach the online server).';return;}
  $('onStatus').textContent='Online ✓';$('onBody').classList.remove('dim');netListRooms();clearInterval(roomsTimer);roomsTimer=setInterval(()=>{if(cur==='online')netListRooms();else clearInterval(roomsTimer);},4000);
  if(NET.code){go('room');}}
function saveName(){const v=$('onName').value.replace(/[^\w \-.]/g,'').slice(0,16);SV.name=v;save();}
async function netCreate(){saveName();if(!NET.ok)return;const code=Array.from({length:4},()=>'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random()*24)]).join('');
  const room={host:NET.uid,status:'lobby',track:SV.sel.track,laps:SV.set.laps,bots:3,up:false,created:SV_TS,players:{[NET.uid]:myEntry()}};
  try{await fb.put('rooms/'+code,room);await fb.put('lobbies/'+code,{hostName:myName(),track:SV.sel.track,n:1,status:'lobby',updated:SV_TS});netEnter(code);}catch(e){toast('Could not create a room');}}
async function netJoin(code){saveName();code=String(code||'').toUpperCase().replace(/[^A-Z]/g,'').slice(0,4);if(code.length!==4){toast('Enter a 4-letter room code');return;}
  try{const r=await fb.get('rooms/'+code);if(!r){toast('Room '+code+' not found');return;}if(activeCount(r)>=10){toast('That room is full');return;}
    await fb.patch('rooms/'+code+'/players/'+NET.uid,myEntry());netEnter(code);}catch(e){toast('Could not join');}}
function activeCount(r){const p=r.players||{},now=srvNow();return Object.values(p).filter(x=>x&&(typeof x.seen!=='number'||now-x.seen<15000)).length;}
function netEnter(code){NET.code=code;NET.room=null;if(NET.es)NET.es.close();
  NET.es=fb.stream('rooms/'+code,d=>{NET.room=d;netOnRoom();});
  clearInterval(NET.hb);NET.hb=setInterval(netHeartbeat,3000);netHeartbeat();go('room');}
async function netExit(){const c=NET.code;NET.code=null;if(NET.es)NET.es.close();NET.es=null;clearInterval(NET.hb);NET.room=null;NET.race=null;
  if(c){try{await fb.del('rooms/'+c+'/players/'+NET.uid);const r=await fb.get('rooms/'+c);if(!r||!r.players||!Object.keys(r.players).length){await fb.del('rooms/'+c);await fb.del('lobbies/'+c);}}catch(e){}}}
function netHeartbeat(){if(!NET.code)return;const c=NET.code;fb.put('rooms/'+c+'/players/'+NET.uid+'/seen',SV_TS).catch(()=>{});
  const R=NET.room;if(!R)return;const act=activePlayers();
  if(!R.players||!R.players[NET.uid]){if(cur==='room'){toast('You left the room');netExit();go('online');}return;}
  if(!act.includes(R.host)&&act[0]===NET.uid)fb.patch('rooms/'+c,{host:NET.uid}).catch(()=>{});// host left: oldest remaining takes over
  if(amHost()){fb.patch('lobbies/'+c,{hostName:myName(),track:R.track,n:act.length,status:R.status,updated:SV_TS}).catch(()=>{});
    for(const k of Object.keys(R.players||{}))if(!act.includes(k))fb.del('rooms/'+c+'/players/'+k).catch(()=>{});
    if(R.status==='racing'&&R.race&&srvNow()-R.race.startAt>1000*60*(R.race.laps+3))fb.patch('rooms/'+c,{status:'lobby'}).catch(()=>{});}}
function netOnRoom(){const R=NET.room;if(!R)return;
  if(R.status==='racing'&&R.race&&R.race.startAt!==NET.lastStart&&R.race.grid&&R.race.grid.includes(NET.uid)){NET.lastStart=R.race.startAt;startOnlineRace(R.race);return;}
  if(NET.race&&R.state)NET.snaps=R.state;
  if(cur==='room'){const sig=JSON.stringify([R.host,R.status,R.track,R.laps,R.bots,R.up,Object.entries(R.players||{}).map(([k,v])=>[k,v.name,v.r,v.t,v.ready])]);if(sig!==NET.sig){NET.sig=sig;renderRoom();}}
  if(cur==='results'&&mode==='online')renderOnlineResults();}

// ----- room lobby -----
function renderRoom(){const R=NET.room;$('rmCode').textContent=NET.code||'';if(!R){$('rmPlayers').innerHTML='<div class="riv"><b>Connecting…</b></div>';return;}
  const host=amHost(),act=activePlayers(),P=R.players||{};
  $('rmPlayers').innerHTML=act.map(k=>{const p=P[k]||{},cd=D.carDef(p.r||0,TYPES[p.t||0]);const RR=RACERS[p.r||0];
    return `<div class="riv"><i style="background:${hex(RR.body)}"></i><b>${esc(p.name)}${k===NET.uid?' (you)':''}${k===R.host?' 👑':''}</b><span style="color:${TYPE_COLOR[cd.type]}">${RR.name.split(' ')[0]} · ${cd.name}</span><em>${k===R.host?'HOST':(p.ready?'✓ READY':'…')}</em></div>`;}).join('')+
    (R.bots?`<div class="riv"><i style="background:#888"></i><b>+ ${R.bots} AI racer${R.bots>1?'s':''}</b></div>`:'');
  const td=TRACKS[R.track]||TRACKS[0];$('rmTrack').innerHTML='';$('rmTrack').appendChild(thumb(R.track||0,90,58));$('rmTrack').insertAdjacentHTML('beforeend',`<div class="suy"><b>${R.track+1}. ${esc(td.name)}</b><span>${THEMES[td.theme].name} · ${R.laps} laps · ${R.up?'garage upgrades ON':'stock cars'}</span></div>`);
  const rows=$('rmRows');rows.innerHTML='';
  if(host){const row=(label,val,dec,inc,k)=>{const d=document.createElement('div');d.className='setrow';d.innerHTML=`<span>${label}</span>`;
      const a=document.createElement('button');a.textContent='◀';a.dataset.k=k+0;a.onclick=()=>{click();dec();};const v=document.createElement('em');v.textContent=val;
      const b=document.createElement('button');b.textContent='▶';b.dataset.k=k+1;b.onclick=()=>{click();inc();};d.append(a,v,b);rows.appendChild(d);};
    const P2=p=>fb.patch('rooms/'+NET.code,p).catch(()=>{});
    row('Track',(R.track+1)+'',()=>P2({track:(R.track+49)%50}),()=>P2({track:(R.track+1)%50}),'trk');
    row('Laps',R.laps,()=>P2({laps:Math.max(1,R.laps-1)}),()=>P2({laps:Math.min(10,R.laps+1)}),'lap');
    row('AI racers',R.bots,()=>P2({bots:Math.max(0,R.bots-1)}),()=>P2({bots:Math.min(10-act.length,R.bots+1)}),'bot');
    row('Upgrades',R.up?'On':'Off',()=>P2({up:!R.up}),()=>P2({up:!R.up}),'upg');}
  else rows.innerHTML='<div class="hint" style="text-align:left">The host picks the track, laps and AI racers.</div>';
  const go2=$('rmGo');
  if(host){const others=act.filter(k=>k!==NET.uid),allReady=others.every(k=>P[k]&&P[k].ready);go2.textContent=allReady?'START RACE':'START (not everyone is ready)';
    go2.disabled=!(others.length||R.bots);go2.onclick=()=>netStart();}
  else{const me=P[NET.uid]||{};go2.disabled=false;go2.textContent=me.ready?'✓ READY (tap to cancel)':'READY UP';go2.onclick=()=>{click();fb.patch('rooms/'+NET.code+'/players/'+NET.uid,{ready:!me.ready}).catch(()=>{});};}
  previewTrack(R.track||0);const myId=carId(SV.sel.r,TYPES[SV.sel.t]);setShowCar(myId);
  if(R.status==='racing')$('rmNote').textContent='A race is running — you\'ll join the next one.';else $('rmNote').textContent='Share code '+NET.code+' with friends so they can join.';}
async function netStart(){const R=NET.room;if(!R||!amHost())return;const act=activePlayers(),used=new Set(act.map(k=>R.players[k].r)),bots=[];
  const free=[...Array(10).keys()].filter(r=>!used.has(r));for(let i=0;i<R.bots&&act.length+bots.length<10;i++){const r=free.length?free.splice(Math.floor(Math.random()*free.length),1)[0]:Math.floor(Math.random()*10);bots.push({r,t:Math.floor(Math.random()*4)});}
  const grid=act.slice().sort(()=>Math.random()-.5).concat(bots.map((_,i)=>'bot'+i));
  const race={startAt:srvNow()+6000,track:R.track,laps:R.laps,up:!!R.up,bots,grid,diff:SV.set.diff,
    who:Object.fromEntries(act.map(k=>[k,{name:R.players[k].name,r:R.players[k].r,t:R.players[k].t,L:R.players[k].L}]))};
  const ready={};for(const k of act)ready[k+'/ready']=false;
  try{await fb.patch('rooms/'+NET.code,{status:'racing',race,state:null,results:null});await fb.patch('rooms/'+NET.code+'/players',Object.fromEntries(act.map(k=>[k+'/ready',false])));}catch(e){toast('Could not start');}}

// ----- the race itself -----
function startOnlineRace(race){NET.race=race;NET.snaps={};mode='online';LAPS=race.laps;buildTrack(race.track);cars=[];wallHits=0;
  const df=DIFF[race.diff??1],host=amHost();let botI=0;
  race.grid.forEach((nid,k)=>{let c;
    if(nid===NET.uid){c=newCar(carId(SV.sel.r,TYPES[SV.sel.t]),'YOU',true);player=c;}
    else if(nid.startsWith('bot')){const b=race.bots[+nid.slice(3)],nm=RACERS[b.r].name.split(' ')[0]+' (AI)';
      c=newCar(carId(b.r,TYPES[b.t]),nm,false);c.racer=b.r;c.skill=df.pace[1]-(df.pace[1]-df.pace[0])*(botI++/Math.max(1,race.bots.length-1));c.cornerSkill=df.corner;if(!host)c.remote=true;}
    else{const w=race.who[nid]||{name:'Racer',r:0,t:0};c=newCar(carId(w.r||0,TYPES[w.t||0]),w.name||'Racer',false,w.L);c.remote=true;}
    c.nid=nid;const row=Math.floor(k/2),side=k%2?1:-1,i=((N-3-row*6)%N+N)%N;
    c.idx=i;c.lane=side*4.5;c.laneT=c.lane;c.x=P[i].x+R[i].x*c.lane;c.z=P[i].z+R[i].z*c.lane;c.h=c.ma=Math.atan2(T[i].x,T[i].z);c.laneTimer=2+Math.random()*3;cars.push(c);});
  raceTime=0;lapStart=0;bestLap=null;driftTime=0;state='countdown';cd=(race.startAt-srvNow())/1000;resultsTimer=0;lastRace={ti:race.track,opps:[]};
  initAudio();$('best').textContent='ONLINE · '+NET.code;closeScreens();showHUD(true);gantry.forEach(m=>m.color.setHex(0x331111));}
function netRemote(c,dt){const s=NET.snaps&&NET.snaps[c.nid];if(!s)return;
  const age=clamp((srvNow()-(s.t||0))/1000,0,.35),px=s.x+Math.sin(s.ma)*s.v*age,pz=s.z+Math.cos(s.ma)*s.v*age,k=Math.min(1,dt*10);
  if(Math.hypot(px-c.x,pz-c.z)>40){c.x=px;c.z=pz;}else{c.x+=(px-c.x)*k;c.z+=(pz-c.z)*k;}
  c.ma+=angDiff(s.ma,c.ma)*k;c.alpha+=((s.al||0)-c.alpha)*k;c.h=c.ma-c.alpha;c.v=s.v;c.lap=s.lap||0;c.boosting=!!s.b;c.drifting=!!s.d;
  if(s.f&&!c.finished){c.finished=true;c.finishTime=s.f;}}
const r2=v=>Math.round(v*100)/100;
function packCar(c){return {x:r2(c.x),z:r2(c.z),ma:r2(c.ma),al:r2(c.alpha),v:r2(c.v),lap:c.lap,b:c.boosting?1:0,d:c.drifting?1:0,f:c.finished?r2(c.finishTime):0,t:SV_TS};}
function netTick(dt){if(!NET.code||!NET.race||!player)return;NET.sendT-=dt;if(NET.sendT>0)return;NET.sendT=.1;
  const out={[NET.uid]:packCar(player)};if(amHost())for(const c of cars)if(c.nid&&c.nid.startsWith('bot')&&!c.remote)out[c.nid]=packCar(c);
  for(const k in out)out[k].t=srvNow();fb.patch('rooms/'+NET.code+'/state',out).catch(()=>{});
  if(amHost())for(const c of cars)if(c.nid&&c.nid.startsWith('bot')&&!c.remote&&c.finished&&!c.sentRes){c.sentRes=true;fb.patch('rooms/'+NET.code+'/results/'+c.nid,{name:c.name,t:r2(c.finishTime)}).catch(()=>{});}}
function netFinish(){if(!NET.code)return;fb.patch('rooms/'+NET.code+'/results/'+NET.uid,{name:myName(),t:r2(player.finishTime),best:bestLap?r2(bestLap):null}).catch(()=>{});
  const st=packCar(player);st.t=srvNow();fb.patch('rooms/'+NET.code+'/state',{[NET.uid]:st}).catch(()=>{});}
function renderOnlineResults(){const R=NET.room;if(!R)return;const res=R.results||{};for(const c of cars){const r=res[c.nid];if(r&&!c.finished){c.finished=true;c.finishTime=r.t;}}
  const st=standings();$('rTable').innerHTML=st.map((c,i)=>`<tr class="${c.isPlayer?'me':''}"><td>${ord(i+1)}</td><td>${c.isPlayer?'YOU':esc(c.name)}${c.remote&&!c.nid.startsWith('bot')?' 🌐':''}</td><td>${c.finished?fmt(c.finishTime):'racing…'}</td></tr>`).join('');}
function confirmLeave(){const b=$('pauseBtn');if(b.dataset.arm==='1'){b.dataset.arm='';b.textContent='II';return true;}b.dataset.arm='1';b.textContent='Leave?';setTimeout(()=>{b.dataset.arm='';b.textContent='II';},2500);return false;}
function netLeaveRace(){NET.race=null;state='menu';cars=[];player=null;showHUD(false);
  if(amHost()&&NET.room&&NET.room.status==='racing')fb.patch('rooms/'+NET.code,{status:'lobby'}).catch(()=>{});go(NET.code?'room':'online');}

// ----- world lap records (all modes) -----
async function submitRecord(ti,t){if(NET.ok===false)return;try{if(NET.ok==null&&!await netCheck())return;const k='records/'+ti+'/'+NET.uid,old=await fb.get(k);
  if(!old||t<old.t)await fb.put(k,{n:myName(),t:r2(t),c:carInfo(carId(SV.sel.r,TYPES[SV.sel.t])).name,at:SV_TS});}catch(e){}}
async function worldTop(ti,el){if(!el)return;el.textContent='';if(NET.ok===false)return;try{if(NET.ok==null&&!await netCheck())return;const r=await fb.get('records/'+ti)||{};
  const top=Object.values(r).filter(x=>x&&x.t).sort((a,b)=>a.t-b.t).slice(0,3);if(TI!==ti&&cur!=='setup')return;
  el.innerHTML=top.length?'🌍 World best: '+top.map((x,i)=>`${i+1}. ${esc(x.n)} ${fmt(x.t)}`).join(' · '):'🌍 No world record yet — set the first!';}catch(e){}}
$('onCreate').onclick=()=>{click();netCreate();};$('onJoin').onclick=()=>{click();netJoin($('onCode').value);};
$('onName').addEventListener('change',saveName);$('rmLeave').onclick=async()=>{click();await netExit();go('online');};
$('rmCar').onclick=()=>{click();go('racer');};

// ================= balance test hook =================
// Runs a full race instantly with an autopilot "player" so difficulty and handling can be measured.
function simRace(ti,o){o=o||{};const keep={set:Object.assign({},SV.set),sel:Object.assign({},SV.sel)};
  headless=true;SV.set.diff=o.diff??1;SV.set.laps=o.laps??3;SV.sel.r=Math.floor((o.car??0)/4);SV.sel.t=(o.car??0)%4;mode='single';
  startRace(ti,o.opps||pickOpponents());state='race';cd=0;autoPilot=o.pilot??1;player.skill=o.pilot??1;player.cornerSkill=o.pilotCorner??1;
  let t=0;const dt=1/60;let driftSegs=0,wasDrift=false,maxAlpha=0;
  while(t<(o.maxT||420)&&!player.finished){step(dt);t+=dt;if(player.drifting&&!wasDrift)driftSegs++;wasDrift=player.drifting;maxAlpha=Math.max(maxAlpha,Math.abs(player.alpha));}
  const st=standings(),out={track:ti,place:st.indexOf(player)+1,time:player.finished?+player.finishTime.toFixed(2):null,best:bestLap&&+bestLap.toFixed(2),
    gapToFirstAI:+(player.finishTime-(Math.min(...cars.filter(c=>!c.isPlayer&&c.finished).map(c=>c.finishTime))||0)).toFixed(2),
    aiFinished:cars.filter(c=>!c.isPlayer&&c.finished).length,walls:wallHits,drifts:driftSegs,driftTime:+driftTime.toFixed(1),maxSlide:+maxAlpha.toFixed(2)};
  headless=false;autoPilot=0;SV.set=keep.set;SV.sel=keep.sel;state='menu';cars=[];player=null;return out;}
window.__ss={net:()=>NET,ai:(c)=>aiInput(c,1/60),curv:(i)=>curvA[i%N],driftTest:(ti,fn,secs)=>{headless=true;SV.sel.r=0;SV.sel.t=3;mode='single';startRace(ti,pickOpponents());state='race';cd=0;window.__inp=fn;const log=[];let t=0;
  while(t<secs){step(1/60);t+=1/60;if(Math.round(t*60)%6===0)log.push([+t.toFixed(1),+player.v.toFixed(0),+player.alpha.toFixed(2),player.drifting?1:0,player.latch?1:0,+angDiff(player.h,Math.atan2(T[player.idx].x,T[player.idx].z)).toFixed(2),+player.lat.toFixed(1)]);}
  window.__inp=null;headless=false;state='menu';const r=log;cars=[];player=null;return r;},world:()=>world,hg:()=>HG,trackInfo:(ti)=>{buildTrack(ti);return{P:P.filter((_,i)=>i%2===0).map(p=>[+p.x.toFixed(1),+p.z.toFixed(1)]),N,HW:+HW.toFixed(2),tun:lastFeat.tun,river:lastFeat.river,over:lastFeat.over};},go,buildTrack,setShowCar,simRace,startRace:(ti)=>{mode='single';startRace(ti,pickOpponents());},state:()=>state,cars:()=>cars,trk:()=>({P,N}),
  startGP:(c)=>{SV.sel.r=0;startGP(c);},gp:()=>GP};

resize();buildTrack(SV.sel.track);go('title');
$('help').innerHTML=isTouch?'Auto-gas · ◀ ▶ steer · HOLD DRIFT while turning (or double-tap BRAKE to lock a drift) · BOOST to fire · tuck behind rivals to slipstream'
 :'Keyboard: W/S gas & brake · A/D steer · HOLD Space to drift (or double-tap S to lock it) · Shift boost · Esc pause<br>Controller: RT gas · LT brake · stick steer · HOLD A or RB to drift (or double-tap LT) · X/B/LB boost · Start pause';
requestAnimationFrame(loop);
})();
