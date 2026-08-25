# Skylark Drones — Monday.com Business Intelligence Agent

> **A production-ready conversational Business Intelligence Agent that answers founder-level questions using live, dynamic data from Monday.com boards (Deals & Work Orders), powered by Next.js 14, TypeScript, and Google Gemini.**

---

## 🌟 Key Highlights

* **100% Live Monday.com Integration**: Reads data dynamically via Monday.com GraphQL API v2 with cursor pagination. **Zero hardcoded CSV/Excel data**.
* **Strictly Read-Only & Secure**: Never executes mutations or updates to Monday.com. Secrets remain strictly on the server side.
* **Messy Data Resilience**: Heuristic column mapping automatically adapts to custom board column titles, normalizes sector aliases (`"Renewables"`, `"Power"` $\rightarrow$ `"Energy"`), cleans messy currency representations (`"₹ 1,50,000"`, `"1.5M"`, `"50k"`), and standardizes inconsistent date formats.
* **Transparent Data Quality Auditing**: Calculates a live **Data Health Score (0–100%)** and explicitly discloses missing values or unparseable fields in executive answers (e.g., *"Pipeline value excludes 3 deals with missing values"*).
* **Founder-Ready Intelligence & Leadership Update**: Delivers strategic executive summaries, key financial figures, operational delay tracking, and full leadership update briefings ready for board review.
* **High-Performance Executive Dashboard**: Dark glassmorphic UI with KPI cards, multi-dimensional filters, deep BI breakdown tabs, and interactive chat chips.

---

## 🏗️ Architecture

```
+-------------------------------------------------------------------------------+
|                             Next.js 14+ App Router                            |
|                                                                               |
|  +-------------------------------------------------------------------------+  |
|  |              Executive UI (Tailored Dark/Glassmorphic Theme)            |  |
|  |  * Chat Interface & Message Bubbles (Direct answers, Key metrics, etc.)  |  |
|  |  * Founder Example Query Chips (Pipeline, Energy, Delayed, Update)      |  |
|  |  * Dynamic Status Bar (Live Board Connection, Sync Status, Data Health)  |  |
|  |  * Data Quality Drawer (Column Mappings, Quality Caveats, Null Audits) |  |
|  +-------------------------------------------------------------------------+  |
|                                     │                                         |
|                                     ▼                                         |
|  +-------------------------------------------------------------------------+  |
|  |                             API Layer                                   |  |
|  |  * POST /api/chat   -> Handles conversational Q&A + BI metrics + LLM    |  |
|  |  * GET  /api/monday -> Diagnostic & connection status / column metadata |  |
|  +-------------------------------------------------------------------------+  |
|                                     │                                         |
|         ┌───────────────────────────┴───────────────────────────┐             |
|         ▼                                                       ▼             |
|  +──────────────────────────────+            +─────────────────────────────+  |
|  |   Monday.com GraphQL Client  |            |   AI Reasoning Agent        |  |
|  |   (lib/monday.ts)            |            |   (lib/ai.ts - Gemini)      |  |
|  |   - Read-only queries        |            |   - Founder Persona         |  |
|  |   - Cursor pagination        |            |   - Zero-hallucination      |  |
|  |   - Column metadata parsing  |            |   - Data caveat disclosure  |  |
|  |   - Resilient retry/cache    |            |   - Leadership update gen   |  |
|  +──────────────────────────────+            +─────────────────────────────+  |
|                 │                                           ▲                 |
|                 ▼                                           │                 |
|  +──────────────────────────────+            +──────────────┴──────────────+  |
|  |  Data Normalization Layer    |            |   Business Intelligence     |  |
|  |  (lib/normalization.ts)      | ─────────> |   Analytics Engine          |  |
|  |  - Heuristic column detector |            |   (lib/analytics.ts)        |  |
|  |  - Sector alias mapping      |            |   - Pipeline aggregations   |  |
|  |  - Currency & number parsing |            |   - Funnel & status metrics |  |
|  |  - Date standardizer         |            |   - Delayed project audit   |  |
|  |  - Data Quality auditor      |            |   - Cross-board comparison  |  |
|  +──────────────────────────────+            +─────────────────────────────+  |
+-------------------------------------------------------------------------------+
```

---

## 🚀 Quick Start

### 1. Clone & Install Dependencies

```bash
git clone <repo-url>
cd full_stack
npm install
```

### 2. Configure Environment Variables

Create `.env.local` in the root directory (or copy `.env.example`):

```bash
cp .env.example .env.local
```

Populate the required secrets:

```env
# Monday.com API Token (Required)
MONDAY_API_TOKEN=your_monday_personal_access_token

# Monday.com Deals Board ID (Required)
DEALS_BOARD_ID=1234567890

# Monday.com Work Orders Board ID (Optional but recommended)
WORK_ORDERS_BOARD_ID=9876543210

# Google Gemini API Key (Required for AI responses)
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 How to Obtain Credentials & Setup Monday.com

### 1. Monday.com API Token
1. Log in to your [Monday.com](https://monday.com) account.
2. Click your **Profile Picture / Avatar** in the bottom-left corner $\rightarrow$ select **Developers**.
3. Under the **Developer** section, select **My Access Tokens**.
4. Copy your personal API token and paste it as `MONDAY_API_TOKEN`.

### 2. Monday.com Board IDs
1. Navigate to your board in Monday.com (e.g. *Deals* or *Work Orders*).
2. Check your browser address bar:
   `https://<your-workspace>.monday.com/boards/1234567890`
3. The number (`1234567890`) is your **Board ID**.
4. Set `DEALS_BOARD_ID=1234567890`.

### 3. Google Gemini API Key
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Create an API key and paste it as `GEMINI_API_KEY`.

---

## 🛡️ How Messy Real-World Data is Handled

Business boards imported from Excel/CSV typically contain messy formatting and custom column naming. The agent handles this through multi-tiered normalization:

| Challenge | Normalization Strategy (`lib/normalization.ts`) |
| :--- | :--- |
| **Different Column Names** | Uses regex heuristics to map synonyms (e.g., `Deal Value (INR)`, `Amount`, `Size` $\rightarrow$ `dealValue`). |
| **Messy Currency Strings** | Strips symbols (`₹`, `$`, commas, whitespace) and resolves units (`Cr`, `Lakh`, `k`, `M`). Returns `null` if unparseable without guessing. |
| **Inconsistent Sector Names** | Normalizes case and aliases (`"power"`, `"renewables"`, `"oil & gas"` $\rightarrow$ `"Energy"`; `"civil infra"`, `"roads"` $\rightarrow$ `"Infrastructure"`). |
| **Diverse Date Formats** | Parses Excel serial timestamps (`45230`), `DD/MM/YYYY`, `YYYY-MM-DD`, and natural strings without inventing dates. |
| **Data Quality Transparency** | Tracks counts of missing values, unparseable fields, and unassigned categories. Injects strict disclosure caveats into the AI system prompt. |

---

## 💡 Example Founder Questions Answered

* 📈 *"How is our pipeline looking?"*
* ⚡ *"How is the Energy sector performing?"*
* 🏆 *"Which sectors have the strongest pipeline?"*
* ⚠️ *"Which projects are delayed?"*
* 🔄 *"Compare Energy deals with Energy work orders."*
* 🎯 *"Prepare a leadership update."*

---

## 📦 Deployment (Vercel)

1. Push code to GitHub.
2. Import repository into [Vercel](https://vercel.com).
3. Under **Project Settings $\rightarrow$ Environment Variables**, configure:
   * `MONDAY_API_TOKEN`
   * `DEALS_BOARD_ID`
   * `WORK_ORDERS_BOARD_ID`
   * `GEMINI_API_KEY`
4. Click **Deploy**.
