var FUNC_APPROX_EX = {
  name:    'Activity 3 · Ex1 — Function Approximation',
  nInputs: 1,
  canvas:  { x1min:-3.6, x1max:3.6, refX:[-3,-2,-1,0,1,2,3],
             ydefMin:-12.0, ydefMax:12.0 },
  train: [
    {n: 1, x1:-3.0, d:-10.0},  {n: 2, x1:-2.5, d: -6.0},
    {n: 3, x1:-2.0, d: -3.6},  {n: 4, x1:-1.5, d: -2.1},
    {n: 5, x1:-1.0, d: -1.2},  {n: 6, x1:-0.5, d: -0.5},
    {n: 7, x1: 0.0, d:  0.0},  {n: 8, x1: 0.5, d:  0.52},
    {n: 9, x1: 1.0, d:  1.18}, {n:10, x1: 1.5, d:  2.0},
    {n:11, x1: 2.0, d:  3.6},  {n:12, x1: 2.5, d:  6.05},
    {n:13, x1: 3.0, d: 10.02},
  ],
};

function fa_r6(n) { return Math.round(n*1e6)/1e6; }
function fa_r4(n) { return Math.round(n*1e4)/1e4; }
function fa_fmt(n){ var r=fa_r6(n); return r.toFixed(6).replace(/\.?0+$/,'')||'0'; }
function fa_fmt4(n){var r=fa_r4(n); return r.toFixed(4).replace(/\.?0+$/,'')||'0'; }
function fa_fmtS(n){return n>=0?'+'+fa_fmt(n):fa_fmt(n);}
function fa_sig(x){return 1/(1+Math.exp(-x));}

function fa_rng(seed) {
  var s = seed>>>0;
  return function(){
    s=(s+0x6D2B79F5)>>>0;
    var t=Math.imul(s^(s>>>15),s|1);
    t^=t+Math.imul(t^(t>>>7),t|61);
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}

function fa_initWeights(nHidden, seed) {
  var rng=fa_rng(seed), rand=function(){return fa_r4((rng()*2-1)*0.5);};
  var V=[], thetaA=[], W=[];
  for(var j=0;j<nHidden;j++){
    V.push([rand()]); thetaA.push(rand()); W.push(rand());
  }
  return {V:V, thetaA:thetaA, W:W, thetaB:rand()};
}

function fa_copyWs(ws){
  return {V:ws.V.map(function(r){return r.slice();}), thetaA:ws.thetaA.slice(), W:ws.W.slice(), thetaB:ws.thetaB};
}

function fa_forward(x1, ws) {
  var p=ws.W.length, zStar=[], z=[];
  for(var j=0;j<p;j++){
    var zs=fa_r6(ws.thetaA[j]+ws.V[j][0]*x1);
    zStar.push(zs); z.push(fa_r6(fa_sig(zs)));
  }
  var y=ws.thetaB;
  for(var j=0;j<p;j++) y+=ws.W[j]*z[j];
  y=fa_r6(y);
  return {zStar:zStar, z:z, y:y};
}

function fa_backprop(x1, d, ws, alpha) {
  var fwd=fa_forward(x1,ws), y=fwd.y, z=fwd.z, p=ws.W.length;
  var newWs=fa_copyWs(ws);
  var dOut=fa_r6(d-y);
  var dW=[], dThetaB=fa_r6(alpha*dOut);
  for(var j=0;j<p;j++){
    var dw=fa_r6(alpha*dOut*z[j]);
    dW.push(dw); newWs.W[j]=fa_r6(ws.W[j]+dw);
  }
  newWs.thetaB=fa_r6(ws.thetaB+dThetaB);
  var deltaH=[], dV=[], dThetaA=[];
  for(var j=0;j<p;j++){
    var dh=fa_r6(dOut*ws.W[j]*z[j]*(1-z[j]));
    deltaH.push(dh);
    var dv=fa_r6(alpha*dh*x1); dV.push([dv]); newWs.V[j][0]=fa_r6(ws.V[j][0]+dv);
    var dta=fa_r6(alpha*dh); dThetaA.push(dta); newWs.thetaA[j]=fa_r6(ws.thetaA[j]+dta);
  }
  return {fwd:fwd, dOut:dOut, deltaH:deltaH, dW:dW, dThetaB:dThetaB, dV:dV, dThetaA:dThetaA, newWs:newWs};
}

function fa_mseTrain(ws) {
  var t=FUNC_APPROX_EX.train;
  var s=0; for(var i=0;i<t.length;i++) s+=Math.pow(fa_forward(t[i].x1,ws).y-t[i].d,2);
  return fa_r6(s/t.length);
}

function fa_buildSteps(nHidden, alpha, nIters, seed) {
  var train=FUNC_APPROX_EX.train;
  var ws=fa_initWeights(nHidden,seed), wsInit=fa_copyWs(ws), steps=[];
  for(var iter=1;iter<=nIters;iter++){
    for(var pi=0;pi<train.length;pi++){
      var p=train[pi], wsBefore=fa_copyWs(ws);
      var bp=fa_backprop(p.x1,p.d,ws,alpha);
      ws=bp.newWs;
      steps.push({
        iter:iter, pi:pi, p:p,
        wsBefore:wsBefore, wsAfter:fa_copyWs(ws),
        fwd:bp.fwd, dOut:bp.dOut, deltaH:bp.deltaH,
        dW:bp.dW, dThetaB:bp.dThetaB, dV:bp.dV, dThetaA:bp.dThetaA,
        msePat:fa_r6(0.5*Math.pow(p.d-bp.fwd.y,2)),
        mseTrain:fa_mseTrain(ws),
      });
    }
  }
  return {steps:steps, finalWs:ws, initWs:wsInit, nHidden:nHidden, alpha:alpha, nIters:nIters};
}

function fa_CanvasRenderer(canvasEl) {
  var self=this;
  self.cv=canvasEl; self.ctx=canvasEl.getContext('2d');
  self.CW=canvasEl.width; self.CH=canvasEl.height; self.PAD=52;
  var cfg=FUNC_APPROX_EX.canvas;

  self.isDk=function(){return window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches;};
  self.tx=function(v){return self.PAD+(v-cfg.x1min)/(cfg.x1max-cfg.x1min)*(self.CW-2*self.PAD);};
  self.ty=function(v){return self.CH-self.PAD-(v-cfg.ydefMin)/(cfg.ydefMax-cfg.ydefMin)*(self.CH-2*self.PAD);};

  self.draw=function(ws, curPi, showCurve) {
    var dk=self.isDk(), ctx=self.ctx, CW=self.CW, CH=self.CH, PAD=self.PAD;
    var tx=self.tx, ty=self.ty, cfg2=cfg;
    ctx.clearRect(0,0,CW,CH);
    ctx.fillStyle=dk?'#1a1a18':'#fafaf8'; ctx.fillRect(0,0,CW,CH);

    var gridC=dk?'rgba(200,200,190,0.07)':'rgba(0,0,0,0.055)';
    var axC  =dk?'rgba(200,200,190,0.22)':'rgba(0,0,0,0.18)';
    var txC  =dk?'#c2c0b6':'#444441', mutC=dk?'#888780':'#888780';

    ctx.strokeStyle=gridC; ctx.lineWidth=0.5;
    var ystep=(cfg2.ydefMax-cfg2.ydefMin)<=6?2:5;
    for(var v=Math.ceil(cfg2.ydefMin/ystep)*ystep;v<=cfg2.ydefMax+0.001;v+=ystep){
      ctx.beginPath(); ctx.moveTo(PAD,ty(v)); ctx.lineTo(CW-PAD,ty(v)); ctx.stroke();
    }
    for(var xg=Math.ceil(cfg2.x1min);xg<=cfg2.x1max;xg++){
      ctx.beginPath(); ctx.moveTo(tx(xg),PAD); ctx.lineTo(tx(xg),CH-PAD); ctx.stroke();
    }
    if(cfg2.ydefMin<0&&cfg2.ydefMax>0){
      ctx.lineWidth=0.7; ctx.setLineDash([3,3]);
      ctx.strokeStyle=dk?'rgba(200,200,190,0.25)':'rgba(0,0,0,0.2)';
      ctx.beginPath(); ctx.moveTo(PAD,ty(0)); ctx.lineTo(CW-PAD,ty(0)); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.strokeStyle=axC; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(PAD,PAD-5); ctx.lineTo(PAD,CH-PAD+5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(PAD-5,CH-PAD); ctx.lineTo(CW-PAD+5,CH-PAD); ctx.stroke();
    ctx.fillStyle=txC; ctx.font='11px sans-serif';
    ctx.textAlign='center'; ctx.fillText('x',CW-PAD+12,CH-PAD+3);
    ctx.textAlign='right';  ctx.fillText('d/y',PAD-5,PAD-12);
    ctx.font='9px sans-serif'; ctx.fillStyle=mutC;
    ctx.textAlign='center';
    for(var xg2=Math.ceil(cfg2.x1min);xg2<=cfg2.x1max;xg2+=1) if(xg2!==0) ctx.fillText(xg2,tx(xg2),CH-PAD+13);
    ctx.textAlign='right';
    for(var v2=Math.ceil(cfg2.ydefMin/ystep)*ystep;v2<=cfg2.ydefMax+0.001;v2+=ystep) ctx.fillText(v2,PAD-4,ty(v2)+3);

    if(showCurve && ws){
      ctx.beginPath(); ctx.strokeStyle=dk?'#93c5fd':'#185FA5'; ctx.lineWidth=2;
      var started=false;
      for(var k=0;k<=400;k++){
        var xv=cfg2.x1min+(k/400)*(cfg2.x1max-cfg2.x1min);
        var yv=fa_forward(xv,ws).y;
        if(yv<cfg2.ydefMin-0.5||yv>cfg2.ydefMax+0.5){started=false;continue;}
        if(!started){ctx.moveTo(tx(xv),ty(yv));started=true;}else ctx.lineTo(tx(xv),ty(yv));
      }
      ctx.stroke();
    }

    var train=FUNC_APPROX_EX.train;
    for(var i=0;i<train.length;i++){
      var p=train[i], ppx=tx(p.x1), ppy=ty(p.d), isCur=i===curPi;
      if(isCur){
        ctx.beginPath();ctx.arc(ppx,ppy,13,0,Math.PI*2);
        ctx.fillStyle=dk?'rgba(239,159,39,0.28)':'rgba(250,199,117,0.55)';ctx.fill();
        ctx.beginPath();ctx.arc(ppx,ppy,14,0,Math.PI*2);
        ctx.strokeStyle='#EF9F27';ctx.lineWidth=2;ctx.stroke();
      }
      ctx.beginPath();ctx.arc(ppx,ppy,5,0,Math.PI*2);
      ctx.fillStyle=dk?'rgba(29,158,117,0.9)':'rgba(29,158,117,0.88)';
      ctx.strokeStyle=dk?'#5DCAA5':'#0F6E56'; ctx.lineWidth=isCur?2.5:1.5;
      ctx.fill(); ctx.stroke();
      if(ws){
        var yhat=fa_forward(p.x1,ws).y;
        if(yhat>=cfg2.ydefMin-0.5&&yhat<=cfg2.ydefMax+0.5){
          ctx.beginPath();ctx.arc(tx(p.x1),ty(yhat),4,0,Math.PI*2);
          ctx.fillStyle=dk?'rgba(239,159,39,0.8)':'rgba(186,117,23,0.85)';
          ctx.strokeStyle=dk?'#EF9F27':'#BA7517'; ctx.lineWidth=1;
          ctx.fill(); ctx.stroke();
          ctx.beginPath();ctx.moveTo(ppx,ppy);ctx.lineTo(tx(p.x1),ty(yhat));
          ctx.strokeStyle=dk?'rgba(239,159,39,0.35)':'rgba(186,117,23,0.35)';
          ctx.lineWidth=1; ctx.setLineDash([2,2]); ctx.stroke(); ctx.setLineDash([]);
        }
      }
    }
  };
}
