var SAKS_ITEMS = [
  {id:1,w:63,v:13},{id:2,w:21,v:2},{id:3,w:2,v:20},{id:4,w:32,v:10},
  {id:5,w:13,v:7},{id:6,w:80,v:14},{id:7,w:19,v:7},{id:8,w:37,v:2},
  {id:9,w:56,v:2},{id:10,w:41,v:4},{id:11,w:14,v:16},{id:12,w:8,v:17},
  {id:13,w:32,v:17},{id:14,w:42,v:3},{id:15,w:7,v:21},
];
var SAKS_CAP = 275;
var SAKS_N = 15;

function saks_r4(n){ return Math.round(n*1e4)/1e4; }
function saks_solW(x){ return x.reduce(function(s,xi,i){return s+xi*SAKS_ITEMS[i].w;},0); }
function saks_solV(x){ return x.reduce(function(s,xi,i){return s+xi*SAKS_ITEMS[i].v;},0); }

function saks_neighbors(x, cap) {
  var nb=[];
  for(var i=0;i<SAKS_N;i++){
    var xn=x.slice(); xn[i]=1-xn[i];
    var w=saks_solW(xn), v=saks_solV(xn);
    if(w<=cap) nb.push({item:i,action:xn[i]===1?'ADD':'REM',x:xn,w:w,v:v});
  }
  return nb.sort(function(a,b){return b.v-a.v;});
}

function saks_rng(seed){
  var s=seed>>>0;
  return function(){
    s=(s+0x6D2B79F5)>>>0;
    var t=Math.imul(s^(s>>>15),s|1);
    t^=t+Math.imul(t^(t>>>7),t|61);
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}

function saks_run(alpha,L,T0,V,maxIter,capacity,seed){
  alpha=alpha||0.9; L=L||1; T0=T0||19; V=V||3; maxIter=maxIter||50;
  var cap=capacity||SAKS_CAP; seed=seed||42;
  var rng=saks_rng(seed);
  var S=Array(SAKS_N).fill(0), bestS=S.slice(), bestVal=0;
  var T=T0, steps=[], xTrack=S.slice();

  for(var iter=1;iter<=maxIter;iter++){
    var nsucess=0, iCount=0;
    var nb=saks_neighbors(S,cap);
    var valCurrent=saks_solV(S), itTries=[];
    var xBefore=S.slice();

    while(nsucess<L && iCount<V && iCount<nb.length){
      var m=nb[iCount]; iCount++;
      var deltaE=saks_r4(valCurrent-m.v);
      var P,r,accept;
      if(deltaE<=0){P=1.0;r=0.0;accept=true;}
      else{P=saks_r4(Math.exp(-deltaE/T));r=saks_r4(rng());accept=P>r;}
      itTries.push({try_n:iCount,item:m.item,action:m.action,
                    x_new:m.x.slice(),w_new:m.w,v_new:m.v,
                    delta_E:deltaE,P:P,r:r,accept:accept});
      if(accept){nsucess++;S=m.x.slice();if(saks_solV(S)>bestVal){bestS=S.slice();bestVal=saks_solV(S);}}
    }

    steps.push({iter:iter,T:T,x_before:xBefore,val_before:valCurrent,
                w_before:saks_solW(xBefore),tries:itTries,nsucess:nsucess,
                x_after:S.slice(),val_after:saks_solV(S),w_after:saks_solW(S),
                best_val:bestVal,best_x:bestS.slice()});
    T=saks_r4(alpha*T);
    if(nsucess===0) break;
  }

  return {
    config:{alpha:alpha,L:L,T0:T0,V:V,max_iter:maxIter,capacity:cap,n_items:SAKS_N},
    items:SAKS_ITEMS,capacity:cap,steps:steps,
    best_x:bestS,best_val:bestVal,best_w:saks_solW(bestS),
  };
}
