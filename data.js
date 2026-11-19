// Slipstream '96 — shared game data (racers, cars, themes, tracks, car models)
(function(root){
'use strict';
const D={};

D.RACERS=[
 {name:'Rhea Volt',   team:'Volt',    bio:'Ex-courier who never misses a gap.',          body:0x2f7bff,accent:0xffd400,rim:0x222222,spoiler:2,stripe:1},
 {name:'Dax Moreno',  team:'Moreno',  bio:'Fiery showman who lives for the crowd.',     body:0xff3b3b,accent:0xffffff,rim:0xdddddd,spoiler:3,stripe:2},
 {name:'Ines Calder', team:'Calder',  bio:'Precise former rally champion.',             body:0x1f9a5a,accent:0x111111,rim:0xffd400,spoiler:1,stripe:1},
 {name:'Bruno Kowal', team:'Kowal',   bio:'Built like a truck. Drives like one too.',   body:0xff7a1a,accent:0x444444,rim:0x111111,spoiler:4,stripe:0},
 {name:'Suki Lane',   team:'Lane',    bio:'Street-racing prodigy from the harbor.',     body:0xff4fa3,accent:0xffffff,rim:0xff4fa3,spoiler:2,stripe:2},
 {name:'Otto Reyes',  team:'Reyes',   bio:'Retired stuntman chasing one last title.',   body:0x7d4dff,accent:0xffc21a,rim:0xffc21a,spoiler:0,stripe:1},
 {name:'Nova Quinn',  team:'Quinn',   bio:'Engineer who tunes every bolt herself.',     body:0x18c8d8,accent:0xffffff,rim:0x222222,spoiler:3,stripe:1},
 {name:'Gus Marlowe', team:'Marlowe', bio:'Old-school veteran, smooth as butter.',      body:0x8a5a3a,accent:0xf4e3c0,rim:0xf4e3c0,spoiler:1,stripe:2},
 {name:'Zara Okoye',  team:'Okoye',   bio:'Fearless, fast and always flat-out.',        body:0xffd400,accent:0x111111,rim:0x111111,spoiler:2,stripe:2},
 {name:'Felix Dunn',  team:'Dunn',    bio:'Calculating rookie with something to prove.',body:0xc8ccd4,accent:0xe8283c,rim:0xe8283c,spoiler:4,stripe:1}
];
D.TYPES=['balanced','speed','accel','drift'];
D.TYPE_LABEL={balanced:'Balanced',speed:'Speed',accel:'Acceleration',drift:'Drift'};
D.TYPE_COLOR={balanced:'#7dffb0',speed:'#29d4ff',accel:'#ffd23f',drift:'#ff4fa3'};
const MODEL={balanced:'GT',speed:'Arrow',accel:'Hornet',drift:'Slider'};
// [speed, acceleration, drift] — every car totals 18 points, every car is unique
const ST={
 balanced:[[6,6,6],[7,6,5],[7,5,6],[6,7,5],[5,7,6],[6,5,7],[5,6,7],[7,7,4],[7,4,7],[4,7,7]],
 speed:   [[8,6,4],[8,5,5],[8,4,6],[9,5,4],[9,4,5],[9,6,3],[9,3,6],[10,4,4],[10,5,3],[10,3,5]],
 accel:   [[6,8,4],[5,8,5],[4,8,6],[5,9,4],[4,9,5],[6,9,3],[3,9,6],[4,10,4],[5,10,3],[3,10,5]],
 drift:   [[6,4,8],[5,5,8],[4,6,8],[5,4,9],[4,5,9],[6,3,9],[3,6,9],[4,4,10],[5,3,10],[3,5,10]]
};
const PERM={balanced:i=>i,speed:i=>(i*3)%10,accel:i=>(i*7+1)%10,drift:i=>(i*9+2)%10};
D.STAT_TOTAL=18;
D.carDef=function(r,type){const s=ST[type][PERM[type](r)];
  return {id:r*4+D.TYPES.indexOf(type),racer:r,type,name:D.RACERS[r].team+' '+MODEL[type],spd:s[0],acc:s[1],drf:s[2]};};

D.THEMES=[
 {name:'Sunset Coast', cup:'Sunset Cup', sky:0xffa866,fog:0xffc48a,ground:0x86c24f,veg:'palm',  vegCol:0x2f8f3a,mtn:0x8a6fb0,road:0x4a4f5a,wall:[0xffffff,0xff3b6b]},
 {name:'Pine Ridge',   cup:'Timber Cup', sky:0x8fd0ff,fog:0xbfe3ff,ground:0x5aa045,veg:'pine',  vegCol:0x1f6b34,mtn:0x6f8fa8,road:0x50545c,wall:[0xffffff,0x2f7bff]},
 {name:'Neon Mesa',    cup:'Mirage Cup', sky:0xff7aa8,fog:0xffa08a,ground:0xe0a25a,veg:'cactus',vegCol:0x3f8f4a,mtn:0xb5523a,road:0x55505a,wall:[0xffe14d,0x7d4dff]},
 {name:'Frostbite',    cup:'Glacier Cup',sky:0xcfe6ff,fog:0xe6f2ff,ground:0xeef3fa,veg:'pine',  vegCol:0x2d5a3d,mtn:0xa9bcd6,road:0x5a5f6a,wall:[0xff3b3b,0xffffff]},
 {name:'Midnight Metro',cup:'Neon Cup',  sky:0x0b0b2a,fog:0x1a1040,ground:0x22222e,veg:'building',vegCol:0x2a2a44,mtn:0x2a2050,road:0x2e2e3a,wall:[0xff2d6b,0x29d4ff],night:true},
 {name:'Autumn Valley',cup:'Harvest Cup',sky:0xffd9a0,fog:0xffe2b8,ground:0xb79a45,veg:'round', vegCol:0xd9661f,mtn:0x9a6a4a,road:0x4e4a50,wall:[0xffffff,0xff8a1f]},
 {name:'Magma Isle',   cup:'Inferno Cup',sky:0x6a2a24,fog:0x8a3a2a,ground:0x3a2a2a,veg:'rock',  vegCol:0x1f1a1a,mtn:0x2a1414,road:0x3a3a40,wall:[0xff6a00,0x222222]},
 {name:'Jade Lagoon',  cup:'Lagoon Cup', sky:0x7fe0ff,fog:0xb0f0ff,ground:0x4fc06a,veg:'palm',  vegCol:0x1f9a5a,mtn:0x3f9a7a,road:0x4a505a,wall:[0xffe14d,0x18c8d8]},
 {name:'Red Canyon',   cup:'Canyon Cup', sky:0xffb98a,fog:0xffcba8,ground:0xc8683a,veg:'rock',  vegCol:0xa8502a,mtn:0x9a3a22,road:0x524a4a,wall:[0xffffff,0x222222]},
 {name:'Meadow Hills', cup:'Meadow Cup', sky:0xa8e0ff,fog:0xcdeeff,ground:0x7ccf5a,veg:'round', vegCol:0x3f9a3a,mtn:0x7a9ac0,road:0x4e535c,wall:[0xffffff,0x2ecc71]}
];
D.TRACK_NAMES=[
 ['Palm Bay Sprint','Coral Run','Lighthouse Loop','Breakwater Bend','Boardwalk Blitz'],
 ['Timber Trail','Logger\'s Leap','Ranger Pass','Cedar Spiral','Pinecone Point'],
 ['Dust Devil','Mirage Mile','Rattlesnake Run','Sunbaked Circuit','Neon Mesa'],
 ['Glacier Gate','Snowcap Sweep','Iceline Drift','Polar Pass','Frostbite Peak'],
 ['Neon Boulevard','Skyline Spiral','Tunnel Vision','Downtown Dash','Midnight Ring'],
 ['Maple Mile','Harvest Hairpins','Amber Lane','Orchard Ring','Pumpkin Patch'],
 ['Ashfall Alley','Cinder Circuit','Obsidian Edge','Caldera Crown','Lava Lane'],
 ['Reef Runner','Mango Mile','Tiki Turn','Bamboo Bends','Jade Lagoon'],
 ['Mesa Gulch','Sandstone Snake','Coyote Climb','Buttes Blast','Red Canyon'],
 ['Clover Curve','Windmill Way','Daisy Dash','Bluebell Bypass','Meadow Hills']
];

// closed centripetal Catmull-Rom + arc-length resampling (used by game and generator)
D.catmull=function(pts,per){const n=pts.length,out=[];
  const d=(a,b)=>Math.max(1e-4,Math.pow(Math.hypot(b[0]-a[0],b[1]-a[1]),.5));
  for(let i=0;i<n;i++){const p0=pts[(i-1+n)%n],p1=pts[i],p2=pts[(i+1)%n],p3=pts[(i+2)%n];
    const t0=0,t1=t0+d(p0,p1),t2=t1+d(p1,p2),t3=t2+d(p2,p3);
    for(let s=0;s<per;s++){const t=t1+(t2-t1)*s/per;
      const L=(a,b,ta,tb)=>{const u=(t-ta)/(tb-ta);return[a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u];};
      const A1=L(p0,p1,t0,t1),A2=L(p1,p2,t1,t2),A3=L(p2,p3,t2,t3),B1=L(A1,A2,t0,t2),B2=L(A2,A3,t1,t3);
      out.push(L(B1,B2,t1,t2));}}
  return out;};
D.resample=function(d,step){const n=d.length,seg=[];let total=0;
  for(let i=0;i<n;i++){const a=d[i],b=d[(i+1)%n],l=Math.hypot(b[0]-a[0],b[1]-a[1]);seg.push(l);total+=l;}
  const N=Math.max(8,Math.round(total/step)),st=total/N,out=[];let i=0,acc=0;
  for(let k=0;k<N;k++){const tg=k*st;while(i<n-1&&acc+seg[i]<tg){acc+=seg[i];i++;}
    const a=d[i],b=d[(i+1)%n],f=seg[i]>0?(tg-acc)/seg[i]:0;out.push([a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f]);}
  return out;};

// car models: data-driven faces so the game and the preview renderer build identical cars
const PROF={
 balanced:{W:2.2,body:[[-2.3,.25],[2.25,.25],[2.45,.45],[2.3,.7],[.9,.92],[-1.9,.98],[-2.35,.9]],
   cab:[[.85,.89],[0,1.46],[-1,1.48],[-1.75,.94]],cw:[.95,.72],wx:1.12,wf:1.45,wr:-1.45,r:.46,w:.42},
 speed:{W:2.15,body:[[-2.55,.22],[2.5,.22],[2.75,.32],[2.55,.5],[.6,.8],[-2.2,.85],[-2.6,.78]],
   cab:[[.55,.77],[-.4,1.2],[-1.3,1.21],[-2,.82]],cw:[.85,.6],wx:1.1,wf:1.75,wr:-1.7,r:.46,w:.42},
 accel:{W:2.2,body:[[-1.95,.25],[1.85,.25],[2,.5],[1.8,.85],[.8,1],[-1.9,1.05],[-2,.85]],
   cab:[[.8,.97],[.1,1.62],[-1.6,1.66],[-1.92,1.02]],cw:[.98,.8],wx:1.12,wf:1.3,wr:-1.3,r:.46,w:.42},
 drift:{W:2.35,body:[[-2.25,.22],[2.25,.22],[2.45,.4],[2.3,.68],[.85,.86],[-1.8,.9],[-2.3,.8]],
   cab:[[.8,.83],[0,1.36],[-.95,1.38],[-1.6,.87]],cw:[.9,.68],wx:1.24,wf:1.45,wr:-1.4,r:.48,w:.5}
};
function newell(v){let x=0,y=0,z=0;for(let i=0;i<v.length;i++){const a=v[i],b=v[(i+1)%v.length];x+=(a[1]-b[1])*(a[2]+b[2]);y+=(a[2]-b[2])*(a[0]+b[0]);z+=(a[0]-b[0])*(a[1]+b[1]);}
  const l=Math.hypot(x,y,z);return l?[x/l,y/l,z/l]:null;}
function solid(polys,c,out){// orient every face of a convex piece outward
  const all=polys.flat(),cen=[0,1,2].map(k=>all.reduce((s,p)=>s+p[k],0)/all.length);
  for(let v of polys){let n=newell(v);if(!n)continue;const fc=[0,1,2].map(k=>v.reduce((s,p)=>s+p[k],0)/v.length);
    if(n[0]*(fc[0]-cen[0])+n[1]*(fc[1]-cen[1])+n[2]*(fc[2]-cen[2])<0){v=v.slice().reverse();n=n.map(x=>-x);}
    out.push({v:v.map(p=>p.map(x=>+x.toFixed(4))),n,c:typeof c==='function'?c(v,n):c});}}
function boxP(w,h,d,x,y,z){const X=[x-w/2,x+w/2],Y=[y-h/2,y+h/2],Z=[z-d/2,z+d/2],P=(i,j,k)=>[X[i],Y[j],Z[k]];
  return[[P(0,0,0),P(0,1,0),P(0,1,1),P(0,0,1)],[P(1,0,0),P(1,0,1),P(1,1,1),P(1,1,0)],[P(0,0,0),P(0,0,1),P(1,0,1),P(1,0,0)],
    [P(0,1,0),P(1,1,0),P(1,1,1),P(0,1,1)],[P(0,0,0),P(1,0,0),P(1,1,0),P(0,1,0)],[P(0,0,1),P(0,1,1),P(1,1,1),P(1,0,1)]];}
function loftP(pts,wb,wt,ox){let y0=1e9,y1=-1e9;pts.forEach(p=>{y0=Math.min(y0,p[1]);y1=Math.max(y1,p[1]);});
  const hw=y=>wb+(wt-wb)*((y-y0)/((y1-y0)||1));const R=pts.map(p=>[ox+hw(p[1]),p[1],p[0]]),L=pts.map(p=>[ox-hw(p[1]),p[1],p[0]]),F=[R,L];
  for(let i=0;i<pts.length;i++){const j=(i+1)%pts.length;F.push([R[i],R[j],L[j],L[i]]);}return F;}
function cylP(r,w,x,y,z,n){const A=[],B=[];for(let i=0;i<n;i++){const a=(i+.5)/n*Math.PI*2;A.push([x-w/2,y+r*Math.cos(a),z+r*Math.sin(a)]);B.push([x+w/2,y+r*Math.cos(a),z+r*Math.sin(a)]);}
  const F=[A,B];for(let i=0;i<n;i++){const j=(i+1)%n;F.push([A[i],A[j],B[j],B[i]]);}return F;}
D.PROF=PROF;
D.carFaces=function(type,spoiler,stripe,ex){
  ex=ex||{};
  const p=PROF[type],W=p.W,out=[],box=(w,h,d,x,y,z,c)=>solid(boxP(w,h,d,x,y,z),c,out);
  const body=p.body,nose=body[2],hood=body[3],tail=body[body.length-1],fz=body[1][0],rz=Math.min(...body.map(q=>q[0]));
  solid(loftP(body,W/2,W/2-.12,0),'body',out);
  solid(loftP(p.cab,p.cw[0],p.cw[1],0),'glass',out);
  const r1=p.cab[1],r2=p.cab[2],cap=[[r1[0]-.08,r1[1]-.03],[r2[0],r2[1]-.03],[r2[0],r2[1]+.05],[r1[0]-.1,r1[1]+.05]];
  solid(loftP(cap,p.cw[1]+.04,p.cw[1]+.02,0),'body',out);
  // stripes follow the body and roof
  if(stripe){const cz=body.reduce((s,q)=>s+q[0],0)/body.length,cy=body.reduce((s,q)=>s+q[1],0)/body.length;
    const sb=body.map(q=>[q[0]+Math.sign(q[0]-cz)*.02,q[1]+(q[1]>cy?.02:0)]),sc=cap.map(q=>[q[0]+(q[0]>r2[0]+.3?.01:-.01),q[1]+.015]);
    const xs=stripe===1?[[0,.3]]:stripe===2?[[-.42,.13],[.42,.13]]:[];
    for(const[x,h]of xs){solid(loftP(sb,h,h,x),'accent',out);solid(loftP(sc,h,h,x),'accent',out);}}
  if(stripe===3)for(const s of[-1,1])box(.03,.1,(fz-rz)*.86,s*(W/2-.075),body[4][1]-.2,(fz+rz)/2-.1,'accent');
  if(ex.tone===1)for(const s of[-1,1])box(.03,.26,(fz-rz)*.9,s*(W/2+.012),.37,(fz+rz)/2,'accent');
  if(ex.tone===2)for(const s of[-1,1]){box(.03,.08,(fz-rz)*.9,s*(W/2+.012),.5,(fz+rz)/2,'accent');box(.03,.05,(fz-rz)*.9,s*(W/2+.012),.38,(fz+rz)/2,'accent');}
  // front end
  box(W*.55,.17,.1,0,nose[1]-.02,nose[0]-.02,'dark');
  box(W-.15,.06,.4,0,.22,fz,'dark');
  for(const s of[-1,1]){box(.5,.11,.32,s*(W/2-.4),hood[1]-.03,hood[0]-.05,'head');}
  // rear end
  box(W-.35,.11,.06,0,tail[1]-.1,rz-.01,'tail');
  box(W*.7,.14,.3,0,.3,rz+.12,'dark');
  for(const s of[-1,1])box(.2,.15,.3,s*.45,.32,rz-.04,'chrome');
  // sides
  for(const s of[-1,1]){box(.08,.12,(p.wf-p.wr)-1.25,s*(W/2-.02),.31,(p.wf+p.wr)/2,'dark');
    box(.28,.12,.16,s*(p.cw[0]+.1),p.cab[0][1]+.16,p.cab[0][0]-.35,'body');}
  const hz=(hood[0]+body[4][0])/2,hy=(hood[1]+body[4][1])/2,hdef=!ex.hood;
  if(type==='speed'){for(const s of[-1,1])box(.28,.3,2.1,s*1.1,.48,-.45,'accent');if(hdef)for(const s of[-.35,.35])box(.18,.05,.7,s,hood[1]+.06,hz,'dark');}
  if(type==='accel'&&hdef)box(.7,.2,.8,0,body[4][1]+.02,hz,'accent');
  if(ex.hood===1){box(.8,.24,1,0,hy+.1,hz,'body');box(.6,.14,.06,0,hy+.13,hz+.5,'dark');}
  if(ex.hood===2)for(const s of[-.42,.42])for(const dz of[-.22,.12])box(.34,.05,.14,s,hy+.06,hz+dz,'dark');
  if(ex.hood===3)box(1,.14,1.7,0,hy+.04,hz,'accent');
  if(type==='drift'||ex.kit===2)for(const s of[-1,1])for(const z of[p.wf,p.wr])box(.24,.4,1.3,s*(W/2+.07),.62,z,'body');
  if(type==='drift'&&hdef)for(const s of[-.4,.4])box(.32,.05,.5,s,hood[1]+.06,hz,'dark');
  if(ex.kit===1){box(W+.12,.07,.55,0,.19,fz+.12,'accent');for(const s of[-1,1])box(.14,.16,(p.wf-p.wr)-.9,s*(W/2+.04),.29,(p.wf+p.wr)/2,'accent');for(const x of[-.5,0,.5])box(.05,.18,.32,x,.28,rz+.05,'accent');}
  if(ex.kit===3){const ry=p.cab[1][1]+.05;box(1.3,.12,.18,0,ry+.12,p.cab[1][0]-.15,'dark');for(const x of[-.45,-.15,.15,.45])box(.22,.18,.06,x,ry+.14,p.cab[1][0]-.05,'head');
    box(W*.6,.08,.08,0,.62,fz+.25,'chrome');for(const x of[-.5,.5])box(.08,.5,.08,x,.45,fz+.25,'chrome');for(const s of[-1,1])box(.4,.45,.05,s*p.wx,.42,p.wr-.62,'dark');}
  // spoilers
  const top=tail[1],sz=rz+.35,wing=(h)=>{const pr=[[.32,0],[-.32,.03],[-.34,.12],[.26,.08]].map(q=>[q[0]+sz,q[1]+top+h]);
    solid(loftP(pr,W/2+.05,W/2+.05,0),'accent',out);for(const s of[-1,1])box(.06,.34,.66,s*(W/2+.07),top+h+.03,sz,'accent');};
  if(spoiler===1)box(W-.1,.08,.35,0,top+.03,rz+.2,'accent');
  if(spoiler===2||spoiler===4){wing(.42);for(const s of[-.65,.65])box(.1,.42,.18,s,top+.2,sz,'dark');}
  if(spoiler===3||spoiler===4){wing(.82);for(const s of[-.65,.65])box(.1,.82,.18,s,top+.4,sz,'dark');}
  // wheels: tire, rim, hub
  for(const s of[-1,1])for(const z of[p.wf,p.wr]){const x=s*p.wx;
    solid(cylP(p.r,p.w,x,p.r,z,14),'tire',out);const wv=ex.wheel||0,ox=s*(p.wx+p.w/2+.03);
    if(wv===0){solid(cylP(p.r*.64,p.w+.03,x,p.r,z,10),'rim',out);solid(cylP(p.r*.2,p.w+.07,x,p.r,z,6),'dark',out);}
    if(wv===1){solid(cylP(p.r*.66,p.w+.02,x,p.r,z,12),'dark',out);box(.05,p.r*1.25,.1,ox,p.r,z,'rim');box(.05,.1,p.r*1.25,ox,p.r,z,'rim');solid(cylP(p.r*.18,p.w+.1,x,p.r,z,6),'rim',out);}
    if(wv===2){solid(cylP(p.r*.8,p.w+.03,x,p.r,z,14),'rim',out);solid(cylP(p.r*.52,p.w+.06,x,p.r,z,10),'dark',out);solid(cylP(p.r*.17,p.w+.09,x,p.r,z,6),'chrome',out);}
    if(wv===3){solid(cylP(p.r*.7,p.w+.03,x,p.r,z,12),'rim',out);solid(cylP(p.r*.54,p.w+.05,x,p.r,z,12),'dark',out);solid(cylP(p.r*.4,p.w+.07,x,p.r,z,10),'rim',out);solid(cylP(p.r*.18,p.w+.09,x,p.r,z,6),'dark',out);}}
  return {faces:out,rearZ:rz,frontZ:nose[0]};
};

// low-poly racer figures (original characters)
D.CHARS=[
 {skin:0xc68c5a,hair:0x2a55cc,style:'pixie',acc:'goggles',b:1},
 {skin:0xa86b45,hair:0x151515,style:'slick',acc:'mustache',b:1.12},
 {skin:0xf1c7a5,hair:0x8a3a1a,style:'ponytail',acc:'',b:.95},
 {skin:0xe5b08a,hair:0x5a3a1a,style:'bald',acc:'beard',b:1.25},
 {skin:0xf0c9a0,hair:0xff6fb5,style:'bob',acc:'shades',b:.92},
 {skin:0xb97a4f,hair:0xbbbbbb,style:'slick',acc:'beard',b:1.05},
 {skin:0x7a4a2a,hair:0x1a1a1a,style:'afro',acc:'headband',b:.98},
 {skin:0xf2c4a0,hair:0x6a4a2a,style:'cap',acc:'mustache',b:1.08,hair2:0xeeeeee},
 {skin:0x5a3520,hair:0x111111,style:'bun',acc:'shades',b:.95},
 {skin:0xf5d0b0,hair:0xf2d060,style:'spiky',acc:'',b:1}
];
D.charFaces=function(r){
  const C=D.CHARS[r],b=C.b,out=[],box=(w,h,d,x,y,z,c)=>solid(boxP(w,h,d,x,y,z),c,out),fh=C.hair2?'hair2':'hair';
  const ax=.31*b+.11;
  for(const s of[-1,1]){box(.3,.16,.46,s*.15,.08,.06,'dark');box(.26,.84,.28,s*.15,.58,0,'body');box(.03,.8,.1,s*(.15+.13),.58,0,'accent');
    box(.2,.62,.22,s*ax,1.34,0,'body');box(.21,.08,.23,s*ax,1.06,0,'accent');box(.19,.17,.21,s*ax,.94,0,'accent');}
  box(.62*b,.7,.38,0,1.34,0,'body');box(.62*b+.02,.1,.4,0,1.5,0,'accent');box(.58*b,.08,.36,0,.99,0,'dark');
  box(.34,.08,.32,0,1.72,0,'accent');box(.18,.1,.18,0,1.78,0,'skin');
  box(.46,.52,.46,0,2.07,0,'skin');box(.08,.1,.08,0,2.02,.26,'skin');
  if(C.acc!=='shades'){for(const s of[-1,1]){box(.11,.09,.02,s*.1,2.1,.235,'white');box(.05,.07,.02,s*.1,2.095,.245,'dark');}}
  else box(.42,.1,.04,0,2.1,.25,'dark');
  for(const s of[-1,1])box(.12,.03,.02,s*.1,2.18,.235,'hair');
  box(.14,.03,.02,0,1.92,.235,'dark');
  const top=()=>box(.5,.12,.5,0,2.36,0,'hair'),back=(h)=>box(.5,h,.08,0,2.33-h/2,-.25,'hair');
  switch(C.style){
    case'pixie':top();box(.5,.12,.08,0,2.27,.24,'hair');back(.3);break;
    case'slick':box(.5,.1,.5,0,2.35,-.02,'hair');back(.36);for(const s of[-1,1])box(.04,.14,.24,s*.25,2.17,-.08,'hair');break;
    case'ponytail':top();back(.32);box(.14,.48,.14,0,2.04,-.34,'hair');box(.5,.1,.08,0,2.28,.24,'hair');break;
    case'bald':for(const s of[-1,1])box(.04,.14,.3,s*.25,2.12,-.06,'hair');box(.5,.14,.05,0,2.12,-.25,'hair');break;
    case'bob':top();back(.42);for(const s of[-1,1])box(.07,.4,.46,s*.26,2.14,-.01,'hair');box(.5,.12,.08,0,2.27,.24,'hair');break;
    case'afro':box(.72,.5,.66,0,2.34,-.05,'hair');for(const s of[-1,1])box(.1,.3,.5,s*.29,2.1,-.08,'hair');break;
    case'cap':box(.52,.13,.52,0,2.37,0,'hair');box(.48,.04,.22,0,2.32,.33,'hair');for(const s of[-1,1])box(.04,.16,.12,s*.25,2.12,.08,'hair2');break;
    case'bun':top();back(.3);box(.24,.24,.24,0,2.48,-.14,'hair');break;
    case'spiky':top();for(const[x,z,h]of[[-.15,.12,.22],[0,.14,.3],[.15,.1,.24],[-.12,-.1,.26],[.12,-.12,.2],[0,-.02,.34]])box(.13,h,.13,x,2.42+h/2-.05,z,'hair');back(.28);break;
  }
  if(C.acc==='goggles'){box(.49,.07,.49,0,2.25,0,'accent');for(const s of[-1,1])box(.15,.12,.05,s*.11,2.26,.25,'lens');}
  if(C.acc==='headband')box(.49,.07,.49,0,2.24,0,'white');
  if(C.acc==='mustache'||C.acc==='beard')box(.24,.06,.04,0,1.96,.245,fh);
  if(C.acc==='beard'){box(.4,.16,.1,0,1.88,.2,fh);for(const s of[-1,1])box(.05,.26,.36,s*.23,1.99,.02,fh);}
  const HS=1.18,HY=1.74;for(const f of out){if(f._head)continue;}
  return out.map(f=>{const hd=f.v.every(p=>p[1]>=1.73);return hd?{v:f.v.map(p=>[+(p[0]*HS).toFixed(4),+(HY+(p[1]-HY)*HS).toFixed(4),+(p[2]*HS).toFixed(4)]),n:f.n,c:f.c}:f;});
};

D.SPOILERS=['None','Lip','Wing','High Wing','Double Wing'];
D.STRIPES=['None','Center','Twin','Side'];
D.HOODS=['Stock','Scoop','Vents','Bulge'];D.KITS=['Stock','Street','Wide','Rally'];D.WHEELS=['Classic','Cross','Deep Dish','Turbine'];D.TONES=['Solid','Two-tone','Pinstripe'];
D.NUMBERS=[7,22,3,88,15,41,9,64,11,27];

D.TRACKS=[{"name":"Palm Bay Sprint","theme":0,"pts":[[152.2,-104.3],[334.2,103.9],[208.5,165.2],[36.1,175.9],[-173.8,260.2],[-311.8,67.4],[-251.4,-177.6],[-45.9,-72.6],[49.9,-135]],"s0":0.8133,"len":1800},{"name":"Coral Run","theme":0,"pts":[[-158.5,-328],[-283.9,-174],[-287.3,143.3],[-236.2,310.3],[94.4,371.8],[274,290.9],[364.1,22.3],[254,-183.3],[115.8,-348.5]],"s0":0.757,"len":2272},{"name":"Lighthouse Loop","theme":0,"pts":[[-234.3,-10.9],[-187.7,-91.7],[-96.9,-127],[43.2,-172.1],[139.5,-172.5],[273.9,-114.3],[285.8,44.6],[258.1,99],[131.8,174],[-25.1,205.8],[-116.6,115.6],[-201.1,58.2]],"s0":0.1704,"len":1432},{"name":"Breakwater Bend","theme":0,"pts":[[342.7,223],[472.7,-36.6],[118.3,-175.6],[-17.7,-273.5],[-143.6,-60.6],[-185.9,79.6],[-88.5,156.1],[135.2,301.2]],"s0":0.2824,"len":1884},{"name":"Boardwalk Blitz","theme":0,"pts":[[-55.1,-305.8],[-94.9,-118],[-268.1,-117.3],[-319.1,0],[-178.1,120.1],[-60.1,232.9],[114.2,248.2],[208.7,119.3],[213.6,59],[309.7,-130.7],[124.5,-289.4]],"s0":0.7077,"len":1916},{"name":"Timber Trail","theme":1,"pts":[[70.5,-222.9],[-57.2,-275.3],[-309,-141.3],[-215.2,72.8],[-55,157.7],[34.2,195.7],[235.7,171.4],[140.5,-69.5]],"s0":0.8425,"len":1600},{"name":"Logger's Leap","theme":1,"pts":[[132.2,-233],[-42.4,-147.7],[-287.6,-86.9],[-263.8,57.2],[-255.6,189.3],[-144.6,248.8],[64.3,212.5],[240.6,130.5],[184.2,-58.7],[201.8,-202.3]],"s0":0.1831,"len":1704},{"name":"Ranger Pass","theme":1,"pts":[[-149.3,346.4],[28.3,219.7],[171.7,164.2],[141.2,42.3],[218.7,-84.7],[155.1,-200.6],[37.8,-247.4],[-87.6,-220.7],[-109.1,-91.3],[-96.2,-6.2],[-347.7,187.4]],"s0":0.7704,"len":1864},{"name":"Cedar Spiral","theme":1,"pts":[[-270.8,63.9],[-170.3,302.4],[22,332.6],[247.9,362.9],[287.7,121.4],[365.3,-31.5],[252.1,-227.3],[34.6,-107.3],[-123.7,-360],[-341.1,-292.5],[-411.6,-105.2]],"s0":0.6848,"len":2576},{"name":"Pinecone Point","theme":1,"pts":[[45.3,191.9],[-127.8,216],[-366.5,-28.1],[-136.8,-131.4],[-8.7,-116.9],[155.2,-187.7],[306.9,-13.7],[258.5,199.8]],"s0":0.9552,"len":1784},{"name":"Dust Devil","theme":2,"pts":[[-73,-402.7],[56.8,-154],[170.1,-73],[299.6,177.7],[128.9,231.8],[38,273.4],[-44.5,152.4],[-246.6,112.5],[-173.1,-105],[-168.2,-333.7]],"s0":0.076,"len":1948},{"name":"Mirage Mile","theme":2,"pts":[[160.7,-254.6],[322.5,-120.1],[151.6,111.9],[42.7,241.2],[-77,197.4],[-150,62.9],[-380.6,-135.6],[-69.6,-273.2]],"s0":0.2296,"len":1864},{"name":"Rattlesnake Run","theme":2,"pts":[[-88.1,117.9],[-18.8,304.8],[210.9,403.2],[305.4,134.3],[241,-104.7],[70.8,-169.5],[-5.6,-165.8],[-184.8,-112.4],[-255.8,9.6]],"s0":0.719,"len":1808},{"name":"Sunbaked Circuit","theme":2,"pts":[[-394,164.7],[-317.6,-63.3],[-122.3,-206.9],[50.1,-283.6],[164.5,-174.9],[339.5,-33],[234.6,226.4],[8.2,197.2],[-197.4,253.4]],"s0":0.224,"len":2036},{"name":"Neon Mesa","theme":2,"pts":[[-190,-275.5],[9.4,-169],[117.1,-82.9],[266.2,67],[221.1,305.6],[53.4,261.8],[-169.1,230.9],[-328,-15.8]],"s0":0.0909,"len":1848},{"name":"Glacier Gate","theme":3,"pts":[[-121.5,-108.9],[-75.8,-352],[148,-359.9],[241.2,-235.1],[117.3,-13.4],[87.4,222.2],[-37.7,204.4],[-110.4,158.3],[-100.8,24.2]],"s0":0.0293,"len":1636},{"name":"Snowcap Sweep","theme":3,"pts":[[-38.7,108.8],[-84.2,75.7],[-100.4,-16.7],[-127.9,-248.3],[49.8,-352.8],[169.6,-278.9],[249,-57.9],[234.2,180.3],[30.8,233.9]],"s0":0.1407,"len":1592},{"name":"Iceline Drift","theme":3,"pts":[[35,168.2],[-27.8,118.5],[-135.2,123.2],[-163.2,-80],[-81.1,-115.9],[-62.6,-263.3],[82.9,-331.9],[227.7,-157.3],[254.3,132.8],[128.8,175.2]],"s0":0.7437,"len":1576},{"name":"Polar Pass","theme":3,"pts":[[341.3,144.2],[55.6,82.9],[61.2,444.6],[-212.7,380.5],[-264.4,242.4],[-259.7,-18.1],[-182.3,-133.8],[-99.4,-175.6],[-2.1,-113.6],[185.8,-177],[338.8,-69.1]],"s0":0.2129,"len":2348},{"name":"Frostbite Peak","theme":3,"pts":[[-54.5,-293.3],[-234.3,-266.7],[-298.7,-75],[-300.1,62.6],[-140,213.2],[38.9,246.7],[313.6,307.9],[423.8,106.3],[369.1,-133.3],[128.1,-212.7]],"s0":0.4843,"len":2172},{"name":"Neon Boulevard","theme":4,"pts":[[-195.1,317.1],[44.9,292.6],[77.1,25],[190.5,-75],[383.8,-314.8],[183.2,-386.3],[-60.8,-220.5],[-141.4,-54.1],[-176.9,61.3],[-282.2,279.7]],"s0":0.3457,"len":2164},{"name":"Skyline Spiral","theme":4,"pts":[[-211.1,-303.7],[-137.5,-76.4],[-83.9,9.7],[-128.4,119.7],[-44,275.7],[46.3,339.8],[122.1,257.4],[119.8,95.8],[135.1,-7],[113.9,-139.4],[49.3,-190.1],[-32.3,-366.3]],"s0":0.1136,"len":1760},{"name":"Tunnel Vision","theme":4,"pts":[[154.2,-72.9],[6.1,-279.9],[-98.2,-223.1],[-259.9,-81.2],[-300.4,201.3],[-55,173.8],[158.2,306.8],[402.4,57.6]],"s0":0.9318,"len":2052},{"name":"Downtown Dash","theme":4,"pts":[[151.7,17.7],[140.5,-59.6],[66,-306.5],[-118.1,-380.4],[-167,-107.3],[-244.4,8.8],[-157.7,146.7],[-53.9,203.7],[63.6,118.1],[144.6,89.6]],"s0":0.4527,"len":1564},{"name":"Midnight Ring","theme":4,"pts":[[189.2,189.4],[154.4,6.7],[201.6,-223],[84.5,-304.5],[-102.6,-191.2],[-166.2,-106.9],[-282.8,107.4],[-184.9,197.9],[40.9,199.9]],"s0":0.5813,"len":1672},{"name":"Maple Mile","theme":5,"pts":[[-134.5,6.1],[-248.3,126.1],[-180.9,220.1],[-130.2,223.4],[-17.9,157.7],[71.2,133],[116.7,52.7],[240.6,-82.6],[261,-221.2],[163.1,-266.9],[58.5,-233],[-8.8,-178.1],[-64.3,-42.3]],"s0":0.034,"len":1528},{"name":"Harvest Hairpins","theme":5,"pts":[[-12.7,156.9],[-136.6,121.3],[-164.6,-50.2],[-270.2,-340.9],[15.6,-421.2],[247.5,-158.4],[362.2,0.3],[70.2,136.9]],"s0":0.9244,"len":1904},{"name":"Amber Lane","theme":5,"pts":[[193,-244.2],[279.8,-55.4],[108.9,102.4],[46.8,149.5],[-139,143.5],[-222.9,10.9],[-154.7,-104.1],[-47.5,-238.7]],"s0":0.2722,"len":1440},{"name":"Orchard Ring","theme":5,"pts":[[-191.5,-170.5],[-413.9,58.7],[-242.2,385.5],[-22.2,420.7],[132.8,104.4],[484,-95.1],[326.1,-285.8],[-11.9,-435.3]],"s0":0.5667,"len":2668},{"name":"Pumpkin Patch","theme":5,"pts":[[52.4,-72.9],[105.1,-45.8],[165,37.1],[138.1,150.8],[63.7,208.2],[-226.1,330.1],[-290.7,26.9],[-339.9,-80.1],[-182.8,-212.6],[-7.5,-191.2]],"s0":0.2692,"len":1664},{"name":"Ashfall Alley","theme":6,"pts":[[62.3,341.9],[250.8,378.5],[391.1,238.4],[239,45.6],[351.2,-62.9],[193.4,-282.5],[99.1,-313.7],[-101.9,-212.6],[-191.9,-163.9],[-392.7,-199],[-387.9,62.7],[-111.1,67.1],[-71.4,158.8]],"s0":0.516,"len":2620},{"name":"Cinder Circuit","theme":6,"pts":[[58.6,-114.3],[257.2,-34.9],[245.7,178.4],[113.7,189.4],[-122.7,309.3],[-340.1,56.8],[-366.4,-90.7],[-109.5,-168.8]],"s0":0.3831,"len":1796},{"name":"Obsidian Edge","theme":6,"pts":[[78.7,416],[199.2,231.5],[119.9,8.3],[286.4,-128.9],[128.1,-311.7],[38.2,-292.1],[-120.2,-152.8],[-222.5,-77.9],[-140.3,55.3],[-150.7,127.4],[-71.7,275]],"s0":0.5924,"len":1992},{"name":"Caldera Crown","theme":6,"pts":[[410,-79.3],[216.4,131.4],[55.4,231.8],[-77.8,239.4],[-121.9,58.8],[-177.1,-88.9],[-43.7,-162.7],[77.9,-320.5]],"s0":0.1386,"len":1760},{"name":"Lava Lane","theme":6,"pts":[[-18.5,-83.9],[-280.6,-272.5],[-375.9,-66.8],[-133.9,89.3],[8.1,249.8],[218.1,243.9],[283.4,123.3],[257.7,-26.4],[44.7,-88.4]],"s0":0.0809,"len":1880},{"name":"Reef Runner","theme":7,"pts":[[-44.8,-138.8],[-163.7,-213.3],[-257.1,-103.2],[-179.8,48.7],[-68.8,44.4],[-23.1,78.6],[101,202.5],[194.3,118.7],[164.6,33.7],[185.3,-116.1],[76.5,-161.4]],"s0":0.4972,"len":1440},{"name":"Mango Mile","theme":7,"pts":[[278.3,-15.8],[259.4,102.2],[129.8,162.6],[-12.5,86.5],[-71.6,135.7],[-228.1,136],[-232.9,21.4],[-159.5,-75.1],[-193.5,-173.4],[23.5,-326.7],[226.2,-263.8],[191.7,-75.4]],"s0":0.8923,"len":1820},{"name":"Tiki Turn","theme":7,"pts":[[-172.9,-193.3],[-70.9,-364.9],[157.1,-361.1],[283.9,-227.8],[218,-39.9],[255.4,186.2],[45.8,392.6],[-74.3,146.4],[-193.7,156.9],[-251.4,3.6]],"s0":0.7007,"len":2152},{"name":"Bamboo Bends","theme":7,"pts":[[343.6,14.1],[213.9,-271.8],[-33.1,-373.3],[-101.5,-104.5],[-362.2,-4.7],[-254.4,283.2],[2.8,337.3],[231.3,189.1]],"s0":0.3274,"len":2248},{"name":"Jade Lagoon","theme":7,"pts":[[103.5,-169.8],[278.3,-77.2],[242.4,90.3],[13.7,79],[-80.3,155.3],[-199.6,43.7],[-211.8,-68.4],[13.6,-131.4]],"s0":0.8622,"len":1364},{"name":"Mesa Gulch","theme":8,"pts":[[-414.1,112],[18.2,210.9],[215,187.8],[220.6,39.8],[285.6,-199.4],[-10,-300.8],[-114.2,-94.8],[-458.5,-44.6]],"s0":0.851,"len":2148},{"name":"Sandstone Snake","theme":8,"pts":[[97.5,-86.1],[-1.7,-283.6],[-151.7,-160.5],[-93.4,-13.1],[-99,181.1],[-22.3,228],[208.6,206.8],[173.9,-15.5]],"s0":0.0742,"len":1456},{"name":"Coyote Climb","theme":8,"pts":[[-299.9,109.4],[-119,274.5],[33.6,166.1],[79.5,94.8],[293.4,67],[246.8,-130.6],[112.3,-190.2],[-38.4,-227.1],[-106.8,-83],[-313.1,-84.4]],"s0":0.3471,"len":1844},{"name":"Buttes Blast","theme":8,"pts":[[162.8,193.2],[227.5,130.3],[291.6,-40.1],[202.2,-157.8],[121,-268.1],[-14.3,-329],[-177.2,-215.6],[-256.8,-141],[-202.1,0.5],[-242.2,165],[-139,263.2],[-12.5,190]],"s0":0.477,"len":1828},{"name":"Red Canyon","theme":8,"pts":[[122.1,-72.1],[230.6,20.4],[375.2,218.9],[86.8,306.8],[-99.5,304.9],[-296.5,277.4],[-224.3,-33.3],[-174.6,-103.9],[-49.8,-202.7],[53.2,-124.7]],"s0":0.3475,"len":1888},{"name":"Clover Curve","theme":9,"pts":[[295,-25.3],[219.7,69.5],[50.1,113],[-13.3,131.9],[-142.7,95.6],[-242.1,58.3],[-284.7,-105.3],[-86,-224.1],[64.9,-262.9],[192.8,-174.6]],"s0":0.6711,"len":1520},{"name":"Windmill Way","theme":9,"pts":[[242.7,52.5],[71.3,97.5],[23.6,102.1],[-70.9,124.1],[-243.5,128.7],[-212.9,-47.7],[-111.8,-175.9],[-2.1,-256.8],[82.7,-212.4],[191.9,-120.1]],"s0":0.6073,"len":1416},{"name":"Daisy Dash","theme":9,"pts":[[-272.5,-193.2],[8.2,-204],[139.3,-324.8],[356.5,-20.3],[231.2,89.3],[81.1,248.6],[-28.6,153.9],[-214.1,99.1],[-438.1,-68.5]],"s0":0.7839,"len":2092},{"name":"Bluebell Bypass","theme":9,"pts":[[158.7,-87.8],[53.4,-207.6],[-79.9,-74.7],[-301.8,-1.6],[-200.3,156.1],[-46.5,277.8],[218,156.4],[337.9,20.2]],"s0":0.4703,"len":1684},{"name":"Meadow Hills","theme":9,"pts":[[-213.1,-134.8],[-105.8,-247],[51.6,-176.3],[144.7,-155],[166.5,-62.9],[195.1,115.5],[27.5,328.3],[-181.6,356.1],[-263.6,249]],"s0":0.9055,"len":1736}];
if(typeof module!=='undefined'&&module.exports)module.exports=D;else root.SS_DATA=D;
})(this);
