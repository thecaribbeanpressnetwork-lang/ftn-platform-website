# EBR-A Real-Agent Benchmark v0.1

This package is ready to run against any OpenAI-compatible model endpoint.

## Files
- matched_cause_cases_v0.1.jsonl
- agent_prompt_template.txt
- judge_prompt_template.txt
- run_openai_compatible_agents.py
- judge_trajectories.py
- score_real_agent_benchmark.py
- REAL_AGENT_PROTOCOL_v0.1.md

## Example
```bash
pip install requests pandas
export OPENAI_API_KEY=...
python run_openai_compatible_agents.py --base-url https://api.openai.com/v1 --model <model>
python judge_trajectories.py --base-url https://api.openai.com/v1 --model <judge-model>
python score_real_agent_benchmark.py
```

For local OpenAI-compatible servers (e.g. vLLM/LM Studio), set --base-url to the local `/v1` endpoint and leave the key unset if not required.

No benchmark result should be treated as a sentience result.
