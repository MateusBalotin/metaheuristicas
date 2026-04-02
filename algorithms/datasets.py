from __future__ import annotations

_CANVAS_SMALL = {
    "x1min": -0.15, "x1max": 1.35,
    "ref_x": [0, 1],
    "y_def_min": -0.5, "y_def_max": 1.3,
}

_CANVAS_22 = {
    "x1min": -0.5, "x1max": 5.8,
    "ref_x": [0, 5],
    "y_def_min": -0.5, "y_def_max": 4.0,
}

_TRAIN_22 = [
    {"n":  1, "x1": 0, "x2": 1, "d":  1},
    {"n":  2, "x1": 0, "x2": 2, "d":  1},
    {"n":  3, "x1": 1, "x2": 1, "d":  1},
    {"n":  4, "x1": 1, "x2": 2, "d":  1},
    {"n":  5, "x1": 1, "x2": 3, "d":  1},
    {"n":  6, "x1": 2, "x2": 2, "d":  1},
    {"n":  7, "x1": 2, "x2": 3, "d":  1},
    {"n":  8, "x1": 3, "x2": 2, "d":  1},
    {"n":  9, "x1": 4, "x2": 1, "d":  1},
    {"n": 10, "x1": 4, "x2": 3, "d":  1},
    {"n": 11, "x1": 2, "x2": 0, "d": -1},
    {"n": 12, "x1": 2, "x2": 1, "d": -1},
    {"n": 13, "x1": 3, "x2": 0, "d": -1},
    {"n": 14, "x1": 3, "x2": 1, "d": -1},
    {"n": 15, "x1": 3, "x2": 3, "d": -1},
    {"n": 16, "x1": 4, "x2": 0, "d": -1},
    {"n": 17, "x1": 4, "x2": 2, "d": -1},
    {"n": 18, "x1": 5, "x2": 0, "d": -1},
    {"n": 19, "x1": 5, "x2": 1, "d": -1},
    {"n": 20, "x1": 5, "x2": 2, "d": -1},
    {"n": 21, "x1": 5, "x2": 3, "d": -1},
    {"n": 22, "x1": 0, "x2": 3, "d":  1},
]

_TEST_8 = [
    {"n": 23, "x1": 0.0, "x2": 0.0, "d":  1},
    {"n": 24, "x1": 1.0, "x2": 0.0, "d": -1},
    {"n": 25, "x1": 4.5, "x2": 0.5, "d": -1},
    {"n": 26, "x1": 3.5, "x2": 1.5, "d":  1},
    {"n": 27, "x1": 4.0, "x2": 2.5, "d":  1},
    {"n": 28, "x1": 1.5, "x2": 1.5, "d":  1},
    {"n": 29, "x1": 2.0, "x2": 0.5, "d": -1},
    {"n": 30, "x1": 2.5, "x2": 2.5, "d":  1},
]

_CANVAS_MOMENTUM = {
    "x1min": -0.4, "x1max": 3.4,
    "ref_x": [0, 1, 2, 3],
    "y_def_min": -0.4, "y_def_max": 3.9,
}

_TRAIN_MOMENTUM = [
    {"n": 1, "x1": 0, "x2": 2, "d": 1, "label": "A\u2081", "cls": "A"},
    {"n": 2, "x1": 1, "x2": 2, "d": 1, "label": "A\u2082", "cls": "A"},
    {"n": 3, "x1": 1, "x2": 3, "d": 1, "label": "A\u2083", "cls": "A"},
    {"n": 4, "x1": 1, "x2": 0, "d": 0, "label": "B\u2081", "cls": "B"},
    {"n": 5, "x1": 2, "x2": 1, "d": 0, "label": "B\u2082", "cls": "B"},
]

_INIT_WEIGHTS_MOMENTUM = {
    "V":       [[-0.9, 0.9], [0.9, -0.9], [-0.9, 0.9]],
    "theta_a": [0.9, 0.9, -0.9],
    "W":       [0.9, -0.9, 0.9],
    "theta_b": -0.9,
}


_CANVAS_FUNC_APPROX = {
    "x1min": -3.6, "x1max": 3.6,
    "ref_x": [-3, -2, -1, 0, 1, 2, 3],
    "y_def_min": -12.0, "y_def_max": 12.0,
}

_TRAIN_FUNC_APPROX = [
    {"n":  1, "x1": -3.0, "d": -10.0},
    {"n":  2, "x1": -2.5, "d":  -6.0},
    {"n":  3, "x1": -2.0, "d":  -3.6},
    {"n":  4, "x1": -1.5, "d":  -2.1},
    {"n":  5, "x1": -1.0, "d":  -1.2},
    {"n":  6, "x1": -0.5, "d":  -0.5},
    {"n":  7, "x1":  0.0, "d":   0.0},
    {"n":  8, "x1":  0.5, "d":   0.52},
    {"n":  9, "x1":  1.0, "d":   1.18},
    {"n": 10, "x1":  1.5, "d":   2.0},
    {"n": 11, "x1":  2.0, "d":   3.6},
    {"n": 12, "x1":  2.5, "d":   6.05},
    {"n": 13, "x1":  3.0, "d":  10.02},
]

import math


_CANVAS_RBF = {
    "x1min": -2.5, "x1max": 4.5,
    "ref_x": [-2, -1, 0, 1, 2, 3, 4],
    "y_def_min": -8.0, "y_def_max": 6.0,
}

_TRAIN_RBF = [
    {"n": 1, "x1": -2.0, "d": -3.573885},
    {"n": 2, "x1": -1.7, "d": -2.507043},
    {"n": 3, "x1": -1.4, "d": -1.305581},
    {"n": 4, "x1": -1.1, "d": -0.076823},
    {"n": 5, "x1": -0.8, "d": 1.069471},
    {"n": 6, "x1": -0.5, "d": 2.030905},
    {"n": 7, "x1": -0.2, "d": 2.721597},
    {"n": 8, "x1": 0.1, "d": 3.07985},
    {"n": 9, "x1": 0.4, "d": 3.073662},
    {"n": 10, "x1": 0.7, "d": 2.703586},
    {"n": 11, "x1": 1.0, "d": 2.00268},
    {"n": 12, "x1": 1.3, "d": 1.033553},
    {"n": 13, "x1": 1.6, "d": -0.117224},
    {"n": 14, "x1": 1.9, "d": -1.346858},
    {"n": 15, "x1": 2.2, "d": -2.545508},
    {"n": 16, "x1": 2.5, "d": -3.606102},
    {"n": 17, "x1": 2.8, "d": -4.433901},
    {"n": 18, "x1": 3.1, "d": -4.95496},
    {"n": 19, "x1": 3.4, "d": -5.122734},
    {"n": 20, "x1": 3.7, "d": -4.922236},
    {"n": 21, "x1": 4.0, "d": -4.371377}
]

DATASETS: dict = {
    "perceptron_ex4": {
        "label": "Activity 1 · Ex4 — Pattern Classification",
        "train": [
            {"n": 1, "x1": 0.75, "x2": 0.75, "d":  1},
            {"n": 2, "x1": 0.75, "x2": 0.25, "d": -1},
            {"n": 3, "x1": 0.25, "x2": 0.75, "d": -1},
            {"n": 4, "x1": 0.25, "x2": 0.25, "d":  1},
        ],
        "test":   [],
        "canvas": _CANVAS_SMALL,
    },
    "ex22": {
        "label":  "22 training / 8 test vectors",
        "train":  _TRAIN_22,
        "test":   _TEST_8,
        "canvas": _CANVAS_22,
    },
    "mlp_momentum": {
        "label":        "Activity 3 · Ex2 — MLP 3 layers (5 patterns A/B)",
        "train":        _TRAIN_MOMENTUM,
        "test":         [],
        "canvas":       _CANVAS_MOMENTUM,
        "init_weights": _INIT_WEIGHTS_MOMENTUM,
        "alpha":        1.0,
        "n_iters":      3,
        "n_hidden":     3,
        "threshold":    0.5,
    },
    "func_approx_ex1": {
        "label":    "Activity 3 · Ex1 — Function Approximation",
        "train":    _TRAIN_FUNC_APPROX,
        "test":     [],
        "canvas":   _CANVAS_FUNC_APPROX,
        "n_inputs": 1,
        "n_hidden": 6,
        "alpha":    0.1,
        "n_iters":  500,
        "seed":     42,
    },
    "rbf_ex5": {
        "label":    "Activity 4 · Ex5 — RBF Function Approximation",
        "train":    _TRAIN_RBF,
        "test":     [],
        "canvas":   _CANVAS_RBF,
        "n_inputs": 1,
        "q":        4,
        "sigma":    1.5,
        "seed":     42,
    },
    "rbf_ex6": {
        "label":       "Activity 4 · Ex6 — RBF Classification (22 points)",
        "train":       _TRAIN_22,
        "test":        _TEST_8,
        "canvas":      _CANVAS_22,
        "n_inputs":    2,
        "q":           3,
        "sigma":       5.0,
        "fixed_centers": [[1.0, 3.0], [4.0, 0.0], [5.0, 3.0]],
        "threshold":   0.0,
    },
    "hebb_ex4": {
        "label":    "Activity 5 · Ex4 — Hebb Network (22 points)",
        "train":    _TRAIN_22,
        "test":     _TEST_8,
        "canvas":   _CANVAS_22,
        "n_inputs": 2,
        "alpha":    1.0,
        "n_iters":  3,
        "norm": {
            "x1_min": 0, "x1_max": 5,
            "x2_min": 0, "x2_max": 3,
        },
    },
    "som_ex2": {
        "label":   "Activity 5 · Ex2 — Self-Organizing Map (2×3)",
        "n_inputs": 5,
        "map_rows": 2,
        "map_cols": 3,
        "alpha":    0.5,
        "n_iters":  3,
        "train": [
            {"label": "A", "x": [1, 0, 0, 0, 0]},
            {"label": "F", "x": [3, 1, 0, 0, 0]},
            {"label": "K", "x": [3, 3, 1, 0, 0]},
            {"label": "R", "x": [3, 3, 8, 0, 0]},
            {"label": "S", "x": [3, 3, 3, 1, 0]},
            {"label": "1", "x": [3, 3, 6, 2, 1]},
            {"label": "2", "x": [3, 3, 6, 2, 2]},
        ],
        "test": [
            {"label": "V", "x": [3, 3, 3, 0, 0]},
            {"label": "6", "x": [3, 3, 6, 0, 0]},
            {"label": "C", "x": [4, 2, 0, 0, 0]},
            {"label": "L", "x": [0, 6, 0, 0, 0]},
        ],
        "init_weights": [
            [0.1, 0.2, 0.3, 0.4, 0.5],
            [0.5, 0.4, 0.3, 0.2, 0.1],
            [0.3, 0.1, 0.5, 0.2, 0.4],
            [0.2, 0.5, 0.3, 0.4, 0.1],
            [0.1, 0.4, 0.3, 0.5, 0.2],
            [0.5, 0.3, 0.2, 0.1, 0.4],
        ],
    },
}
