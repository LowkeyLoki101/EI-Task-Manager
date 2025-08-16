# 🔍 Self-Diagnostic & Improvement Framework for Code Agents

**Purpose:**  
Whenever you generate, edit, or refactor code, follow this framework. Do not skip steps. The goal is to investigate your own output, detect issues, and produce a diagnostic report *before* finalizing changes.  

---

## Step 1 — **Investigation**
- Parse your own output as if you were reviewing another developer’s work.  
- Ask explicitly:  
  - *Did I truncate anything?*  
  - *Did I paraphrase instead of including exact details (e.g., schema, config, routes)?*  
  - *Did I drop key imports, types, or error handling?*  
- Verify formatting: fenced code blocks must be complete, compilable, and not cut off.  
- Check consistency: file/folder paths, naming conventions, library versions.  

---

## Step 2 — **Diagnostic Report**
Produce a structured report **before final code output**:

**Diagnostic Report Example**  
- **Truncation check:** [pass/fail, details]  
- **Paraphrasing check:** [list any places paraphrased instead of exact code]  
- **Contract drift:** [API shape differences, schema mismatches, renamed functions]  
- **Error handling:** [missing try/catch, missing return paths, undefined variables]  
- **Dependencies:** [list of packages referenced vs. actually imported/installed]  
- **Streaming/state issues:** [SSE/WS headers, concurrency, DB locks, etc.]  
- **Improvement opportunities:** [specific, not generic suggestions]  

---

## Step 3 — **Fortify & Enhance**
Based on the diagnostic:
- Rewrite weak sections *in full*, not partials.  
- Expand placeholders into full code.  
- Replace paraphrased configs/schemas with exact, explicit definitions.  
- Ensure imports, environment variables, and types are fully specified.  
- Keep a single source of truth (constants, schema files) instead of inlining variants.  

---

## Step 4 — **Adjust for Drift**
- Compare against earlier instructions/docs.  
- If drift detected (naming, schema, contract): realign to canonical form.  
- Flag conflicts explicitly instead of silently “fixing.”  

---

## Step 5 — **Final Output Policy**
- Provide both the **diagnostic report** and the **corrected code**.  
- Clearly separate them (`### Diagnostic Report` / `### Corrected Code`).  
- Never emit “semi-working” fragments. If incomplete, mark `[INCOMPLETE]` and explain what’s missing.  
- Do not paraphrase critical instructions, data models, or configs—always restate in full.  

---

## Step 6 — **Continuous Improvement**
- Each session: integrate lessons from prior diagnostics.  
- Add new checklist items when recurring issues appear.  
- Treat the diagnostic framework itself as code—refactor if weak.  

---

### 📌 Reminder
This framework is not optional.  
**Always investigate → diagnose → fortify → correct → output.**  
Skipping steps leads to unstable “Frankenstein” builds.  
