"""Writes $OUT/summary.md for a ClearScan sim run. SIM-RUN (simulator only, not device)."""
import json
import os
import sys

out, rc, iap_rc = sys.argv[1], sys.argv[2], sys.argv[3]
try:
    steps = json.load(open(os.path.join(out, "iap", "results.json")))["steps"]
except Exception:
    steps = []
note_path = os.path.join(out, "storekit-note.txt")
note = open(note_path).read().strip() if os.path.exists(note_path) else "storekit note missing"
lines = [
    "# ClearScan SIM-RUN (simulator only, not device)",
    "",
    f"flow exit: {rc}; xcodebuild test exit: {iap_rc}",
    "",
    note,
    "",
    "| Screen | Present |",
    "| --- | --- |",
]
for n in ["01-home", "02-scanning", "03-result", "04-export", "05-paywall"]:
    ok = os.path.exists(os.path.join(out, "screenshots", n + ".png"))
    lines.append(f"| {n} | {'yes' if ok else 'NO'} |")
lines += ["", "| Step | Result | Detail |", "| --- | --- | --- |"]
for s in steps:
    lines.append(f"| {s['step']} {s['name']} | {'PASS' if s['pass'] else 'FAIL'} | {s['detail']} |")
open(os.path.join(out, "summary.md"), "w").write("\n".join(lines) + "\n")
print("\n".join(lines))
