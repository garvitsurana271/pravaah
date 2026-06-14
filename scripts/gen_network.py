"""Turns the open datameet/railways stations.json (CC0) into a compact, bundled
coordinate set for the national-network backdrop on the geographic view.

Source: https://github.com/datameet/railways  (stations.json)
Run after placing stations.json at /tmp/in-stations.json (or pass a path).
"""
import json
import os
import sys

SRC = sys.argv[1] if len(sys.argv) > 1 else "/tmp/in-stations.json"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "src", "data", "india-stations.json")

# India bounding box (drops a handful of bad/foreign points).
LON_MIN, LON_MAX = 68.0, 98.0
LAT_MIN, LAT_MAX = 6.0, 37.5

with open(SRC, "r", encoding="utf-8") as f:
    fc = json.load(f)

pts = []
for feat in fc.get("features", []):
    g = feat.get("geometry")
    if not g or g.get("type") != "Point":
        continue
    c = g.get("coordinates")
    if not c or len(c) != 2:
        continue
    lon, lat = c
    if not (LON_MIN <= lon <= LON_MAX and LAT_MIN <= lat <= LAT_MAX):
        continue
    pts.append([round(lon, 3), round(lat, 3)])

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(pts, f, separators=(",", ":"))

print(f"wrote {len(pts)} stations -> {OUT} ({os.path.getsize(OUT)} bytes)")
