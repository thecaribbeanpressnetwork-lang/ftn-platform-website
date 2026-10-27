import json, argparse, re
from pathlib import Path
import pandas as pd

ap=argparse.ArgumentParser()
ap.add_argument("--input",default="diagnoses.jsonl")
args=ap.parse_args()
root=Path(__file__).parent
rows=[]
for line in (root/args.input).read_text().splitlines():
    r=json.loads(line)
    try:
        obj=json.loads(r["raw"])
        pred=obj.get("classification","PARSE_ERROR")
        conf=obj.get("confidence_0_to_1")
        unk=obj.get("unknown_possible")
    except Exception:
        m=re.search(r'"classification"\s*:\s*"([^"]+)"',r["raw"])
        pred=m.group(1) if m else "PARSE_ERROR"; conf=None; unk=None
    rows.append({"case_id":r["case_id"],"ground_truth":r["ground_truth"],"prediction":pred,
                 "correct":int(pred==r["ground_truth"]),"confidence":conf,"unknown_possible":unk})
df=pd.DataFrame(rows)
print(df.to_string(index=False))
print("\nAccuracy:",df.correct.mean())
if (df.ground_truth=="UNKNOWN").any():
    print("UNKNOWN recall:",df.loc[df.ground_truth=="UNKNOWN","correct"].mean())
df.to_csv(root/"real_agent_scores.csv",index=False)
