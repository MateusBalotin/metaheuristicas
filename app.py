from flask import Flask, render_template, jsonify
from perceptron import run, EXERCISES
import webbrowser, threading

app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html", exercises=EXERCISES)


@app.route("/exercise/<ex_id>")
def exercise(ex_id):
    if ex_id not in EXERCISES:
        return "Exercise not found", 404
    data = run(ex_id)
    return render_template("exercise.html", ex_id=ex_id, data=data)


@app.route("/api/<ex_id>")
def api(ex_id):
    if ex_id not in EXERCISES:
        return jsonify({"error": "not found"}), 404
    return jsonify(run(ex_id))


if __name__ == "__main__":
    threading.Timer(1.0, lambda: webbrowser.open("http://localhost:5000")).start()
    print("=" * 50)
    print("  Perceptron Visualizer")
    print("  http://localhost:5000")
    print("  Ctrl+C to quit")
    print("=" * 50)
    app.run(debug=False, port=5000)
