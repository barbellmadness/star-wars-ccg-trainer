#!/usr/bin/env python3
"""Snapshot Premiere card data for the trainer. Run explicitly; never on page load."""
import json, pathlib, urllib.request, datetime
BASE="https://raw.githubusercontent.com/swccgpc/swccg-card-json/main/"
OUT=pathlib.Path("data"); OUT.mkdir(exist_ok=True)
cards=[]
for side in ("Light","Dark"):
    with urllib.request.urlopen(BASE+side+".json", timeout=45) as response:
        payload=json.load(response)
    subset=[c for c in payload["cards"] if str(c.get("set"))=="1"]
    for c in subset:
        front=c.get("front") or {}
        cards.append({"id":f"{side}:{c['id']}","sourceId":c["id"],"side":side,
          "name":front.get("title"),"type":front.get("type"),
          "subType":front.get("subType"),"power":front.get("power"),
          "ability":front.get("ability"),"deploy":front.get("deploy"),
          "forfeit":front.get("forfeit"),"destiny":front.get("destiny"),
          "gametext":front.get("gametext"),"lore":front.get("lore"),
          "image":front.get("imageUrl"),
          "lightSideIcons":front.get("lightSideIcons"),
          "darkSideIcons":front.get("darkSideIcons"),
          "icons":front.get("icons"),"rawFront":front})
    print(side,len(subset))
if len(cards)!=324 or sum(x["side"]=="Light" for x in cards)!=162 or sum(x["side"]=="Dark" for x in cards)!=162:
    raise SystemExit("Unexpected Premiere card count; refusing to overwrite snapshot")
if len({x["id"] for x in cards})!=324:raise SystemExit("Duplicate IDs")
(OUT/"premiere.json").write_text(json.dumps({"schema":1,"source":"swccgpc/swccg-card-json","cards":cards},ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print("Wrote",OUT/"premiere.json")
