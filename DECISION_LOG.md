# Skylark Drones — Monday.com BI Agent: Decision Log

**Author:** Technical Engineering & Architecture  
**Role:** AI & Full-Stack Systems Lead  
**Scope:** Monday.com Live GraphQL Integration, Data Resilience, Analytics Engine, Gemini AI Reasoning  

---

## 1. Key Architectural & System Assumptions

1. **Board Schema Variability & Dynamic Resolution:**
   * *Assumption:* The imported Monday.com boards (Deals & Work Orders) may use custom or varied column headers (e.g., `Sector/service`, `Deal Value (INR)`, `Closing Date`, `Stage`, `Owner code`, `Priority`).
   * *Design Decision:* Implemented a multi-pass regex heuristic column mapper in `lib/normalization.ts`. It maps columns dynamically at runtime based on fuzzy aliases rather than hardcoding column IDs or static titles.

2. **Data Cleanliness & Non-Invention Policy:**
   * *Assumption:* Real business data contains omissions, unparseable currencies, unassigned sectors, or missing deadlines.
   * *Design Decision:* Adopted a strict **"Never Fabricate Missing Data"** principle. Missing numeric values are marked `null`, and unparseable dates retain their raw string without guessing. Every omission is indexed into a live **Data Quality Report** and surfaced with exact counts to the LLM and founder UI.

3. **Read-Only Integration:**
   * *Assumption:* Monday.com is an executive system of record and must not be mutated by analytical queries.
   * *Design Decision:* Strictly read-only GraphQL queries (`boards { items_page { items { ... } } }`). No mutation operations or write tokens are exposed.

4. **Multi-Source Cross-Board Correlation:**
   * *Assumption:* Business value comes from bridging the sales funnel (Deals) with project execution reality (Work Orders).
   * *Design Decision:* The normalization and analytics layers join both boards across sector and client dimensions to calculate Funnel vs Execution load and delivery risk.

---

## 2. Trade-Offs Chosen & Justification

| Architectural Decision | Chosen Alternative | Trade-Off & Rationale |
| :--- | :--- | :--- |
| **Data Retrieval Mode** | Direct Server-Side Monday.com GraphQL API | Chosen over MCP / middleware to eliminate extra moving parts and allow immediate zero-configuration serverless deployment on Vercel. |
| **LLM Provider** | Google Gemini 1.5 (`@google/generative-ai`) | Chosen for high-throughput reasoning, large context window (capable of absorbing the entire board snapshot), and fast latency at low temperature ($T=0.2$) for zero-hallucination. |
| **Caching Strategy** | In-Memory TTL Cache (60s) with On-Demand Force Refresh | Eliminates Monday GraphQL complexity rate limits while preserving instant live data updates via the UI refresh button. |
| **Fallback Engine** | Hybrid AI + Deterministic BI fallback | If an API key is missing or quota is exhausted, a deterministic analytics engine generates structured executive insights without failing the user. |
| **Styling Framework** | Vanilla CSS + Tailored Glassmorphism | Avoids Tailwind compilation mismatches; offers clean custom executive aesthetics and responsive layout. |

---

## 3. Interpretation of "Leadership Updates"

The requirement asks for preparing data for leadership updates. This was interpreted and implemented across four dimensions:

1. **Executive Headline & High-Impact Summary:**
   * Distills overall pipeline volume, closed revenue, win rate percentages, and active backlog into a 3-second founder takeaway.
2. **Sectoral Traction:**
   * Identifies the primary growth engines (e.g. Energy, Infrastructure) comparing deal values against operational delivery capacity.
3. **Operational Risks & Delivery Blockers:**
   * Explicitly surfaces overdue deals and delayed work orders (with value-at-risk calculations) to allow leadership to intervene immediately.
4. **Data Quality Governance:**
   * Transparently informs the board of any incomplete records so strategic decisions are never based on unrecognized blind spots.

---

## 4. What We Would Do Differently with More Time

1. **Incremental Webhook Invalidation:**
   * Implement Monday.com webhook endpoints (`/api/webhooks/monday`) to invalidate cache in real-time on item update.
2. **Interactive Charting & Visual Graphs:**
   * Add interactive Recharts/Chart.js visual waterfall graphs for sales stage conversion velocity.
3. **Conversational Drill-Down & Export:**
   * One-click export of Leadership Updates to PDF or Slack/Notion executive channels.
4. **Semantic Embedding Cache:**
   * Index board records into vector storage for semantic retrieval across hundreds of boards.
