var SA_CITIES = {
  A:[1.4,6.2], B:[5.1,6.2], C:[6.2,9.8], D:[7.4,6.1], E:[8.1,4.1],
  F:[11.2,6.2], G:[9.3,0.6], H:[6.2,2.7], I:[3.3,0.6], J:[4.4,4.1],
};
var SA_NAMES     = ['A','B','C','D','E','F','G','H','I','J'];
var SA_INIT_TOUR = ['A','I','G','J','C','D','H','E','B','F'];

// Distance matrix from exercise (authoritative values)
var SA_C = {
  A:{A:0.00,B:3.70,C:6.00,D:6.00,E:7.02,F:9.80,G:9.68,H:5.94,I:5.91,J:3.66},
  B:{A:3.70,B:0.00,C:3.76,D:2.30,E:3.66,F:6.10,G:7.00,H:3.67,I:5.88,J:2.21},
  C:{A:6.00,B:3.76,C:0.00,D:3.79,E:6.01,F:6.16,G:9.71,H:7.10,I:9.65,J:5.98},
  D:{A:6.00,B:2.30,C:3.79,D:0.00,E:2.21,F:3.80,G:5.91,H:3.70,I:6.94,J:3.66},
  E:{A:7.02,B:3.66,C:6.01,D:2.21,E:0.00,F:3.74,G:3.70,H:2.36,I:5.94,J:3.70},
  F:{A:9.80,B:6.10,C:6.16,D:3.80,E:3.74,F:0.00,G:5.91,H:6.10,I:9.68,J:7.12},
  G:{A:9.68,B:7.00,C:9.71,D:5.91,E:3.70,F:5.91,G:0.00,H:3.74,I:6.00,J:6.02},
  H:{A:5.94,B:3.67,C:7.10,D:3.70,E:2.36,F:6.10,G:3.74,H:0.00,I:3.58,J:2.28},
  I:{A:5.91,B:5.88,C:9.65,D:6.94,E:5.94,F:9.68,G:6.00,H:3.58,I:0.00,J:3.67},
  J:{A:3.66,B:2.21,C:5.98,D:3.66,E:3.70,F:7.12,G:6.02,H:2.28,I:3.67,J:0.00},
};

function sa_r4(n){ return Math.round(n*1e4)/1e4; }

function sa_tc(tour){
  var n=tour.length, s=0;
  for(var i=0;i<n;i++) s+=SA_C[tour[i]][tour[(i+1)%n]];
  return sa_r4(s);
}

function sa_twoOpt(tour,i,j){
  return tour.slice(0,i).concat(tour.slice(i,j+1).reverse()).concat(tour.slice(j+1));
}

function sa_allNeighbors(tour){
  var n=tour.length, nb=[];
  for(var i=0;i<n-1;i++)
    for(var j=i+1;j<n;j++){
      var nt=sa_twoOpt(tour,i,j);
      nb.push({i:i,j:j,tour:nt,cost:sa_tc(nt),cities:[tour[i],tour[j]]});
    }
  return nb;
}

function sa_rng(seed){
  var s=seed>>>0;
  return function(){
    s=(s+0x6D2B79F5)>>>0;
    var t=Math.imul(s^(s>>>15),s|1);
    t^=t+Math.imul(t^(t>>>7),t|61);
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}

function sa_run(alpha,L,T0,V,maxIter,seed){
  alpha=alpha||0.9; L=L||1; T0=T0||10; V=V||2; maxIter=maxIter||50; seed=seed||42;
  var rng=sa_rng(seed);
  var S=SA_INIT_TOUR.slice();
  var bestS=S.slice(), bestCost=sa_tc(S);
  var T=T0, steps=[], sTrack=S.slice();

  for(var iter=1;iter<=maxIter;iter++){
    var nsucess=0, iCount=0;
    var nb=sa_allNeighbors(S);
    var itSteps=[], sBefore=S.slice(), costBefore=sa_tc(S);

    while(nsucess<L && iCount<V && iCount<nb.length){
      var m=nb[iCount]; iCount++;
      var deltaE=sa_r4(m.cost-costBefore);
      var P,r,accept;
      if(deltaE<=0){ P=1.0; r=0.0; accept=true; }
      else{ P=sa_r4(Math.exp(-deltaE/T)); r=sa_r4(rng()); accept=P>r; }
      itSteps.push({try_n:iCount,move_i:m.i,move_j:m.j,cities:m.cities.slice(),
                    tour:m.tour.slice(),cost:m.cost,delta_E:deltaE,P:P,r:r,accept:accept});
      if(accept){ nsucess++; S=m.tour.slice(); if(sa_tc(S)<bestCost){bestS=S.slice();bestCost=sa_tc(S);} }
    }

    steps.push({iter:iter,T:T,S_before:sBefore,cost_before:costBefore,
                tries:itSteps,nsucess:nsucess,
                S_after:S.slice(),cost_after:sa_tc(S),
                best_cost:bestCost,best_tour:bestS.slice()});
    T=sa_r4(alpha*T);
    if(nsucess===0) break;
  }

  var matrixList=SA_NAMES.map(function(a){return SA_NAMES.map(function(b){return SA_C[a][b];});});
  return {
    config:{alpha:alpha,L:L,T0:T0,V:V,max_iter:maxIter,n_cities:SA_NAMES.length},
    cities:SA_CITIES, names:SA_NAMES,
    init_tour:SA_INIT_TOUR.slice(), init_cost:sa_tc(SA_INIT_TOUR),
    matrix:matrixList, steps:steps, best_tour:bestS, best_cost:bestCost,
  };
}
