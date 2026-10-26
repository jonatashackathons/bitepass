Here is the complete, categorized breakdown of all **User Experience (UX) features** for the **Bypass.ai** (or **BitePass**) application, detailed across both the **Consumer Mobile View** and the **Judge / Merchant Split Console**:

---

### 1. Consumer Ambient & Lock Screen UX (Zero-Friction Client)

* **Ambient Context Push Card (Lock Screen Simulation)**
* **Visual Design:** Floating glassmorphic card with dark mode styling (`backdrop-blur-md bg-zinc-900/80 border border-zinc-800`).
* **Dynamic Value Badge:** High-visibility micro-pill at the top highlighting immediate utility (e.g., `⚡ 18 MINS SAVED | 35M MEETING GAP DETECTED`).
* **Smart Reasoning Copy:** Explains *why* the agent is suggesting this specific meal at this specific time (e.g., *"Matches your lunch window before your 1:30 PM standup. 8m walking buffer."*).
* **Default "Meal Twin" Showcase:** Displays the user's pre-saved go-to item, venue name, and complete price without requiring menu browsing.


* **Single-Tap Autonomous Checkout CTA**
* **Branded PayPal Action Button:** Prominent high-contrast PayPal button (`[ ⚡ 1-Tap Bypass with PayPal ]`).
* **Micro-Spinner Feedback:** Instant micro-interaction state change upon tap (`Authorizing $14.50...`), confirming the payment hold without opening a multi-step checkout modal.
* **Zero-Form Execution:** Bypasses card input forms, delivery address selectors, and cart confirmations by leveraging stored user preferences and the PayPal Sandbox Auth flow.


* **Post-Authorization "Live Route" & Ticket Card**
* **Kitchen State Tracker:** Transitions seamlessly from the push card into an active prep card (`"Order Fired to Kitchen. Pickup Cubby #3. Arrive in 6 mins."`).
* **Dynamic Prep Countdown:** Real-time countdown timer reflecting kitchen assembly time synchronized with walking distance.
* **Zero-Stop Handoff Pass:** Displays order number, pickup bay/cubby tag, and visual verification code for grab-and-go or fast-track bay seating.


* **Proximity Handoff & Doorstep Settlement State**
* **Geofence Arrival Indicator:** Visual confirmation when crossing the geofence perimeter (e.g., `< 50m` distance).
* **Auto-Settlement Banner:** Flashes emerald green (`✓ Verified at Doorstep. Captured via PayPal.`) showing funds moving from authorization hold to final captured settlement.


* **One-Tap Micro-Adjust & Dispute Features (Guardrails UX)**
* **Expandable "Quick Tweak" Drawer:** A 3-second collapsible drawer on the push card for emergency diet adjustments (e.g., swap dressing or drink) before hitting authorize.
* **Instant Autonomous Refund Action:** A 1-click `"Report Issue / Wrong Item"` button on the active pass that triggers a pre-authorized escrow refund token for quick resolution.



---

### 2. Dual-Viewport Judge & Simulation Console UX

* **Dual-Screen Split-View Canvas**
* **Left Pane (Mobile Device Frame):** An interactive, photorealistic iPhone hardware mockup displaying the live consumer PWA experience.
* **Right Pane (Control Room & Merchant Terminal):** Houses the real-time simulation controls and kitchen queue for end-to-end hackathon judge evaluation.


* **Interactive "Judge Scenario Controller" (Top Right Pane)**
* **Schedule Slider:** Simulates user calendar states in real time:
* *Short Gap:* Slide to `10m` $\to$ Agent stays silent (respects quiet hours).
* *Valid Window:* Slide to `35m–45m` $\to$ Agent triggers proactive push card.


* **Distance / Walking Slider:** Simulates user distance to the dining strip:
* *Far Range:* Slide to `600m` $\to$ Out of range (no notification).
* *Approaching:* Slide to `250m` $\to$ Triggers recommendation.
* *Doorstep:* Slide to `< 50m` $\to$ Triggers proximity capture.


* **Dietary & Preference Toggles:** Instant chips for `Gluten-Free`, `Vegan`, and `Omnivore` that dynamically force Gemini 1.5 Flash to re-reason and swap catalog items.
* **Instant Trigger CTA:** A dedicated `[ Simulate 12:15 PM Walk ]` button that injects sample context and fires the agentic engine on demand.



---

### 3. Merchant Kitchen & Operations UX (AG Grid Dashboard)

* **Real-Time Fast-Track Queue (`/merchant` or Bottom Right Pane)**
* **AG Grid Data Table:** Enterprise-grade grid displaying live order data with column sorting and filtering.
* **Live Order Columns:**
* `Order #`: Incremental ticket identifier.
* `Customer Name`: Matched user profile name.
* `Go-To Item & Modifications`: Structured meal selection.
* `ETA / Walking Buffer`: Live countdown of customer proximity.
* `Payment Lifecycle Status`: Reactive badges updating through `PROPOSED` $\to$ `AUTHORIZED` $\to$ `CAPTURED`.
* `Fulfillment Station`: Fast-Track Bay # or Pickup Cubby #.


* **Dynamic Row State Animations:** Rows flash amber during kitchen prep and turn green (`SETTLED`) the moment the customer crosses the doorstep and funds capture.


* **FastPass Bay Capacity Indicator**
* Real-time visual counter showing reserved vs. open fast-track bays/cubbies (e.g., `2 / 2 Bays Active - Auto-routing next orders to Grab-and-Go packaging`).