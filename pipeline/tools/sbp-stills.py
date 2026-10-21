"""Build the SBP v2 stills: each screenshot laid on a 1920x1080 canvas, plus pages.json with hotspots.
   python3 pipeline/tools/sbp-stills.py [--debug]   (--debug also writes *_debug.png with the hotspots drawn)
Hotspots are written here in each screenshot's own pixels, and converted to canvas pixels."""
import json, sys
from pathlib import Path
import cv2
import numpy as np

D = Path(__file__).resolve().parents[2] / "assets/southern-building-products/stills"
MAX_SCALE = 1.4


def load(name):
    return cv2.imread(str(D / f"v2-{name}.png"))


def patched_checkout():
    """Filled checkout with the PO and date cleared back to the form's own empty state (the PO is typed in the video)."""
    im, empty = load("checkout-filled"), load("checkout-empty")
    im[240:277, 988:1460] = 255
    im[478:504, 990:1110] = empty[481:507, 986:1106]
    return im


def whatsapp_before():
    im = load("whatsapp-parsed")
    im[352:432, 930:1432] = im[420, 1100]
    return im


PAGES = {
    "signin": ("signin", {"email": {"box": [628, 505, 1251, 570], "input": True}, "send": [626, 604, 1253, 676],
                          "card": [566, 44, 1314, 770], "note": [622, 705, 1160, 742]}),
    "admin": ("admin-catalogue", {"headline": [206, 155, 832, 262], "branches": [214, 352, 875, 388],
                                  "count": [490, 440, 702, 460], "showing": [1113, 128, 1688, 318]}),
    "po-pdf": ("po-pdf", {"doc": [440, 150, 1080, 560], "po": [480, 250, 600, 272]}),
    "po-review": ("po-review", {"email-head": [730, 165, 1040, 238], "draft": [1588, 167, 1639, 237],
                                "title": [730, 185, 952, 217], "dup": [728, 266, 1643, 326],
                                "line1": [1062, 405, 1640, 545], "match1": [1066, 524, 1122, 541],
                                "remember": [1424, 756, 1550, 786], "approve": [831, 856, 1003, 896]}),
    "sage": ("sage", {"title": [484, 372, 766, 412], "po-col": [488, 548, 600, 772], "row1": [486, 586, 1650, 632],
                      "import": [1343, 792, 1497, 838], "download": [1505, 792, 1652, 838]}),
    "inbox": ("confirmation-inbox-b", {"order": [334, 149, 1500, 240], "reorder": [1303, 171, 1483, 217]}),
    "checkout": (patched_checkout, {"line": [330, 205, 932, 275], "po": {"box": [988, 240, 1460, 277], "input": True},
                                    "branch": [984, 318, 1465, 432], "place": [984, 597, 1465, 649]}),
    "dublin": ("dublin-catalogue", {"pricelist": [1277, 465, 1553, 523], "price1": [1295, 638, 1368, 697],
                                    "showing": [1025, 140, 1561, 296]}),
    "cork": ("cork-catalogue", {"pricelist": [1243, 65, 1508, 123], "price1": [1250, 238, 1322, 297]}),
    "whatsapp": (whatsapp_before, {"msg": [504, 31, 1028, 109], "parse": [1050, 155, 1184, 201], "title": [44, 36, 455, 98]}),
    "whatsapp-done": ("whatsapp-parsed", {"toast": [943, 362, 1423, 425], "parse": [1050, 155, 1184, 201]}),
    "applications": ("applications", {"app": [314, 150, 1481, 322], "approve": [1273, 259, 1464, 305],
                                      "pending": [1396, 193, 1464, 221]}),
}


def build(debug=False):
    out = {}
    for route, (src, hs) in PAGES.items():
        im = src() if callable(src) else load(src)
        h, w = im.shape[:2]
        k = min(1920 / w, 1080 / h, MAX_SCALE)
        sm = cv2.resize(im, (round(w * k), round(h * k)), interpolation=cv2.INTER_AREA if k < 1 else cv2.INTER_CUBIC)
        bg = [int(c) for c in im[3, 3]]
        can = np.full((1080, 1920, 3), bg, np.uint8)
        x0, y0 = (1920 - sm.shape[1]) // 2, (1080 - sm.shape[0]) // 2
        can[y0:y0 + sm.shape[0], x0:x0 + sm.shape[1]] = sm
        name = f"s-{route}.png"
        cv2.imwrite(str(D / name), can)
        conv = lambda b: [round(x0 + b[0] * k), round(y0 + b[1] * k), round(x0 + b[2] * k), round(y0 + b[3] * k)]
        hs2 = {i: ({"box": conv(s["box"]), "input": True} if isinstance(s, dict) else conv(s)) for i, s in hs.items()}
        out[route] = {"img": name, "bg": "#%02x%02x%02x" % (bg[2], bg[1], bg[0]), "hs": hs2}
        if debug:
            dbg = can.copy()
            for i, s in hs2.items():
                b = s["box"] if isinstance(s, dict) else s
                cv2.rectangle(dbg, tuple(b[:2]), tuple(b[2:]), (0, 0, 255), 2)
                cv2.putText(dbg, i, (b[0], b[1] - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
            cv2.imwrite(str(Path(sys.argv[2] if len(sys.argv) > 2 else D) / f"{route}_debug.jpg"), dbg)
    (D / "pages.json").write_text(json.dumps(out, indent=1))
    print(f"{len(out)} pages → {D / 'pages.json'}")


build("--debug" in sys.argv)
