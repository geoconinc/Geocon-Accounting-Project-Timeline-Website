#!/usr/bin/env python3
"""
Regenerate data/geoconRoleAssignees.json and data/role-assignee-emails.txt
from geocon_employee_list.XLSX (active employees only).

Usage:
  python3 scripts/build-role-assignees-from-xlsx.py /path/to/geocon_employee_list.XLSX
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
DEST_JSON = ROOT / "data" / "geoconRoleAssignees.json"
DEST_TXT = ROOT / "data" / "role-assignee-emails.txt"

# Org-chart director names → exact Excel "Name" cell (must match Sheet1)
DIRECTOR_EXCEL_NAMES: list[str] = [
    "Evans, Dave B.",
    "Kasman, Gerry",
    "Derkalousdian, Harry",
    "Aguilar, Jeff D.",
    "Adams  (Thomas), Jelisa T.",
    "Zorne, Jeremy J.",
    "Ewert, Josh J.",
    "Battiato, Lisa",
    "Love, Matt R.",
    "Cazeneuve, Mike",
    "Berliner, Neal D.",
    "Silva, Rebecca L.",
    "Day, Rick W.",
    "Mikesell, Rod C.",
    "Vacula, Scott H.",
    "Rodacker, Shane A.",
    "Weedon, Shawn F.",
    "Reist, Troy K.",
]

DIRECTOR_CHART_LABELS = [
    "David Evans",
    "Gerald Kasman (Gerry Kasman)",
    "Harry Derkalousdian",
    "Jeffrey Aguilar",
    "Jelisa Adams",
    "Jeremy Zorne",
    "Joshua Ewert",
    "Lisa Battiato",
    "Matthew Love",
    "Michael Cazeneuve",
    "Neal Berliner",
    "Rebecca Silva",
    "Richard Day",
    "Rodney Mikesell",
    "Scott Vacula",
    "Shane Rodacker",
    "Shawn Weedon",
    "Troy Reist",
]


def main() -> None:
    xlsx = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / "Downloads" / "geocon_employee_list.XLSX"
    if not xlsx.is_file():
        print(f"File not found: {xlsx}", file=sys.stderr)
        sys.exit(1)

    df = pd.read_excel(xlsx)
    active = df[df["Status"].astype(str).str.lower() == "active"].copy()
    active["Job"] = active["Job"].fillna("").astype(str)

    project_directors: list[dict] = []
    for label, ename in zip(DIRECTOR_CHART_LABELS, DIRECTOR_EXCEL_NAMES):
        row = active[active["Name"].astype(str).str.strip() == ename]
        if row.empty:
            print(f"ERROR: no active row for director {label!r} / Excel name {ename!r}", file=sys.stderr)
            sys.exit(2)
        r = row.iloc[0]
        project_directors.append(
            {
                "chartLabel": label,
                "name": str(r["Name"]),
                "email": str(r["Primary e-mail"]).strip(),
                "job": str(r["Job"]),
                "office": str(r["Office"]),
                "inEmployeeList": True,
            }
        )

    pat = re.compile(r"\b(engineer|geologist|scientist)\b", re.I)
    pm_df = active[active["Job"].apply(lambda j: bool(pat.search(str(j))))]
    project_managers = []
    for _, r in pm_df.sort_values("Name").iterrows():
        project_managers.append(
            {
                "name": str(r["Name"]),
                "email": str(r["Primary e-mail"]).strip(),
                "job": str(r["Job"]),
                "office": str(r["Office"]),
            }
        )

    out = {
        "source": xlsx.name,
        "projectDirectors": project_directors,
        "projectManagers": project_managers,
    }
    DEST_JSON.parent.mkdir(parents=True, exist_ok=True)
    DEST_JSON.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print("Wrote", DEST_JSON)

    emails = {d["email"].lower() for d in project_directors if d.get("email")}
    emails |= {p["email"].lower() for p in project_managers}
    DEST_TXT.write_text("\n".join(sorted(emails)) + "\n", encoding="utf-8")
    print("Wrote", DEST_TXT, f"({len(emails)} addresses)")


if __name__ == "__main__":
    main()
