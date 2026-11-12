Here is the complete Agile specification for **BitePass**, structured according to **Mike Cohn’s user story best practices**, tested against the **INVEST** criteria, split into discrete technical tasks using the **SPIDR** method, and strictly prioritized via **MoSCoW + YAGNI** for the PayPal AI Hackathon build.

---

### Executive Overview & MoSCoW Prioritization Matrix

To ship a hackathon winner within the remaining runway, YAGNI dictates cutting long-tail edge cases and non-critical infra (e.g., real native GPS daemons, full multi-tenant auth, complex refund flows).

* **Must Have (M):** The core loop required to win *Best Use of Agentic Commerce* and *PayPal + AI*:
* `US-01`: Context-triggered proactive meal recommendation via LLM tool calling.
* `US-02`: One-tap PayPal authorization (escrow hold).
* `US-03`: Proximity doorstep capture (funds settlement).
* `US-04`: Interactive simulation control bar for hackathon judges.


* **Should Have (S):** Multiplier for the $5,000 AG Grid and $1,000 Render sponsor tracks:
* `US-05`: Real-time merchant queue dashboard powered by AG Grid.
* `US-06`: In-memory kitchen capacity and bay assignment.


* **Could Have (C):** High-touch polish if time permits before Day 16:
* `US-07`: 3-second quick tweak drawer for minor order modifications.
* `US-08`: One-click autonomous escrow cancellation / refund token.


* **Won't Have / YAGNI Cut (W):**
* Native iOS/Android app store builds, live background GPS polling, multi-merchant POS onboarding APIs, user password reset/login flows, credit card form validation.



---

### Epic 1: Autonomous Agent Reasoning & Proactive UX

#### US-01: Proactive Context-Aware Meal Card

* **Priority:** `MUST HAVE`
* **Story:**
> **As a** time-constrained office worker,
> **I want** the agent to evaluate my schedule window and distance to proactively suggest my go-to lunch before I open an app,
> **So that** I don't waste 15 minutes browsing menus or waiting in line during my lunch break.


* **INVEST Quality Gate:**
* **I (Independent):** Evaluates isolated input context against a mock menu catalog.
* **N (Negotiable):** Prompt phrasing and exact badge layout can adjust during design polish.
* **V (Valuable):** Core showcase of agentic initiative over reactive ordering.
* **E (Estimable):** Well-defined LLM structured output schema.
* **S (Small):** Scoped strictly to 1 prompt route and 1 glassmorphic UI card.
* **T (Testable):** Verified by injecting `{ freeMinutes: 35, distanceMeters: 200 }` and confirming the JSON response.


* **Acceptance Criteria (Given-When-Then):**
* **Scenario 1: Sufficient gap and valid distance**
* *Given* the simulated calendar gap is $\ge 30$ minutes and distance is $\le 500$ meters,
* *When* the agent context engine executes,
* *Then* it returns a matched item from the catalog along with a 1-sentence contextual justification,
* *And* the phone viewport renders the ambient push card with price, item name, and estimated time saved.


* **Scenario 2: Insufficient calendar gap (Quiet Hours guardrail)**
* *Given* the simulated calendar gap is $< 30$ minutes,
* *When* the context engine runs,
* *Then* `shouldTrigger` returns `false` and the phone screen remains in its ambient idle state.




* **SPIDR Task Breakdown:**
* **I - Interface:** Build `components/LockScreenCard.tsx` with glassmorphic dark-mode Tailwind styling and time-saved pill badge.
* **R - Rules:** Implement Gemini 1.5 Flash structured output schema (`Type.OBJECT` enforcing `shouldTrigger`, `itemId`, `reason`).
* **D - Data:** Create static `lib/mock-db.ts` with 4 menu items, deterministic prep times, and fixed prices to prevent pricing hallucinations.



---

### Epic 2: The Two-Phase PayPal Agentic Commerce Engine

#### US-02: One-Tap Escrow Authorization Hold

* **Priority:** `MUST HAVE`
* **Story:**
> **As a** hungry consumer on the go,
> **I want** to confirm my meal with a single tap using PayPal's pre-authorized hold,
> **So that** the kitchen starts preparing my food immediately without me filling out billing forms or manually checking out.


* **INVEST Quality Gate:**
* **I (Independent):** Consumes the catalog item and interfaces directly with the PayPal Sandbox.
* **N (Negotiable):** Button appearance (Smart Button iframe vs. custom styled button via token).
* **V (Valuable):** Critical prerequisite for the "Best Use of Agentic Commerce" award.
* **E (Estimable):** Standard PayPal Orders API v2 endpoint integration.
* **S (Small):** Single API endpoint and one UI state transition.
* **T (Testable):** Verified via PayPal Sandbox Dashboard showing order status `CREATED`/`APPROVED` with `intent: AUTHORIZE`.


* **Acceptance Criteria (Given-When-Then):**
* **Scenario 1: Successful 1-tap authorization**
* *Given* a proactive recommendation card is active on the screen,
* *When* the user taps `[ ⚡ Hold with PayPal ]`,
* *Then* the client sends a POST request to `/api/paypal/create` with the exact catalog amount,
* *And* the PayPal Orders API v2 creates an order with `intent: "AUTHORIZE"`,
* *And* the UI transitions to the active prep ticket with ETA countdown and cubby assignment within 1 second.




* **SPIDR Task Breakdown:**
* **I - Interface:** Build `lib/paypal-client.ts` OAuth token exchange and order creation methods.
* **P - Paths:** Handle happy-path authorization and display an inline error toast if sandbox credentials fail.
* **S - Spike:** Test and verify the sandbox Client ID and Secret in Postman to confirm order token generation.



---

#### US-03: Doorstep Proximity Settlement (Capture)

* **Priority:** `MUST HAVE`
* **Story:**
> **As a** diner arriving at the restaurant,
> **I want** the held funds to capture automatically the moment my proximity is verified at the door,
> **So that** I pick up my meal and walk away without ever pulling out a credit card or waiting for a terminal.


* **INVEST Quality Gate:**
* **I (Independent):** Dependent only on an existing `order_id` in `AUTHORIZED` state.
* **N (Negotiable):** Distance threshold (e.g., 50m vs. manual "Arrived" toggle).
* **V (Valuable):** Proves the 2-phase safety architecture that impresses fintech judges.
* **E (Estimable):** Single endpoint calling PayPal Authorizations Capture.
* **S (Small):** One backend route and a status banner state change.
* **T (Testable):** Verified via PayPal API returning `status: "COMPLETED"` and a valid `capture_id`.


* **Acceptance Criteria (Given-When-Then):**
* **Scenario 1: Geofence arrival triggers settlement**
* *Given* an active order with PayPal status `AUTHORIZED`,
* *When* the user's distance updates to $< 50$ meters,
* *Then* the client invokes `/api/paypal/capture` with the `order_id`,
* *And* the backend executes the authorization capture via PayPal API,
* *And* the mobile card turns emerald green displaying `✓ Verified at Doorstep. Captured via PayPal.`.




* **SPIDR Task Breakdown:**
* **I - Interface:** Build `/api/paypal/capture/route.ts` calling PayPal's `/v2/payments/authorizations/{id}/capture`.
* **R - Rules:** Enforce idempotency so rapid slider adjustments do not fire duplicate capture requests.



---

### Epic 3: Hackathon Evaluation & Merchant Infrastructure

#### US-04: Judge Scenario Simulation Console

* **Priority:** `MUST HAVE`
* **Story:**
> **As a** hackathon judge evaluating the project,
> **I want** interactive sliders to adjust calendar gap, walking distance, and dietary preferences on screen,
> **So that** I can stress-test edge cases without having to physically walk outside or sync a real calendar.


* **INVEST Quality Gate:**
* **I (Independent):** Controls the shared React state driving the mobile frame.
* **N (Negotiable):** Slider increments and preset scenario buttons.
* **V (Valuable):** Ensures judges can complete the demo in under 60 seconds without setup headaches.
* **E (Estimable):** Basic React state controls and range inputs.
* **S (Small):** 1 control component rendered alongside the phone mock.
* **T (Testable):** Dragging distance from 300m to 40m triggers the doorstep capture state.


* **Acceptance Criteria (Given-When-Then):**
* **Scenario 1: Dynamic context adjustment**
* *Given* the judge is viewing the root dashboard `/`,
* *When* the judge adjusts the "Meeting Gap" slider below 30 minutes,
* *Then* the agent card hides immediately;
* *When* moved above 30 minutes, the agent card queries Gemini and displays the matched meal.


* **Scenario 2: Preset demo button**
* *When* the judge clicks `[ Simulate 12:15 PM Walk ]`,
* *Then* the state sets to `{ gap: 40m, dist: 200m, dietary: "Omnivore" }` and triggers the agent card automatically.




* **SPIDR Task Breakdown:**
* **I - Interface:** Build `components/SimulatorBar.tsx` using range sliders and Tailwind chip toggles.
* **D - Data:** Centralize context state in a lightweight React context or zustand store.



---

#### US-05: Real-Time Merchant Queue (AG Grid Track)

* **Priority:** `SHOULD HAVE` ($5,000 Sponsor Prize Multiplier)
* **Story:**
> **As a** fast-casual restaurant operator,
> **I want** to see incoming BitePass orders update in real time in a high-density AG Grid table,
> **So that** kitchen staff know what to assemble and see payments settle without handling a cash register.


* **INVEST Quality Gate:**
* **I (Independent):** Listens to order status transitions via simple React state or SSE.
* **N (Negotiable):** Number of columns shown (6 core columns vs. detailed breakdown).
* **V (Valuable):** Unlocks the $5,000 AG Grid Sponsor Prize and demonstrates the B2B merchant value loop.
* **E (Estimable):** Standard `ag-grid-react` package integration.
* **S (Small):** Contained in a single component on the right side of the split screen.
* **T (Testable):** Tapping "Authorize" on the phone shell creates a row; proximity capture updates that row to "SETTLED".


* **Acceptance Criteria (Given-When-Then):**
* **Scenario 1: Live status transition in AG Grid**
* *Given* the AG Grid component is mounted on the split dashboard,
* *When* an order is authorized via PayPal,
* *Then* a new row appears with badge `AUTHORIZED` and prep station `Cubby #3`;
* *When* doorstep capture executes,
* *Then* that row's status cell updates to `CAPTURED / SETTLED` and flashes green.




* **SPIDR Task Breakdown:**
* **I - Interface:** Install `ag-grid-community` & `ag-grid-react`, apply dark theme styling (`ag-theme-alpine-dark`).
* **R - Rules:** Create a custom cell renderer for payment badges (`PROPOSED` amber, `AUTHORIZED` blue, `CAPTURED` emerald).



---

#### US-06: Fast-Track Bay Assignment & Routing

* **Priority:** `SHOULD HAVE`
* **Story:**
> **As a** diner choosing to sit down,
> **I want** the system to assign me a designated Fast-Track high-top bay or auto-route to grab-and-go packaging if bays are full,
> **So that** I never experience table collisions or wait for seating during rush hour.


* **Acceptance Criteria (Given-When-Then):**
* *Given* the cafe has 2 active fast-track high-top bays,
* *When* an order is placed while a bay is free,
* *Then* the ticket assigns `Bay #1` or `Bay #2`;
* *When* both bays are occupied,
* *Then* the ticket auto-routes packaging to `Pickup Cubby #A (Grab & Go)`.


* **SPIDR Task Breakdown:**
* **R - Rules:** Simple modulo or counter in `lib/mock-db.ts` toggling station IDs.



---

### Epic 4: Guardrails & Edge Cases (YAGNI Controlled)

#### US-07: 3-Second Quick Tweak Drawer

* **Priority:** `COULD HAVE`
* **Story:**
> **As a** diner with changing preferences,
> **I want** an expandable tweak drawer on the recommendation card,
> **So that** I can swap a dressing or beverage before hitting authorize without browsing a full multi-page menu.


* **Acceptance Criteria (Given-When-Then):**
* *Given* the push card is rendered,
* *When* the user taps "Tweak",
* *Then* a minimal 2-option radio group slides open (e.g., *Chips* vs. *Side Salad*) and dynamically updates the order total before authorization.


* **SPIDR Task Breakdown:**
* **I - Interface:** Collapsible drawer using Tailwind transitions.



---

#### US-08: Autonomous Pre-Prep Escrow Cancellation

* **Priority:** `COULD HAVE`
* **Story:**
> **As a** user whose meeting was abruptly extended,
> **I want** to cancel my order within the 2-minute pre-prep grace period,
> **So that** my PayPal authorization is voided with zero financial penalty.


* **Acceptance Criteria (Given-When-Then):**
* *Given* an order is in `AUTHORIZED` status and $< 2$ minutes have elapsed,
* *When* the user taps `Cancel Order`,
* *Then* the backend invokes PayPal's `/v2/payments/authorizations/{id}/void`,
* *And* the mobile view resets to idle while the merchant AG Grid updates the row status to `VOIDED`.


* **SPIDR Task Breakdown:**
* **I - Interface:** Add `/api/paypal/void/route.ts` calling PayPal Void Authorization API.



---

### Sprint Execution Roadmap (Mapped to Hackathon Runway)

```
[Days 1–5: Sprint 1] ──> Build US-01 (Gemini structured tool route) & US-02 (PayPal sandbox authorization)
[Days 6–10: Sprint 2] ──> Build US-03 (Doorstep capture) & US-04 (Judge simulation bar & phone shell)
[Days 11–14: Sprint 3] ──> Build US-05 (AG Grid live queue) & US-06 (Bay assignment); deploy on Render
[Days 15–19: Sprint 4] ──> YAGNI Freeze: evaluate US-07/US-08 only if ahead; record 2.5-min demo video & submit

```