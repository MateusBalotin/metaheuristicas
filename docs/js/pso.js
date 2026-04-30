var PSO_INIT = [
  {id:1, x:5.0,  v:0.0},
  {id:2, x:6.0,  v:0.0},
  {id:3, x:8.5,  v:0.0},
  {id:4, x:11.0, v:0.0},
];
var PSO_X_MIN = -5.0;
var PSO_X_MAX = 12.0;

function pso_r6(n) { return Math.round(n * 1e6) / 1e6; }

function pso_f(x) {
  return pso_r6(Math.cos(x) + x / 5);
}

function pso_run(w, n1, n2, nIters, r1, r2) {
  w = w || 0.2; n1 = n1 || 0.3; n2 = n2 || 0.5;
  nIters = nIters || 10;
  r1 = (r1 !== undefined) ? r1 : 1.0;
  r2 = (r2 !== undefined) ? r2 : 1.0;

  var particles = PSO_INIT.map(function(p) {
    return {id:p.id, x:p.x, v:p.v,
            fit:pso_f(p.x), pbest:p.x, pbest_fit:pso_f(p.x)};
  });

  var gbest_p = particles.reduce(function(a,b){ return a.pbest_fit<=b.pbest_fit?a:b; });
  var gbest = gbest_p.pbest, gbest_fit = gbest_p.pbest_fit;

  var initState = particles.map(function(p){ return Object.assign({},p); });
  var steps = [];

  for (var iter = 1; iter <= nIters; iter++) {
    var pSteps = [];

    for (var pi = 0; pi < particles.length; pi++) {
      var p = particles[pi];
      var xOld = p.x, vOld = p.v, pb = p.pbest;

      var vNew = pso_r6(w*vOld + n1*r1*(pb-xOld) + n2*r2*(gbest-xOld));
      var xNew = pso_r6(xOld + vNew);
      var fitNew = pso_f(xNew);

      var newPbest = pb, newPbestFit = p.pbest_fit;
      if (fitNew < p.pbest_fit) { newPbest = xNew; newPbestFit = fitNew; }

      pSteps.push({
        id: p.id,
        x_before: xOld, v_before: vOld, pbest_before: pb, gbest: gbest,
        v_new: vNew, x_new: xNew, fit_new: fitNew,
        pbest_new: newPbest, pbest_fit_new: newPbestFit,
        pbest_updated: newPbest !== pb,
      });

      p.x = xNew; p.v = vNew; p.fit = fitNew;
      p.pbest = newPbest; p.pbest_fit = newPbestFit;
    }

    var gbestOld = gbest;
    particles.forEach(function(p) {
      if (p.pbest_fit < gbest_fit) { gbest = p.pbest; gbest_fit = p.pbest_fit; }
    });

    steps.push({
      iter: iter, particles: pSteps,
      gbest_before: gbestOld, gbest_after: gbest, gbest_fit: gbest_fit,
      gbest_updated: gbest !== gbestOld,
    });
  }

  var xCurve = [], yCurve = [];
  for (var i = 0; i <= 200; i++) {
    var x = pso_r6(PSO_X_MIN + i*(PSO_X_MAX-PSO_X_MIN)/200);
    xCurve.push(x); yCurve.push(pso_f(x));
  }

  return {
    config: {w:w, n1:n1, n2:n2, r1:r1, r2:r2, n_iters:nIters, n_particles:PSO_INIT.length},
    init_state: initState,
    steps: steps,
    final_gbest: gbest,
    final_gbest_fit: gbest_fit,
    x_curve: xCurve,
    y_curve: yCurve,
  };
}
