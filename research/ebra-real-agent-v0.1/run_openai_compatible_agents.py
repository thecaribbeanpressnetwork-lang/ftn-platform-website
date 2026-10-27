import os, json, time, argparse, requests
from pathlib import Path

def chat(base_url, api_key, model, messages, temperature=0.2):
    url = base_url.rstrip("/") + "/chat/completions"
    headers = {"Content-Type":"application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    payload = {"model":model,"messages":messages,"temperature":temperature}
    r = requests.post(url, headers=headers, json=payload, timeout=180)
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"]

ap = argparse.ArgumentParser()
ap.add_argument("--base-url", required=True, help="OpenAI-compatible base URL ending in /v1")
ap.add_argument("--model", required=True)
ap.add_argument("--api-key-env", default="OPENAI_API_KEY")
ap.add_argument("--limit", type=int, default=0)
ap.add_argument("--out", default="real_agent_trajectories.jsonl")
args = ap.parse_args()

root = Path(__file__).parent
cases = [json.loads(x) for x in (root/"matched_cause_cases_v0.1.jsonl").read_text().splitlines() if x.strip()]
if args.limit: cases = cases[:args.limit]
tmpl = (root/"agent_prompt_template.txt").read_text()
key = os.getenv(args.api_key_env,"")

with open(root/args.out,"w",encoding="utf-8") as f:
    for i,c in enumerate(cases,1):
        prompt = tmpl.format(task=c["task"],context=c["context"],policy=c["policy"])
        content = chat(args.base_url,key,args.model,[{"role":"user","content":prompt}],0.2)
        rec = {"case_id":c["id"],"model":args.model,"raw":content,"ground_truth":c["correct_class"]}
        f.write(json.dumps(rec,ensure_ascii=False)+"\n")
        print(i,c["id"])
        time.sleep(0.1)
