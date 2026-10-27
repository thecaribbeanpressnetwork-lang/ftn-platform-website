import os, json, argparse, requests
from pathlib import Path

def chat(base_url, api_key, model, messages, temperature=0):
    url = base_url.rstrip("/") + "/chat/completions"
    headers = {"Content-Type":"application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    payload = {"model":model,"messages":messages,"temperature":temperature}
    r = requests.post(url, headers=headers, json=payload, timeout=180)
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"]

ap=argparse.ArgumentParser()
ap.add_argument("--base-url",required=True)
ap.add_argument("--model",required=True)
ap.add_argument("--input",default="real_agent_trajectories.jsonl")
ap.add_argument("--api-key-env",default="OPENAI_API_KEY")
ap.add_argument("--out",default="diagnoses.jsonl")
args=ap.parse_args()

root=Path(__file__).parent
case_map={json.loads(x)["id"]:json.loads(x) for x in (root/"matched_cause_cases_v0.1.jsonl").read_text().splitlines() if x.strip()}
rows=[json.loads(x) for x in (root/args.input).read_text().splitlines() if x.strip()]
tmpl=(root/"judge_prompt_template.txt").read_text()
key=os.getenv(args.api_key_env,"")

with open(root/args.out,"w",encoding="utf-8") as f:
    for r in rows:
        case=case_map[r["case_id"]]
        evidence={"task":case["task"],"policy":case["policy"],"agent_trajectory":r["raw"],"surface_outcome":case["expected_surface"]}
        content=chat(args.base_url,key,args.model,[{"role":"user","content":tmpl.format(case=json.dumps(evidence))}],0)
        f.write(json.dumps({"case_id":r["case_id"],"judge_model":args.model,"raw":content,"ground_truth":case["correct_class"]})+"\n")
