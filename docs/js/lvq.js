var LVQ_EX = {
  neurons: [
    {id:0,  cls:'C1', pos:[0.6,0.8]}, {id:1,  cls:'C1', pos:[0.2,0.6]},
    {id:2,  cls:'C1', pos:[0.6,0.4]}, {id:3,  cls:'C1', pos:[0.2,0.2]},
    {id:4,  cls:'C2', pos:[0.8,0.8]}, {id:5,  cls:'C2', pos:[0.4,0.6]},
    {id:6,  cls:'C2', pos:[0.8,0.4]}, {id:7,  cls:'C2', pos:[0.4,0.2]},
    {id:8,  cls:'C3', pos:[0.2,0.8]}, {id:9,  cls:'C3', pos:[0.6,0.6]},
    {id:10, cls:'C3', pos:[0.2,0.4]}, {id:11, cls:'C3', pos:[0.6,0.2]},
    {id:12, cls:'C4', pos:[0.4,0.8]}, {id:13, cls:'C4', pos:[0.8,0.6]},
    {id:14, cls:'C4', pos:[0.4,0.4]}, {id:15, cls:'C4', pos:[0.8,0.2]},
  ],
  train: [
    {x:[0.25,0.25], cls:'C1', section:'2.1/2.2'},
    {x:[0.40,0.35], cls:'C1', section:'2.3'},
    {x:[0.40,0.45], cls:'C1', section:'2.3'},
    {x:[0.60,0.65], cls:'C4', section:'2.3'},
    {x:[0.75,0.80], cls:'C4', section:'2.3'},
  ],
};

function lvq_r4(n) { return Math.round(n * 1e4) / 1e4; }

function lvq_euclid(ax, ay, bx, by) {
  return lvq_r4(Math.sqrt((ax-bx)*(ax-bx) + (ay-by)*(ay-by)));
}

function lvq_run(alpha) {
  var neurons  = LVQ_EX.neurons;
  var train    = LVQ_EX.train;
  var W        = neurons.map(function(n) { return n.pos.slice(); });
  var clss     = neurons.map(function(n) { return n.cls; });
  var initW    = W.map(function(w) { return w.slice(); });
  var steps    = [];

  for (var pi = 0; pi < train.length; pi++) {
    var t        = train[pi];
    var x        = t.x;
    var wBefore  = W.map(function(w) { return w.slice(); });

    var dists  = W.map(function(w) { return lvq_euclid(x[0], x[1], w[0], w[1]); });
    var winner = 0;
    for (var i = 1; i < W.length; i++) if (dists[i] < dists[winner]) winner = i;

    var wCls  = clss[winner];
    var match = wCls === t.cls;
    var wOld  = W[winner].slice();
    var dx, dy, rule;

    if (match) {
      dx = lvq_r4( alpha * (x[0] - W[winner][0]));
      dy = lvq_r4( alpha * (x[1] - W[winner][1]));
      rule = 'attract';
    } else {
      dx = lvq_r4(-alpha * (x[0] - W[winner][0]));
      dy = lvq_r4(-alpha * (x[1] - W[winner][1]));
      rule = 'repel';
    }

    W[winner][0] = lvq_r4(W[winner][0] + dx);
    W[winner][1] = lvq_r4(W[winner][1] + dy);

    steps.push({
      pi: pi, section: t.section, alpha: alpha,
      input: {x: x, cls: t.cls},
      dists: dists, winner: winner, winner_cls: wCls,
      winner_pos_old: wOld, match: match, rule: rule,
      delta: [dx, dy], winner_pos_new: W[winner].slice(),
      weights_before: wBefore,
      weights_after:  W.map(function(w) { return w.slice(); }),
    });
  }

  return {
    config: {alpha: alpha, n_neurons: W.length, n_train: train.length},
    classes: ['C1','C2','C3','C4'],
    neuron_classes: clss,
    init_weights: initW, steps: steps,
    final_weights: W.map(function(w) { return w.slice(); }),
  };
}
