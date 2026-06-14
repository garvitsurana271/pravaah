# Pravaah: pitch and hard-question prep

This is for you, not the judges. The app gets you into the room. This is what wins the room. Read it until you can say it in your own words without looking.

## The 20-second version

Indian Railways still decides which train waits at every crossing by hand. The software in the control room only draws charts. We built the missing piece: an AI that makes that call, cuts delay about 20 percent, explains every decision in plain language, and physically cannot cause a collision. It runs on real stations and real trains, and it maps to the Ministry's own problem statement, SIH25022.

## Why this, and not the obvious thing

Most teams typed "railway safety AI" into a tool and got back a crack-detection model or a complaint chatbot. We did not, on purpose, and being able to say why is the whole point.

- We did not build another anti-collision camera model. Kavach already does collision protection, and the real, daily, unsolved problem is who-goes-first, which is still done by hand.
- We did not use reinforcement learning, even though it sounds impressive. The Flatland challenge (run by SBB, DB and SNCF) showed classical optimization beats RL at this, and no RL dispatcher has ever been deployed. If we had used RL, a judge who knows the field would mark us down. Choosing not to is the more sophisticated answer.
- We did not claim a live data feed, because there isn't one. Pretending otherwise is the kind of misrepresentation that gets teams disqualified.

So our edge is not "we used AI." Everyone used AI. Our edge is the judgment: the right problem, the right method, and the honesty about what is real.

## The three things that make this not another AI project

1. **Depth that survives you poking at it.** It has a tested simulation engine, a safety invariant proven by 12 tests, and a measured result. Most AI submissions are a nice screen over nothing and fall apart the moment you ask a hard question.
2. **A point of view.** We can defend every choice: why this problem, why this method, why not the obvious alternatives.
3. **Honesty.** We state plainly what is real (stations, trains, the incident) and what is simulated (live movement), and that it is decision-support, not certified control. Judges trust that.

## Hard questions, and how to answer them

**"Is this just a ChatGPT wrapper?"**
No. The reasoning is a deterministic explanation engine, not a language model. The brain is an operations-research optimizer that minimises priority-weighted delay. The explanation text is built from that optimizer's actual numbers, so it cannot hallucinate. There is no API key and no network call. We could add an LLM for free-form phrasing, but the grounding is the point.

**"How is this different from Kavach?"**
Kavach is the safety-certified layer that stops collisions and over-speeding. It does not decide which train goes first. Pravaah is the throughput and explainability layer above it. They are complementary. Pravaah never overrides safety, in our model the interlocking refuses unsafe moves regardless of what the AI wants.

**"Did you train a reinforcement learning agent?"**
No, deliberately. The published benchmark (Flatland) shows classical optimization beats RL on this problem, and RL dispatching has never reached production. We used an operations-research heuristic with look-ahead, which is what actually works.

**"Does it use real data, or is it fake?"**
The 8,697 stations and their coordinates are real, from the open datameet dataset. The trains are real services that run this corridor, from the open timetable. The live movement is a simulation, because Indian Railways has no open real-time position feed. A simulation is also the only way to re-stage the exact 2023 failure and run a fair AI-versus-manual comparison. The engine is built to take a real feed when one is available.

**"Is your optimizer actually optimal?"**
It is a heuristic with a short look-ahead, not a global optimum, and we do not claim otherwise. It beats the manual baseline by about 20 percent, which is the honest, measured result. The clean next step is a constraint solver (CP-SAT or MILP) for provably-optimal small instances, which the architecture already allows.

**"How do you know it is safe?"**
Safety is enforced in a separate interlocking layer, not by the AI. One train per block, single lines locked to one direction. It is proven by tests that run the whole simulation and check that no two trains ever share a block and no head-on ever happens, under both the AI and the manual policy.

**"Traffic-management systems already exist. What is new?"**
They exist as closed systems costing over a thousand crore, and they are mostly advisory because controllers do not trust a black box. Nothing open, India-specific, explainable, and built for real-time recovery exists. The explainability angle has only ever been done in aviation research, not rail. That combination is the new part.

**"Will it scale beyond eight trains?"**
The model is block-section based, which is how real signalling scales. We demo with eight for clarity, but the engine handles more. Scaling to a full multi-corridor network with real topology is the roadmap.

**"Isn't it just a simulation?"**
Yes, and that is the correct tool for this. Every academic paper on dispatching simulates the operational layer for the same reason. It lets us prove the safety invariant, stage the exact Balasore failure, and compare policies fairly, none of which a live feed could do.

## If you only remember one line

"Everyone here used AI to build something. The question is whether you picked the right problem, used the right method, and were honest about what is real. We can defend all three."
