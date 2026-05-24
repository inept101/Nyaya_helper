# Sample Test Plan — Sharma vs. Sharma

A realistic civil partition suit covering all features of the app.

## Case to register

| Field | Value |
|-------|-------|
| Title | Ramesh Kumar Sharma vs. Suresh Kumar Sharma & Anr. |
| Case Number | CS/2025/001 |
| Court | District Court, Tis Hazari, Delhi |
| Case Type | Civil Suit |
| Petitioner | Ramesh Kumar Sharma |
| Respondent | Suresh Kumar Sharma; Smt. Kamla Devi Sharma |
| Notes | Partition suit over 3 inherited properties; intestate succession; allegations of forcible exclusion and misappropriation of rents. |

## Document to upload

`plaint-sharma-vs-sharma.txt` — a ~3-page civil plaint under Order VII Rule 1 CPC.

## What each AI feature should produce

### 1. Document Summarization
Should identify:
- Parties (Ramesh = plaintiff/elder son; Suresh + Kamla Devi = defendants)
- Three suit properties (Karol Bagh house, Gaffar Market shop, Mehrampur land)
- Cause: intestate death of Mohan Lal Sharma on 14 Mar 2023
- Reliefs: partition, possession, permanent injunction, mesne profits ~Rs. 4.73L
- Key statutes: Hindu Succession Act, CPC Order VII Rule 1, Section 80 CPC

### 2. Legal Issue Extraction
Expected issues:
- Whether plaintiff is entitled to 1/3 share under Hindu Succession Act s.8
- Whether defendants forcibly excluded plaintiff from Property A
- Whether defendant No. 1 is liable to render accounts of rents
- Whether plaintiff is entitled to mesne profits and at what rate
- Whether permanent injunction should be granted pending suit

### 3. Case Brief Generation
Should produce an Indian-format brief with: jurisdiction, parties, chronology
(Mar 2023 → Jun 2023 → Aug 2023 notice → Sep 2025 incident), issues,
plaintiff's arguments, statutes, reliefs.

### 4. Legal Research (RAG Q&A)
Try these questions:
- "What is the share of each legal heir under the Hindu Succession Act?"
- "What relief has the plaintiff sought against Defendant No. 1?"
- "What is the basis for the mesne profits calculation?"
- "When did the cause of action arise and is it continuing?"
- "What allegations does the plaint make regarding FIR 0892/2025?"

### 5. Judgment Draft Scaffolding
Should generate skeleton with:
- Section A: Parties & nature of suit
- Section B: Facts (pre-filled from plaint)
- Section C: Issues for determination
- Section D: `[JUDGE TO COMPLETE: findings on each issue]`
- Section E: Order/Decree

## Effectiveness criteria — what to watch for

| Criterion | Good sign | Bad sign |
|-----------|-----------|----------|
| Accuracy of party names | "Ramesh Kumar Sharma" verbatim | Hallucinated names |
| Indian-legal vocabulary | "plaint", "mesne profits", "decree", "Order VII" | Generic "lawsuit", "damages" |
| Statute references | Cites HSA s.8, CPC Order VII Rule 1, IPC 506/341 | Cites US/UK statutes or none |
| Numerical fidelity | Rs. 4,20,000 carried through | Numbers invented or dropped |
| Citation format | "(2023) X SCC Y" or "AIR YYYY SC NNNN" | Generic "Supreme Court case" |
| Streaming behaviour | Token-by-token output | Big delay + dump |

## Caveat about `gemma4:e2b`

This is a ~2B-parameter edge model. It will be **fast** but expect:
- Occasional missed nuances in legal reasoning
- Shorter outputs than a frontier model
- Sometimes generic rather than Indian-specific language

For a stricter evaluation, swap to a larger model later by editing
`backend/.env` → `MODEL_NAME=gemma3:4b` (already installed) or any
OpenAI/Anthropic key. No code changes needed.
