# Pravaah — Design Spec

*Status: built. This records the design decisions behind the prototype.*

## Goal

A genuinely novel, defensible, demo-able railway project for FAR AWAY 2026 (Railways theme) that
maps to a real, validated problem and survives technical scrutiny. Chosen after researching the
landscape: deployed traffic-management systems are proprietary and crores-scale; Indian Railways
dispatches **manually**; no India-specific open simulator exists; and "explainable AI controller"
is confirmed white space (only an aviation analog, CHATATC, exists). RL-for-dispatching was
explicitly avoided (Flatland showed OR beats RL; it is the trap that *sounds* novel but isn't).

## The wedge

Open + explainable + India-specific + real-time disruption recovery — a **stack** no one has
combined — fronted by a **glass-box** that justifies every dispatch decision in plain language.
Maps to Ministry of Railways SIH25022 ("maximising section throughput via AI traffic control").

## Architecture

Two separated layers, which is the load-bearing design idea:

1. **Interlocking (safety).** Enforces one-train-per-block, single-line direction-locks, and
   loop-refuge limits. Unsafe states are *impossible regardless of policy*. This is enforced in
   code, not by the AI — so the safety guarantee is honest and the FCFS baseline is equally safe.
2. **Dispatcher (policy).** Chooses the *order* among already-safe options.
   - `OPTIMIZER`: minimise Σ(added-delay × priority-weight) over feasible orderings with a short
     analytic look-ahead.
   - `FCFS`: serve by arrival, ignoring priority — the manual control-room status quo we benchmark.
   - Emits a structured **decision trace** (the orderings considered, each one's cost, the choice).

The **explanation engine** renders that trace as English, grounded only in the solver's own
numbers — never invented. A deterministic, offline **copilot** answers free-text questions from the
same trace, so the demo never depends on a network call.

## Simulation

Deterministic, tick-based, pure TypeScript. Trains advance along a block-sectioned corridor with
explicit per-train block ownership (never re-derived from floating-point position — a bug we hit
and fixed). Single-line sections are one absolute-block unit (one train, either direction) between
loop-equipped crossing stations, which is both realistic and deadlock-resistant.

## Corridor

A representative congested section modelled on the real **Kharagpur–Bhadrak** (Bahanaga
Bazar / Balasore) stretch — real station names and coordinates; representative track layout.

## Scenarios

- **Peak-Hour Crossings** — eight trains, three single-line sections; the throughput story.
- **Disruption Recovery** — a section fails mid-run; the dispatcher re-plans.
- **Balasore: The Safety Hold** — a route mis-set toward an occupied line; the interlocking refuses.

## Verification

12 Vitest tests assert: no two trains ever share a block; no single-line head-on; every train
completes (no deadlock) under both policies and through a section failure; optimizer weighted delay
< FCFS; the safety floor refuses the unsafe admission; the dispatcher prioritises a Superfast over an
earlier goods; the glass box produces grounded rationale. Result: optimizer cuts weighted delay ~20%.

## Honest scope

Decision-support / planning / simulation — complementary to Kavach, not certified train control.
Novelty is the stack (open + explainable + India + real-time recovery), not the underlying OR.
