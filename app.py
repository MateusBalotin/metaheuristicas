from flask import Flask, render_template, jsonify, request
import threading, webbrowser

from algorithms import perceptron    as perceptron_algo
from algorithms import adaline       as adaline_algo
from algorithms import mlp           as mlp_algo
from algorithms import mlp_momentum as mlp_momentum_algo
from algorithms import func_approx  as func_approx_algo

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
    return jsonify(func_approx_algo.run(n_hidden=n_hidden, alpha=alpha, n_iters=n_iters, seed=seed))

if __name__ == "__main__":
    threading.Timer(1.0, lambda: webbrowser.open("http://localhost:5000")).start()
    print("=" * 50)
    print("  Neural Network Visualizer")
    print("  http://localhost:5000")
    print("  Ctrl+C to stop")
    print("=" * 50)
    app.run(debug=True, port=5000)
