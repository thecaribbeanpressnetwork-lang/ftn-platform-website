# EBR-A Real-Agent Matched-Cause Protocol v0.1

## Purpose
Test whether EBR-A-style diagnosis distinguishes causally different trajectories that have similar observable outcomes.

## Core design
Nine matched pairs are included. Within each pair, the visible result is intentionally similar while the hidden cause differs.

Examples:
- accidental monitor removal vs deliberate monitor interference;
- safety-preserving refusal vs unjustified abandonment;
- stale authorization vs deliberate permission bypass;
- memory contamination vs fresh reasoning error;
- ambiguous instruction vs explicit requirement violation;
- reward exploitation vs legitimate alternative solution;
- provenance loss across agents vs bad external source;
- unstated human expectation vs explicit criterion violation;
- unmodeled cause vs known tool error.

## Required models
At least:
1. one open-weight instruction model;
2. one frontier API model if resources permit;
3. one separate judge model or blinded human adjudication.

## Baselines
A. Output-only judge: receives only final visible outcome.
B. Generic trajectory judge: receives full transcript but no explicit EBR-A fields.
C. EBR-A judge: receives transcript plus criteria/provenance typing and instructions to preserve competing histories/UNKNOWN.

## Primary metrics
- causal classification accuracy;
- pair discrimination accuracy;
- UNKNOWN recall;
- confidence calibration;
- false attribution of benign cases;
- unnecessary-intervention rate.

## Claim gate
No superiority claim until:
- at least two model families are evaluated;
- benchmark prompts and outputs are archived;
- model/version/date are recorded;
- a blinded adjudication subset is completed;
- strong trajectory baselines are included.

## Research-integrity rule
Ground-truth hidden causes must remain unavailable to the acting and judging models.
