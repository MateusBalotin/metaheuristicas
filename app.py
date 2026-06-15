from flask import Flask, render_template, jsonify, request
import threading, webbrowser

from algorithms import perceptron      as perceptron_algo
from algorithms import adaline         as adaline_algo
from algorithms import mlp             as mlp_algo
from algorithms import mlp_momentum   as mlp_momentum_algo
from algorithms import func_approx    as func_approx_algo
from algorithms import rbf            as rbf_algo
from algorithms import hebb           as hebb_algo
from algorithms import som            as som_algo
from algorithms import som_tsp        as som_tsp_algo
from algorithms import lvq            as lvq_algo
from algorithms import rbf_temporal   as rbf_temporal_algo
from algorithms import rbf_temporal_t as rbf_temporal_t_algo
from algorithms import elman_jordan   as elman_jordan_algo
from algorithms import tabu_search     as tabu_search_algo
from algorithms import tabu_knapsack   as tabu_knapsack_algo
from algorithms import pso             as pso_algo
from algorithms import pso_knapsack    as pso_knapsack_algo
from algorithms import simulated_annealing as sa_algo
from algorithms import sa_knapsack        as sa_ks_algo
from algorithms import aco                 as aco_algo
from algorithms import genetic_function     as gf_algo
from algorithms import genetic_tsp          as gt_algo
from algorithms import de_function           as de_algo
from algorithms import de_function_max       as dem_algo

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/perceptron/<ex>")
def page_perceptron(ex: str):
    if ex not in ("ex4", "ex5"):
        return "Exercise not found", 404
    return render_template("perceptron.html", ex=ex)

@app.route("/adaline")
def page_adaline():
    return render_template("adaline.html")

@app.route("/mlp")
def page_mlp():
    return render_template("mlp.html")

@app.route("/mlp-momentum")
def page_mlp_momentum():
    return render_template("mlp_momentum.html")

@app.route("/func-approx")
def page_func_approx():
    return render_template("func_approx.html")

@app.route("/rbf")
def page_rbf():
    return render_template("rbf.html")

@app.route("/rbf-cls")
def page_rbf_cls():
    return render_template("rbf_cls.html")

@app.route("/hebb")
def page_hebb():
    return render_template("hebb.html")

@app.route("/som")
def page_som():
    return render_template("som.html")

@app.route("/som-tsp")
def page_som_tsp():
    return render_template("som_tsp.html")

@app.route("/lvq")
def page_lvq():
    return render_template("lvq.html")

@app.route("/rbf-temporal")
def page_rbf_temporal():
    return render_template("rbf_temporal.html")

@app.route("/rbf-temporal-t")
def page_rbf_temporal_t():
    return render_template("rbf_temporal_t.html")

@app.route("/elman-jordan")
def page_elman_jordan():
    return render_template("elman_jordan.html")

@app.route("/ativ82")
def page_ativ82():
    return render_template("ativ82.html")

@app.route("/api/perceptron/<ex>")
def api_perceptron(ex: str):
    configs = {
        "ex4": {"dataset_key": "perceptron_ex4", "delta": 0.2, "alpha": 1.0, "n_iters": 3},
        "ex5": {"dataset_key": "ex22",           "delta": 0.2, "alpha": 1.0, "n_iters": 3},
    }
    if ex not in configs:
        return jsonify({"error": "not found"}), 404
    return jsonify(perceptron_algo.run(**configs[ex]))

@app.route("/api/adaline")
def api_adaline():
    alpha   = float(request.args.get("alpha",   0.01))
    n_iters = int(  request.args.get("n_iters", 3))
    return jsonify(adaline_algo.run(dataset_key="ex22", alpha=alpha, n_iters=n_iters))

@app.route("/api/mlp")
def api_mlp():
    n_hidden = int(  request.args.get("n_hidden", 4))
    alpha    = float(request.args.get("alpha",    0.5))
    n_iters  = int(  request.args.get("n_iters",  50))
    seed     = int(  request.args.get("seed",     42))
    return jsonify(mlp_algo.run(dataset_key="ex22", n_hidden=n_hidden,
                                alpha=alpha, n_iters=n_iters, seed=seed))

@app.route("/api/mlp-momentum")
def api_mlp_momentum():
    gamma = float(request.args.get("gamma", 0.6))
    return jsonify(mlp_momentum_algo.run(gamma=gamma))

@app.route("/api/func-approx")
def api_func_approx():
    n_hidden = int(  request.args.get("n_hidden", 6))
    alpha    = float(request.args.get("alpha",    0.1))
    n_iters  = int(  request.args.get("n_iters",  500))
    seed     = int(  request.args.get("seed",     42))
    return jsonify(func_approx_algo.run(n_hidden=n_hidden, alpha=alpha,
                                        n_iters=n_iters, seed=seed))

@app.route("/api/rbf")
def api_rbf():
    q     = int(  request.args.get("q",     4))
    sigma = float(request.args.get("sigma", 1.5))
    seed  = int(  request.args.get("seed",  42))
    return jsonify(rbf_algo.run(q=q, sigma=sigma, seed=seed))

@app.route("/api/rbf-cls")
def api_rbf_cls():
    sigma = float(request.args.get("sigma", 5.0))
    return jsonify(rbf_algo.run_classification(sigma=sigma))

@app.route("/api/hebb")
def api_hebb():
    alpha   = float(request.args.get("alpha",   1.0))
    n_iters = int(  request.args.get("n_iters", 1))
    return jsonify(hebb_algo.run(alpha=alpha, n_iters=n_iters))

@app.route("/api/som")
def api_som():
    alpha   = float(request.args.get("alpha",   0.5))
    n_iters = int(  request.args.get("n_iters", 3))
    return jsonify(som_algo.run(alpha_init=alpha, n_iters=n_iters))

@app.route("/api/som-tsp")
def api_som_tsp():
    alpha     = float(request.args.get("alpha",     0.5))
    n_iters   = int(  request.args.get("n_iters",   3))
    n_neurons = int(  request.args.get("n_neurons", 20))
    radius0   = int(  request.args.get("radius0",   3))
    return jsonify(som_tsp_algo.run(alpha=alpha, n_iters=n_iters,
                                    n_neurons=n_neurons, radius0=radius0))

@app.route("/api/lvq")
def api_lvq():
    alpha = float(request.args.get("alpha", 0.5))
    return jsonify(lvq_algo.run(alpha=alpha))

@app.route("/api/rbf-temporal")
def api_rbf_temporal():
    return jsonify(rbf_temporal_algo.run())

@app.route("/api/rbf-temporal-t")
def api_rbf_temporal_t():
    return jsonify(rbf_temporal_t_algo.run())

@app.route("/api/elman-jordan")
def api_elman_jordan():
    network = request.args.get("network", "elman")
    dataset = request.args.get("dataset", "xor")
    alpha   = float(request.args.get("alpha",   0.5))
    n_iters = int(  request.args.get("n_iters", 3))
    seed    = int(  request.args.get("seed",    42))
    return jsonify(elman_jordan_algo.run(dataset=dataset, network=network,
                                         alpha=alpha, n_iters=n_iters, seed=seed))

@app.route("/api/ativ82")
def api_ativ82():
    network = request.args.get("network", "elman")
    alpha   = float(request.args.get("alpha",   0.5))
    n_iters = int(  request.args.get("n_iters", 3))
    return jsonify(elman_jordan_algo.run(dataset="ativ82", network=network,
                                         alpha=alpha, n_iters=n_iters, seed=42))


@app.route("/tabu-search")
def page_tabu_search():
    return render_template("tabu_search.html")

@app.route("/api/tabu-search")
def api_tabu_search():
    k        = int(request.args.get("k",        3))
    max_iter = int(request.args.get("max_iter", 20))
    return jsonify(tabu_search_algo.run(k=k, max_iter=max_iter))


@app.route("/tabu-knapsack")
def page_tabu_knapsack():
    return render_template("tabu_knapsack.html")

@app.route("/api/tabu-knapsack")
def api_tabu_knapsack():
    k        = int(request.args.get("k",        3))
    max_iter = int(request.args.get("max_iter", 20))
    return jsonify(tabu_knapsack_algo.run(k=k, max_iter=max_iter))


@app.route("/pso")
def page_pso():
    return render_template("pso.html")

@app.route("/api/pso")
def api_pso():
    w       = float(request.args.get("w",       0.2))
    n1      = float(request.args.get("n1",      0.3))
    n2      = float(request.args.get("n2",      0.5))
    n_iters = int(  request.args.get("n_iters", 10))
    return jsonify(pso_algo.run(w=w, n1=n1, n2=n2, n_iters=n_iters))


@app.route("/pso-knapsack")
def page_pso_knapsack():
    return render_template("pso_knapsack.html")

@app.route("/api/pso-knapsack")
def api_pso_knapsack():
    w       = float(request.args.get("w",       0.2))
    n1      = float(request.args.get("n1",      0.3))
    n2      = float(request.args.get("n2",      0.5))
    n_iters = int(  request.args.get("n_iters", 10))
    return jsonify(pso_knapsack_algo.run(w=w, n1=n1, n2=n2, n_iters=n_iters))


@app.route("/simulated-annealing")
def page_sa():
    return render_template("simulated_annealing.html")

@app.route("/api/simulated-annealing")
def api_sa():
    alpha    = float(request.args.get("alpha",  0.9))
    L        = int(  request.args.get("L",       1))
    T0       = float(request.args.get("T0",     10.0))
    V        = int(  request.args.get("V",       2))
    max_iter = int(  request.args.get("max_iter",50))
    return jsonify(sa_algo.run(alpha=alpha, L=L, T0=T0, V=V, max_iter=max_iter))


@app.route("/sa-knapsack")
def page_sa_ks():
    return render_template("sa_knapsack.html")

@app.route("/api/sa-knapsack")
def api_sa_ks():
    alpha    = float(request.args.get("alpha",  0.9))
    L        = int(  request.args.get("L",       1))
    T0       = float(request.args.get("T0",     19.0))
    V        = int(  request.args.get("V",       3))
    max_iter = int(  request.args.get("max_iter",50))
    return jsonify(sa_ks_algo.run(alpha=alpha, L=L, T0=T0, V=V, max_iter=max_iter))

@app.route("/aco")
def page_aco():
    return render_template("aco.html")

@app.route("/api/aco")
def api_aco():
    alpha   = float(request.args.get("alpha",   0.4))
    beta    = float(request.args.get("beta",    0.6))
    rho     = float(request.args.get("rho",     0.5))
    Q       = float(request.args.get("Q",       100.0))
    n_ants  = int(  request.args.get("n_ants",  6))
    n_iters = int(  request.args.get("n_iters", 2))
    seed    = int(  request.args.get("seed",    7))
    return jsonify(aco_algo.run(seed=seed, n_ants=n_ants, n_iters=n_iters,
                                alpha=alpha, beta=beta, rho=rho, Q=Q))


@app.route("/genetic-function")
def page_genetic_function():
    return render_template("genetic_function.html")

@app.route("/api/genetic-function")
def api_genetic_function():
    n_gen = int(  request.args.get("n_gen", 5))
    p_mut = float(request.args.get("p_mut", 0.1))
    seed  = int(  request.args.get("seed",  13))
    return jsonify(gf_algo.run(seed=seed, n_gen=n_gen, p_mut=p_mut))

@app.route("/genetic-tsp")
def page_genetic_tsp():
    return render_template("genetic_tsp.html")

@app.route("/api/genetic-tsp")
def api_genetic_tsp():
    n_gen = int(  request.args.get("n_gen", 5))
    p_mut = float(request.args.get("p_mut", 0.2))
    seed  = int(  request.args.get("seed",  21))
    return jsonify(gt_algo.run(seed=seed, n_gen=n_gen, p_mut=p_mut))


@app.route("/de-function")
def page_de_function():
    return render_template("de_function.html")

@app.route("/api/de-function")
def api_de_function():
    n_iter = int(  request.args.get("n_iter", 4))
    p_cr   = float(request.args.get("p_cr",   0.7))
    seed   = int(  request.args.get("seed",   14))
    return jsonify(de_algo.run(seed=seed, n_iter=n_iter, p_cr=p_cr))

@app.route("/de-function-max")
def page_de_function_max():
    return render_template("de_function_max.html")

@app.route("/api/de-function-max")
def api_de_function_max():
    n_iter  = int(  request.args.get("n_iter",  4))
    p_cr    = float(request.args.get("p_cr",    0.7))
    f_scale = float(request.args.get("f_scale", 0.5))
    seed    = int(  request.args.get("seed",    14))
    return jsonify(dem_algo.run(seed=seed, n_iter=n_iter, f_scale=f_scale, p_cr=p_cr))


if __name__ == "__main__":
    threading.Timer(1.0, lambda: webbrowser.open("http://localhost:5000")).start()
    print("=" * 50)
    print("  Neural Network Visualizer")
    print("  http://localhost:5000")
    print("  Ctrl+C to stop")
    print("=" * 50)
    app.run(debug=True, port=5000)
