var PSOKS_ITEMS = [
  {id:1,w:63,v:13},{id:2,w:21,v:2},{id:3,w:2,v:20},{id:4,w:32,v:10},
  {id:5,w:13,v:7},{id:6,w:80,v:14},{id:7,w:19,v:7},{id:8,w:37,v:2},
  {id:9,w:56,v:2},{id:10,w:41,v:4},{id:11,w:14,v:16},{id:12,w:8,v:17},
  {id:13,w:32,v:17},{id:14,w:42,v:3},{id:15,w:7,v:21},
];
var PSOKS_CAP = 275;
var PSOKS_SEEDS = [14, 0, 18];
var PSOKS_N = 15;

function psoks_solW(x) { return x.reduce(function(s,xi,i){ return s+xi*PSOKS_ITEMS[i].w; },0); }
function psoks_solV(x) { return x.reduce(function(s,xi,i){ return s+xi*PSOKS_ITEMS[i].v; },0); }

function psoks_subtraction(xTarget, xCurrent) {
  var adds    = [], removes = [];
  for (var i=0;i<PSOKS_N;i++) {
    if (xCurrent[i]===0 && xTarget[i]===1) adds.push(i);
    if (xCurrent[i]===1 && xTarget[i]===0) removes.push(i);
  }
  var k = Math.min(adds.length, removes.length);
  var result = [];
  for (var i=0;i<k;i++) result.push([adds[i], removes[i]]);
  return result;
}

function psoks_scalarMul(c, v) {
  if (c<=0 || !v.length) return [];
  return v.slice(0, Math.floor(c * v.length));
}

function psoks_applyVelocity(x, v) {
  var r = x.slice();
  v.forEach(function(tr){ var t=r[tr[0]]; r[tr[0]]=r[tr[1]]; r[tr[1]]=t; });
  return r;
}

function psoks_repair(x, cap) {
  var r = x.slice();
  while (psoks_solW(r) > cap) {
    var best = -1, bestRatio = Infinity;
    for (var i=0;i<PSOKS_N;i++) {
      if (r[i]===1) {
        var ratio = PSOKS_ITEMS[i].v / PSOKS_ITEMS[i].w;
        if (ratio < bestRatio) { bestRatio=ratio; best=i; }
      }
    }
    if (best===-1) break;
    r[best] = 0;
  }
  return r;
}

function psoks_rngShuffle(arr, seed) {
  var s = seed >>> 0;
  function next() {
    s = (s + 0x6D2B79F5) >>> 0;
    var t = Math.imul(s ^ (s>>>15), s|1);
    t ^= t + Math.imul(t^(t>>>7), t|61);
    return ((t^(t>>>14))>>>0) / 4294967296;
  }
  for (var i=arr.length-1;i>0;i--) {
    var j=Math.floor(next()*(i+1));
    var tmp=arr[i]; arr[i]=arr[j]; arr[j]=tmp;
  }
  return arr;
}

function psoks_randomFeasible(seed, cap) {
  var idx = [];
  for (var i=0;i<PSOKS_N;i++) idx.push(i);
  psoks_rngShuffle(idx, seed);
  var x=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], w=0;
  for (var k=0;k<idx.length;k++) {
    var i=idx[k];
    if (w+PSOKS_ITEMS[i].w<=cap) { x[i]=1; w+=PSOKS_ITEMS[i].w; }
  }
  return x;
}

function psoks_run(w, n1, n2, nIters, capacity) {
  w=w||0.2; n1=n1||0.3; n2=n2||0.5; nIters=nIters||10;
  var cap=capacity||PSOKS_CAP;

  var initState = PSOKS_SEEDS.map(function(seed,idx) {
    var x=psoks_randomFeasible(seed,cap);
    return {id:idx+1,x:x.slice(),v:[],w:psoks_solW(x),val:psoks_solV(x)};
  });

  var particles = initState.map(function(p) {
    return {id:p.id,x:p.x.slice(),v:[],w:p.w,val:p.val,
            pbest:p.x.slice(),pbest_val:p.val};
  });

  var gbest_p = particles.reduce(function(a,b){ return a.pbest_val>=b.pbest_val?a:b; });
  var gbest = gbest_p.pbest.slice(), gbest_val = gbest_p.pbest_val;
  var steps = [];

  for (var iter=1;iter<=nIters;iter++) {
    var pSteps=[];
    for (var pi=0;pi<particles.length;pi++) {
      var p=particles[pi];
      var vPb=psoks_subtraction(p.pbest,p.x);
      var vGb=psoks_subtraction(gbest,p.x);
      var vNew=psoks_scalarMul(w,p.v).concat(psoks_scalarMul(n1,vPb)).concat(psoks_scalarMul(n2,vGb));
      var xNew=psoks_repair(psoks_applyVelocity(p.x,vNew),cap);
      var valNew=psoks_solV(xNew), wNew=psoks_solW(xNew);
      var newPbest=p.pbest.slice(), newPbestVal=p.pbest_val;
      if (valNew>p.pbest_val){ newPbest=xNew.slice(); newPbestVal=valNew; }
      pSteps.push({
        id:p.id, x_before:p.x.slice(), v_before:p.v.slice(),
        pbest_before:p.pbest.slice(), gbest:gbest.slice(),
        v_pb:vPb, v_gb:vGb, v_new:vNew,
        x_new:xNew.slice(), w_new:wNew, val_new:valNew,
        pbest_new:newPbest, pbest_val_new:newPbestVal,
        pbest_updated:newPbestVal>p.pbest_val,
      });
      p.x=xNew; p.v=vNew; p.w=wNew; p.val=valNew;
      p.pbest=newPbest; p.pbest_val=newPbestVal;
    }
    var gbestOld=gbest.slice(), gbestValOld=gbest_val;
    particles.forEach(function(p){ if(p.pbest_val>gbest_val){gbest=p.pbest.slice();gbest_val=p.pbest_val;} });
    steps.push({
      iter:iter, particles:pSteps,
      gbest_before:gbestOld, gbest_after:gbest.slice(), gbest_val:gbest_val,
      gbest_updated:gbest_val>gbestValOld,
    });
  }

  return {
    config:{w:w,n1:n1,n2:n2,n_iters:nIters,capacity:cap,n_particles:PSOKS_SEEDS.length},
    items:PSOKS_ITEMS, capacity:cap, init_state:initState,
    steps:steps, final_gbest:gbest, final_gbest_val:gbest_val,
    final_gbest_w:psoks_solW(gbest),
  };
}
