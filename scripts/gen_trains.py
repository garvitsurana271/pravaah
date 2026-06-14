"""Builds a real-timetable scenario for the corridor from the open datameet
schedules.json (CC0). Real train numbers, names, directions and relative
departure order; inter-train gaps are compressed into one peak window so the
services interact on screen. Freight has no public timetable, so the two goods
rakes in the peak scenario are added separately and clearly synthetic.

Run with schedules.json at ./sched.json.
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "src", "data", "corridor-trains.json")

CODE2ID = {"KGP": "kgp", "JER": "jer", "BTS": "bst", "ROP": "rupsa", "BLS": "bls", "BNBR": "bnbr", "SORO": "soro", "BHC": "bhc"}
ORDER = ["KGP", "JER", "BTS", "ROP", "BLS", "BNBR", "SORO", "BHC"]
IDX = {c: i for i, c in enumerate(ORDER)}


def secs(t):
    if not t or t == "None":
        return None
    h, m, s = map(int, t.split(":"))
    return h * 3600 + m * 60 + s


def classify(name, num):
    n = name.lower()
    if any(k in n for k in ("duronto", "rajdhani", "vande", "garib rath", "shatabdi")):
        return "SPECIAL", 130
    if "mail" in n:
        return "MAIL", 110
    if any(k in n for k in ("superfast", " sf", "sampark", "express")) or num[:2] in ("12", "22", "20"):
        # passenger/fast-pass override
        if any(k in n for k in ("pass", "memu", "demu", "fast pass")):
            return "PASSENGER", 80
        if "express" in n and num[:2] not in ("12", "22", "20"):
            return "EXPRESS", 110
        return "SUPERFAST", 130
    if any(k in n for k in ("pass", "memu", "demu")):
        return "PASSENGER", 80
    return "EXPRESS", 110


d = json.load(open(os.path.join(ROOT, "sched.json"), encoding="utf-8"))
trains = {}
for r in d:
    c = r.get("station_code")
    if c in IDX:
        trains.setdefault(r["train_number"], {"name": r["train_name"], "stops": []})["stops"].append(
            (IDX[c], c, secs(r.get("departure") or r.get("arrival")))
        )

ups, downs = [], []
for num, info in trains.items():
    st = sorted([s for s in info["stops"] if s[2] is not None])
    if len(st) < 6:  # near-full corridor traversal only
        continue
    entry, exit_ = st[0], st[-1]
    rec = (entry[2], num, info["name"], entry[1], exit_[1])
    (ups if exit_[0] > entry[0] else downs).append(rec)

ups.sort()
downs.sort()
# pick a clean morning cluster, both directions
ups = [u for u in ups if u[0] >= 4 * 3600][:5]
downs = downs[:3] if downs else []

defs = []
COMPRESS = 7.0  # real minutes -> demo minutes


def emit(group, stagger_min):
    if not group:
        return
    t0 = group[0][0]
    for entry_secs, num, name, fr, to in group:
        cls, spd = classify(name, num)
        defs.append({
            "number": num,
            "name": name.strip()[:28],
            "cls": cls,
            "from": CODE2ID[fr],
            "to": CODE2ID[to],
            "entryMin": round(stagger_min + (entry_secs - t0) / 60.0 / COMPRESS, 1),
            "maxSpeedKmh": spd,
            "stops": ["bls"],
        })


emit(ups, 0.5)
emit(downs, 1.0)

with open(OUT, "w", encoding="utf-8") as f:
    json.dump(defs, f, ensure_ascii=False, indent=1)
print(f"wrote {len(defs)} real trains -> {OUT}")
for x in defs:
    print(f"  {x['number']:7} {x['name'][:26]:26} {x['cls']:9} {x['from']}->{x['to']} @{x['entryMin']}m {x['maxSpeedKmh']}kmh")
