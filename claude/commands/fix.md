---
description: Fix a field bug evidence-first — forensics, probes, minimized red test, injection-validated fix.
---
Fix the reported bug end to end. Never advance on reasoning alone. Log every probe: hypothesis → prediction → observation → conclusion; observations are raw facts, never interpretations; don't revisit refuted hypotheses. 5+ failed fixes = STOP, likely architecture — report and discuss.
1. Forensics before hypotheses: logs/live state, when it started (bisect), diff against a similar working path. Same symptom ≠ same cause.
2. Settle semantics with throwaway probes, not reasoning (mandatory after 2 wrong guesses). One variable per probe; undo what didn't match prediction.
3. Red test with real functions; minimize the trigger until nothing removable. Unexpectedly green = wrong trigger, not wrong assertion.
4. Remove the fragile assumption, don't patch the formula; gate the unfixable by capability/version.
5. Inject the bug back (file replacement, not `git checkout`) — tests must go red; with the fix, earlier probes must all flip.
6. Report root cause + evidence chain.
