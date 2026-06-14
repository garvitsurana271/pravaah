# Pravaah — Demo Script, Pitch Deck & Team Split

Everything you need to record the video, build the deck, and submit. Read top to bottom.

---

## 0. Run it (for the demo)

```bash
npm install
npm run dev      # → http://localhost:5173  (already running if you didn't close it)
```

100% offline once loaded — no internet needed while recording. Record at **1× or 2×** speed for clarity; use **4×** only to fast-forward between beats.

---

## 1. The 3-minute video script (Option 2 submission)

Judges decide in the first 20 seconds. Open on the product, not a title card.

**[0:00–0:25] The hook — screen recording already running, Peak-Hour Crossings loaded, paused.**
> "On 2 June 2023, a mis-wired signal sent the Coromandel Express onto an occupied line near Balasore. Nearly 300 people died. But here's the quieter problem: Indian Railways still dispatches every train *by hand*. This is Pravaah — the AI co-pilot for the section controller. And unlike a black box, it shows you *why*."

**[0:25–1:05] Throughput — press Run.**
> "Eight real trains, both directions, three single-line sections. Watch the optimizer resolve every crossing." — Let it run ~15s. Point at a HEAD-ON conflict tag appearing, then resolving.
> Now hit the **AI OPTIMIZER → FCFS** toggle. "This is how it's done today — first come, first served." Point at the weighted-delay bars: FCFS is higher.
> Toggle back. "Priority-aware dispatch — 20% less weighted delay. Same trains, but the Superfasts are protected."

**[1:05–1:45] The glass box — click a held train, then the copilot.**
> "Why did it hold this train?" — Read the decision card aloud: *"Held 18045, Express, ×3, so the Superfast could cross — reversing the order would cost 1.7× more."*
> Type in the copilot: **"what if I override?"** — read the answer. "It's decision-support. The controller stays in command; the machine just shows the cost."

**[1:45–2:30] The safety floor — switch to "Balasore: The Safety Hold", press Run.**
> "Now we re-stage the 2023 failure: a route mis-set toward an occupied line." — Wait ~3s for the red refusal.
> "The interlocking *refuses* the admission. No two trains can ever share a block — and no AI policy can override that. A collision, blocked before anyone even decided." Point at the **Unsafe Admissions: 1** counter.

**[2:30–3:00] Close.**
> "Pravaah maps to the Ministry of Railways' own flagship problem, SIH25022. It's open-source, runs in any browser, and it's complementary to Kavach — the safety layer below, the throughput-and-explainability layer above. The next Balasore shouldn't depend on one tired controller's memory. GitHub link below."

---

## 2. Presentation deck (Option 1 — max 15 slides, if you choose slides over video)

Keep it visual, demo screenshots throughout. Suggested structure:

1. **Title** — Pravaah · The Glass-Box Dispatcher. One line + your names + team.
2. **The tragedy** — Balasore 2023, the photo/stat. "~300 dead. Signalling failure. No Kavach."
3. **The daily problem** — IR dispatches manually; punctuality 94%→73.6%; 80% of corridors over capacity.
4. **The gap** — proprietary ₹1000cr black boxes vs. *nothing* open/explainable for India. (This is your novelty slide.)
5. **What Pravaah is** — one screenshot of the control room + one sentence.
6. **Live throughput** — the A/B: optimizer vs FCFS, –20% weighted delay. Screenshot of the KPI bars.
7. **The glass box** — the decision card screenshot. "It explains every call in plain language."
8. **The copilot** — screenshot of the Q&A. "Ask it anything — offline."
9. **Safety floor** — the Balasore refusal screenshot. "Unsafe states are impossible by construction."
10. **How it works** — the two-layer architecture diagram (in the README).
11. **Maps to SIH25022** — quote the Ministry's problem statement; "we built their flagship."
12. **Tech + rigor** — React/TS, 12 passing tests, the safety invariants, open data.
13. **Honest scope** — complementary to Kavach; decision-support, not certified control. (Judges respect this.)
14. **Roadmap** — real OSM topology, CP-SAT solver, eco-driving, override-and-learn.
15. **Close + GitHub** — the one-line ask.

Map every slide to a judging criterion: Innovation (4), Engineering (10,12), Real-World Impact (2,3,11), Scalability (10,14), Design/UX (5–9), Execution (6–9,12).

---

## 3. Team split (you + 2)

You're doing the core, so hand these off so they're not idle:

- **Teammate A — Deck + visuals.** Build the 15-slide deck from §2 using the screenshots in `docs/screenshots/`. Make slide 4 (the gap) and slide 9 (safety) the strongest. Export a clean PDF.
- **Teammate B — Video + README polish.** Screen-record the §1 script (OBS / built-in recorder), add a calm voiceover, keep it ≤3 min. Proofread the README, confirm `npm install && npm run dev` works on a *clean* machine, and add your three names to the README + deck.
- **You — submission + Q&A prep.** Final code, push to GitHub, fill the submission form, and rehearse answers to: *"How is this different from Kavach?"* (safety vs throughput layer) and *"Did you train an RL agent?"* (no — OR optimizer + interlocking, deliberately, because RL-for-dispatching is unproven; Flatland showed OR wins).

---

## 4. Submit (GitHub — mandatory)

The repo is ready. Commit and push **with your own identity** (do not let any tool co-author it):

```bash
git init
git add -A
git commit -m "Pravaah — the glass-box dispatcher for Indian Railways"
git branch -M main
git remote add origin https://github.com/<your-username>/pravaah.git
git push -u origin main
```

Then put the repo link **and** your video/deck link in the FAR AWAY submission form. Optionally
`npm run build` and drop `dist/` on GitHub Pages so judges get a *live* URL — extra credit.

---

## 5. Don't oversell (it protects you in Q&A)

- ✅ "First open, explainable, India-specific real-time re-dispatch tool." "Maps to SIH25022." "Complementary to Kavach." "20% less weighted delay, measured."
- ❌ Don't claim you invented dispatching/conflict-resolution (20-yr-old OR — your novelty is the *stack*). Don't call it certified train control. Don't conflate it with Kavach.
