var MOMENTUM_EX = {
  name:      'Activity 3 · Ex2 — MLP with Momentum',
  alpha:     1.0,
  gamma:     0.6,
  nIters:    3,
  nHidden:   3,
  threshold: 0.5,
  canvas: { x1min:-0.4, x1max:3.4, x2min:-0.4, x2max:3.9,
            refX:[0,1,2,3], ydefMin:-0.4, ydefMax:3.9 },
  train: [
    {n:1, x1:0, x2:2, d:1, label:'A\u2081', cls:'A'},
    {n:2, x1:1, x2:2, d:1, label:'A\u2082', cls:'A'},
    {n:3, x1:1, x2:3, d:1, label:'A\u2083', cls:'A'},
    {n:4, x1:1, x2:0, d:0, label:'B\u2081', cls:'B'},
    {n:5, x1:2, x2:1, d:0, label:'B\u2082', cls:'B'},
  ],
  initWeights: {
    V:      [[-0.9, 0.9], [0.9, -0.9], [-0.9, 0.9]],
    thetaA: [ 0.9,  0.9,  -0.9],
    W:      [ 0.9, -0.9,   0.9],
    thetaB: -0.9,
  },
};

function mr6(n) { return Math.round(n * 1e6) / 1e6; }
function mr4(n) { return Math.round(n * 1e4) / 1e4; }
function mfmt(n) { var r=mr6(n); return r.toFixed(6).replace(/\.?0+$/,'')||'0'; }
function mfmt4(n){ var r=mr4(n); return r.toFixed(4).replace(/\.?0+$/,'')||'0'; }
function mfmtS(n){ return n>=0?'+'+mfmt(n):mfmt(n); }

function mSig(x) { return 1/(1+Math.exp(-x)); }

function mCopyWs(ws) {
  return {
    V:      ws.V.map(function(r){return r.slice();}),
    thetaA: ws.thetaA.slice(),
    W:      ws.W.slice(),
    thetaB: ws.thetaB,
  };
}

function mZeroWs(ws) {
  return {
    V:      ws.V.map(function(r){return r.map(function(){return 0;});}),
    thetaA: ws.thetaA.map(function(){return 0;}),
    W:      ws.W.map(function(){return 0;}),
    thetaB: 0,
  };
}

function mForward(x, ws) {
  var p=ws.W.length, zStar=[], z=[];
  for(var j=0;j<p;j++){
    var zs=ws.thetaA[j];
    for(var i=0;i<x.length;i++) zs+=ws.V[j][i]*x[i];
    zs=mr6(zs); zStar.push(zs); z.push(mr6(mSig(zs)));
  }
  var yStar=ws.thetaB;
  for(var j=0;j<p;j++) yStar+=ws.W[j]*z[j];
  yStar=mr6(yStar);
  return {zStar:zStar, z:z, yStar:yStar, y:mr6(mSig(yStar))};
}

function mBackprop(x, d, ws, prevDws, alpha, gamma) {
  var fwd=mForward(x,ws), y=fwd.y, z=fwd.z, p=ws.W.length;
  var newWs=mCopyWs(ws);

  var dOut=mr6(y*(1-y)*(d-y));

  var dW=[], dThetaB=mr6(alpha*dOut + gamma*prevDws.thetaB);
  for(var j=0;j<p;j++){
    var dw=mr6(alpha*dOut*z[j] + gamma*prevDws.W[j]);
    dW.push(dw); newWs.W[j]=mr6(ws.W[j]+dw);
  }
  newWs.thetaB=mr6(ws.thetaB+dThetaB);

  var deltaH=[], dV=[], dThetaA=[];
  for(var j=0;j<p;j++){
    var dh=mr6(dOut*ws.W[j]*z[j]*(1-z[j]));
    deltaH.push(dh);
    var dvRow=[];
    for(var i=0;i<x.length;i++){
      var dv=mr6(alpha*dh*x[i] + gamma*prevDws.V[j][i]);
      dvRow.push(dv); newWs.V[j][i]=mr6(ws.V[j][i]+dv);
    }
    dV.push(dvRow);
    var dta=mr6(alpha*dh + gamma*prevDws.thetaA[j]);
    dThetaA.push(dta); newWs.thetaA[j]=mr6(ws.thetaA[j]+dta);
  }

  var newDws={V:dV, thetaA:dThetaA, W:dW, thetaB:dThetaB};
  return {fwd:fwd, dOut:dOut, deltaH:deltaH,
          dW:dW, dThetaB:dThetaB, dV:dV, dThetaA:dThetaA,
          newWs:newWs, newDws:newDws};
}

function mEvalAll(dataset, ws) {
  var thr=MOMENTUM_EX.threshold;
  return dataset.map(function(p){
    var fwd=mForward([p.x1,p.x2],ws);
    var yClass=fwd.y>=thr?1:0;
    return {y:fwd.y, yStar:fwd.yStar, yClass:yClass, ok:yClass===p.d};
  });
}

function mScore(results) {
  var ok=results.filter(function(r){return r.ok;}).length;
  return {correct:ok, errors:results.length-ok, total:results.length,
          pct:Math.round(ok/results.length*100)};
}

function mBuildSteps(gamma) {
  var train=MOMENTUM_EX.train, nIters=MOMENTUM_EX.nIters, alpha=MOMENTUM_EX.alpha;
  var ws=mCopyWs(MOMENTUM_EX.initWeights);
  var prevDws=mZeroWs(ws);
  var steps=[];

  for(var iter=1;iter<=nIters;iter++){
    for(var pi=0;pi<train.length;pi++){
      var p=train[pi], x=[p.x1,p.x2];
      var wsBefore=mCopyWs(ws), pdBefore=mCopyWs(prevDws);
      var bp=mBackprop(x,p.d,ws,prevDws,alpha,gamma);
      ws=bp.newWs; prevDws=bp.newDws;
      var allRes=mEvalAll(train,ws);
      steps.push({
        iter:iter, pi:pi, p:p,
        wsBefore:wsBefore, wsAfter:mCopyWs(ws),
        prevDws:pdBefore,
        fwd:bp.fwd, dOut:bp.dOut, deltaH:bp.deltaH,
        dW:bp.dW, dThetaB:bp.dThetaB, dV:bp.dV, dThetaA:bp.dThetaA,
        mse:mr6(0.5*Math.pow(p.d-bp.fwd.y,2)),
        trainResults:allRes, trainScore:mScore(allRes),
      });
    }
  }
  return {steps:steps, finalWs:ws, gamma:gamma};
}

function mCanvasRenderer(canvasEl) {
  var self=this;
  self.cv=canvasEl; self.ctx=canvasEl.getContext('2d');
  self.CW=canvasEl.width; self.CH=canvasEl.height; self.PAD=46;
  var cfg=MOMENTUM_EX.canvas;

  self.isDk=function(){return window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches;};
  self.tx=function(v){return self.PAD+(v-cfg.x1min)/(cfg.x1max-cfg.x1min)*(self.CW-2*self.PAD);};
  self.ty=function(v){return self.CH-self.PAD-(v-cfg.x2min)/(cfg.x2max-cfg.x2min)*(self.CH-2*self.PAD);};

  self.draw=function(ws, curPi, showRegion, trainResults) {
    var dk=self.isDk(), ctx=self.ctx, CW=self.CW, CH=self.CH, PAD=self.PAD;
    var tx=self.tx, ty=self.ty;
    ctx.clearRect(0,0,CW,CH);
    ctx.fillStyle=dk?'#1a1a18':'#fafaf8'; ctx.fillRect(0,0,CW,CH);

    if(showRegion && ws){
      var imgW=CW-2*PAD, imgH=CH-2*PAD;
      var imgData=ctx.createImageData(imgW,imgH);
      var posR=dk?[29,158,117]:[29,200,140], negR=dk?[216,90,48]:[220,80,40];
      var thr=MOMENTUM_EX.threshold;
      for(var px=0;px<imgW;px++){
        var x1v=cfg.x1min+(px/imgW)*(cfg.x1max-cfg.x1min);
        for(var py2=0;py2<imgH;py2++){
          var x2v=cfg.x2max-(py2/imgH)*(cfg.x2max-cfg.x2min);
          var fv=mForward([x1v,x2v],ws);
          var conf=Math.abs(fv.y-thr)*2, al=Math.round(25+conf*(dk?95:75));
          var col=fv.y>=thr?posR:negR, idx=(py2*imgW+px)*4;
          imgData.data[idx]=col[0]; imgData.data[idx+1]=col[1];
          imgData.data[idx+2]=col[2]; imgData.data[idx+3]=al;
        }
      }
      ctx.putImageData(imgData,PAD,PAD);
    }

    var gridC=dk?'rgba(200,200,190,0.07)':'rgba(0,0,0,0.055)';
    var axC=dk?'rgba(200,200,190,0.22)':'rgba(0,0,0,0.18)';
    var txC=dk?'#c2c0b6':'#444441', mutC=dk?'#888780':'#888780';
    ctx.strokeStyle=gridC; ctx.lineWidth=0.5;
    for(var v=0;v<=4;v++){
      ctx.beginPath(); ctx.moveTo(PAD,ty(v)); ctx.lineTo(CW-PAD,ty(v)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tx(v),PAD); ctx.lineTo(tx(v),CH-PAD); ctx.stroke();
    }
    ctx.strokeStyle=dk?'rgba(200,200,190,0.22)':'rgba(0,0,0,0.18)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(PAD,PAD-5); ctx.lineTo(PAD,CH-PAD+5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(PAD-5,CH-PAD); ctx.lineTo(CW-PAD+5,CH-PAD); ctx.stroke();
    ctx.fillStyle=txC; ctx.font='11px sans-serif';
    ctx.textAlign='center'; ctx.fillText('x\u2081',CW-PAD+16,CH-PAD+3);
    ctx.textAlign='right';  ctx.fillText('x\u2082',PAD-5,PAD-12);
    ctx.font='9px sans-serif'; ctx.fillStyle=mutC; ctx.textAlign='center';
    for(var xg=0;xg<=3;xg++) ctx.fillText(xg,tx(xg),CH-PAD+13);
    ctx.textAlign='right';
    for(var yg=0;yg<=3;yg++) ctx.fillText(yg,PAD-4,ty(yg)+3);

    var train=MOMENTUM_EX.train;
    for(var i=0;i<train.length;i++){
      var p=train[i], ppx=tx(p.x1), ppy=ty(p.x2);
      var isA=p.d===1, isCur=i===curPi;
      var ptok=trainResults?trainResults[i].ok:false;
      if(ptok){ctx.beginPath();ctx.arc(ppx,ppy,16,0,Math.PI*2);ctx.fillStyle=dk?'rgba(239,159,39,0.28)':'rgba(250,199,117,0.55)';ctx.fill();}
      if(isCur){ctx.beginPath();ctx.arc(ppx,ppy,17,0,Math.PI*2);ctx.strokeStyle='#EF9F27';ctx.lineWidth=2;ctx.stroke();}
      var fillC=isA?(dk?'rgba(29,158,117,0.9)':'rgba(29,158,117,0.88)'):(dk?'rgba(216,90,48,0.9)':'rgba(216,90,48,0.88)');
      var strokeC=isCur?'#EF9F27':(isA?(dk?'#5DCAA5':'#0F6E56'):(dk?'#F0997B':'#993C1D'));
      ctx.beginPath(); ctx.arc(ppx,ppy,9,0,Math.PI*2);
      ctx.fillStyle=fillC; ctx.fill(); ctx.strokeStyle=strokeC; ctx.lineWidth=isCur?2.5:1.5; ctx.stroke();
      ctx.fillStyle='#fff'; ctx.font='bold 8px sans-serif'; ctx.textAlign='center';
      ctx.fillText(p.label||String(p.n),ppx,ppy+3);
    }
  };
}
