var RBF_TS_EX = {
  y_series: [1.0, 0.9, 0.75, 0.6, 0.55, 0.6, 0.4, 0.3, 0.2, 0.05],
  centers:  [[1.0, 0.9], [0.6, 0.4]],
  sigma: 1.0, theta: 1.0,
};

function rbfts_r6(n) { return Math.round(n * 1e6) / 1e6; }

function rbfts_phi(x, u, sigma) {
  var sq = (x[0]-u[0])*(x[0]-u[0]) + (x[1]-u[1])*(x[1]-u[1]);
  return rbfts_r6(Math.exp(-sq / (2 * sigma * sigma)));
}

function rbfts_matT(A) {
  return A[0].map(function(_, j) { return A.map(function(row) { return row[j]; }); });
}

function rbfts_matMul(A, B) {
  return A.map(function(row) {
    return B[0].map(function(_, j) {
      return rbfts_r6(row.reduce(function(s, v, k) { return s + v * B[k][j]; }, 0));
    });
  });
}

function rbfts_solve(A, b) {
  var n = A.length;
  var M = A.map(function(row, i) { return row.slice().concat([b[i]]); });
  for (var col = 0; col < n; col++) {
    var pivot = col;
    for (var r = col + 1; r < n; r++)
      if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    var tmp = M[col]; M[col] = M[pivot]; M[pivot] = tmp;
    var piv = M[col][col];
    for (var row = 0; row < n; row++) {
      if (row === col) continue;
      var f = M[row][col] / piv;
      M[row] = M[row].map(function(v, k) { return v - f * M[col][k]; });
    }
    M[col] = M[col].map(function(v) { return v / piv; });
  }
  return M.map(function(row) { return rbfts_r6(row[n]); });
}

function rbfts_run() {
  var Y = RBF_TS_EX.y_series, centers = RBF_TS_EX.centers;
  var sigma = RBF_TS_EX.sigma, theta = RBF_TS_EX.theta;
  var k = 2, nc = centers.length;

  var patterns = [];
  for (var t = 0; t < Y.length - k; t++)
    patterns.push({t: t+1, x: [Y[t], Y[t+1]], d: Y[t+k]});

  var G_rows = [], steps = [];
  for (var pi = 0; pi < patterns.length; pi++) {
    var p    = patterns[pi], x = p.x;
    var gBefore = G_rows.slice();
    var sqDists = centers.map(function(u) {
      return rbfts_r6((x[0]-u[0])*(x[0]-u[0]) + (x[1]-u[1])*(x[1]-u[1]));
    });
    var phis   = centers.map(function(u) { return rbfts_phi(x, u, sigma); });
    var newRow = phis.concat([theta]);
    G_rows.push(newRow);
    steps.push({
      pi: pi, t: p.t, x: x, d: p.d,
      sq_dists: sqDists, phis: phis, new_row: newRow,
      G_so_far: G_rows.map(function(r) { return r.slice(); }),
      G_before: gBefore.map(function(r) { return r.slice(); }),
    });
  }

  var Gt  = rbfts_matT(G_rows);
  var GtG = rbfts_matMul(Gt, G_rows);
  var dVec = patterns.map(function(p) { return p.d; });
  var Gtd  = Gt.map(function(row) {
    return rbfts_r6(row.reduce(function(s, v, j) { return s + v * dVec[j]; }, 0));
  });
  var w = rbfts_solve(GtG, Gtd);

  var predictions = patterns.map(function(p) {
    var x    = p.x;
    var yhat = rbfts_r6(centers.reduce(function(s, u, j) {
      return s + w[j] * rbfts_phi(x, u, sigma);
    }, 0) + w[nc] * theta);
    var err  = rbfts_r6(p.d - yhat);
    return {t: p.t, x: x, d: p.d, y_hat: yhat, error: err, sq_err: rbfts_r6(err*err)};
  });

  var mse = rbfts_r6(predictions.reduce(function(s, pr) { return s + pr.sq_err; }, 0) / predictions.length);

  return {
    config: {sigma: sigma, theta: theta, k: k, n_centers: nc, n_patterns: patterns.length},
    y_series: Y, centers: centers, patterns: patterns, steps: steps,
    GtG: GtG, Gtd: Gtd, weights: w, predictions: predictions, mse: mse,
  };
}
