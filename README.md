<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:061B14,50:00B58B,100:083D2B&height=240&section=header&text=Stock%20Calling&fontSize=64&fontColor=FFFFFF&animation=fadeIn&fontAlignY=34&desc=Your%20portfolio.%20A%20voice.%20A%20heads-up%20when%20it%20matters.&descAlignY=55&descSize=17" width="100%" alt="Stock Calling — your portfolio, a voice, a heads-up when it matters"/>

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=20&duration=3000&pause=1000&color=00B58B&center=true&vCenter=true&width=850&lines=Buy+paper+shares.+Hear+what+matters.;Crash+or+gain+%E2%86%92+Real+AI+call+%E2%86%92+Telegram;Ask+questions.+Authorize+a+paper+sale+with+your+demo+PIN.;Built+by+Team+BB+for+ProdVerse+%7E+Tech+Unbound" alt="Paper portfolios, real AI phone calls and Telegram summaries" />

<br/>

![Demo](https://img.shields.io/badge/DEMO-END--TO--END%20TESTED-00B58B?style=for-the-badge&labelColor=111111)
![Voice](https://img.shields.io/badge/VOICE-REAL%20PHONE%20CALLS-00B58B?style=for-the-badge&labelColor=111111)
![Telegram](https://img.shields.io/badge/TELEGRAM-DELIVERY%20VERIFIED-00B58B?style=for-the-badge&labelColor=111111)

![Team](https://img.shields.io/badge/TEAM-BB-FFFFFF?style=for-the-badge&labelColor=087755)
![College](https://img.shields.io/badge/COLLEGE-VIPS--TC-FFFFFF?style=for-the-badge&labelColor=087755)
![Competition](https://img.shields.io/badge/PRODVERSE-TECH%20UNBOUND-FFFFFF?style=for-the-badge&labelColor=087755)

<br/>

![React](https://img.shields.io/badge/React-111111?style=flat-square&logo=react&logoColor=00B58B)
![TypeScript](https://img.shields.io/badge/TypeScript-111111?style=flat-square&logo=typescript&logoColor=00B58B)
![Node.js](https://img.shields.io/badge/Node.js_24-111111?style=flat-square&logo=nodedotjs&logoColor=00B58B)
![Express](https://img.shields.io/badge/Express_5-111111?style=flat-square&logo=express&logoColor=00B58B)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL_%2F_PGlite-111111?style=flat-square&logo=postgresql&logoColor=00B58B)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS_4-111111?style=flat-square&logo=tailwindcss&logoColor=00B58B)
![Vite](https://img.shields.io/badge/Vite-111111?style=flat-square&logo=vite&logoColor=00B58B)
![Telegram API](https://img.shields.io/badge/Telegram_Bot_API-111111?style=flat-square&logo=telegram&logoColor=00B58B)

<br/>

**[The idea](#-the-idea) · [Features](#-what-we-built) · [Demo flow](#-the-demo-journey) · [Architecture](#-how-it-works) · [Quick start](#-run-it-locally) · [Team BB](#-team-bb)**

</div>

---

<div align="center">
<table>
<tr>
<td align="center" width="26%"><img src="docs/assets/vips-tc.png" width="180" alt="VIPS-TC"/><br/><strong>VIPS-TC</strong></td>
<td align="center" width="74%"><img src="docs/assets/prodverse-tech-unbound.png" width="650" alt="ProdVerse ~ Tech Unbound — a product-based hackathon"/></td>
</tr>
</table>

### Built by Team BB for ProdVerse ~ Tech Unbound

**Tanish Aggarwal & Palak Gupta · VIPS-TC**
</div>

---

## 💡 The idea

A watchlist can show a number. A conversation can explain why it deserves your attention.

**Stock Calling** combines a dark Indian equities dashboard, a paper portfolio, company-impact research, real conversational AI phone calls and Telegram follow-ups. Buy paper shares, choose your alert thresholds, and try a crash or gain scenario. When the threshold is crossed, your actual phone rings. Ask questions naturally in English, Hindi or Hinglish; the conversation and its outcome are saved in the dashboard.

A demo sale can also happen through the conversation: ask to sell, provide your **demo PIN**, and the backend closes the paper holding after validating the actual transcript.

> **The boundary is clear:** market quotes come from a real provider; paper purchases and scenario price movements are demonstrations. Phone calls and Telegram deliveries use real provider APIs. There is no real-money brokerage trading.

## ✨ What we built

| Feature | What it does |
|---|---|
| 📈 **Indian market dashboard** | Genuine last-available quotes for 12 companies, NIFTY 50, SENSEX and BANK NIFTY, with quote timestamps and delay notices. |
| 🛒 **Paper portfolio** | Buy paper shares from a provider quote, maintain weighted average entry prices, and persist positions and order history. |
| 📉 **Crash & gain scenarios** | Set fall/gain thresholds and run controlled scenarios without changing the real market quote. |
| 📞 **Real AI phone calls** | OmniDimension dials the registered phone and explains the supplied alert context in a two-way conversation. |
| 🔐 **Voice-authorized paper sale** | Accept a sell offer or request a sale, give the demo PIN, and close the paper holding after the call. |
| ✈️ **Telegram follow-up** | Register a private bot chat and receive actual conversation summaries, source links, call outcomes and sale confirmations. |
| 🌱 **Company-impact intelligence** | Sourced disclosures, categories, verification labels and promise-versus-progress timelines. |
| 🔎 **Research discovery & review** | Discover recent news leads; human evidence review is required before a research lead becomes eligible for priority calls. |
| 🛡️ **Consent & call controls** | Registered-number consent, India quiet hours, a daily call limit and a minimum interval between attempts. |
| 🗂️ **Persistent history** | PostgreSQL-backed calls, transcripts, messages, paper orders, positions, alerts and sale records. |

## 🖥️ A look inside

<div align="center">
<img src="docs/screenshots/dashboard.jpg" width="100%" alt="Dark stock dashboard with company logos, genuine market quotes and company-impact updates"/>
<br/><br/>
<img src="docs/screenshots/portfolio.jpg" width="100%" alt="Paper portfolio with threshold alerts, paper purchase controls and sale history"/>
</div>

<sub>Screenshots are from the working local app. Market quotes are time-specific; portfolio scenario values are paper/demo values.</sub>

## 🎬 The demo journey

```mermaid
flowchart LR
    A[Buy paper shares] --> B[Set crash / gain thresholds]
    B --> C[Run a demo price scenario]
    C --> D{Threshold crossed?}
    D -- Yes --> E[Actual AI phone call]
    E --> F[Ask questions naturally]
    F --> G[Request a paper sale]
    G --> H[Give the demo PIN]
    H --> I[Validate transcript after call]
    I --> J[Close paper holding]
    F --> K[Telegram conversation summary]
    J --> L[Telegram sale confirmation]
    D -- No --> M[Update paper portfolio only]

    style A fill:#183a2c,color:#fff,stroke:#00b58b
    style E fill:#008a68,color:#fff,stroke:#00b58b
    style H fill:#263d32,color:#fff,stroke:#00b58b
    style J fill:#008a68,color:#fff,stroke:#00b58b
    style K fill:#183a2c,color:#fff,stroke:#00b58b
    style L fill:#183a2c,color:#fff,stroke:#00b58b
```

**Example conversation**

> **AI:** “In your demo portfolio, Tata Motors has moved beyond your alert threshold. Would you like me to explain the numbers?”<br/>
> **You:** “Sell my holding.”<br/>
> **AI:** “Please tell me your four-digit demo PIN, one digit at a time.”<br/>
> **You:** Provide the configured demo PIN.<br/>
> **AI:** “PIN verified. Your request to sell the demo shares will be processed after this call.”

The backend verifies the actual user turns independently. A sell request or affirmative acceptance, a PIN prompt and the correct user-spoken digits are required. Wrong PINs, cancellations, agent-spoken digits and changed holdings do not authorize a sale. Reprocessing the same call cannot execute a second sale. PIN entries are redacted in locally saved transcripts.

### What was actually verified

- An actual phone call completed for a Tata Motors company disclosure, with a real conversation transcript.
- A **−10% paper-price scenario** triggered a completed crash-alert call and a delivered Telegram summary.
- A **+15% paper-price scenario** triggered a completed gain-alert call.
- The user accepted the sell offer and spoke the demo PIN across four separate turns; the backend closed all **10 paper shares** once and delivered the sale confirmation through Telegram.
- The UI, paper ledger and call/message history reflected the outcomes.

These live checks are separate from the automated tests. Calls require your own provider account, credits, consent and working network access.

## 🧩 How it works

```mermaid
flowchart TD
    UI[React + TypeScript dashboard] --> API[Express API on Node.js]
    API --> DB[(PostgreSQL via PGlite)]
    API --> Q[Yahoo Finance quotes]
    API --> R[News discovery + human evidence review]
    API --> P[Paper portfolio + thresholds]
    R --> RULES[Consent + quiet hours + rate limits]
    P --> RULES
    RULES --> VOICE[OmniDimension outbound call]
    VOICE --> PHONE[Actual mobile phone]
    VOICE --> LOGS[Provider call logs]
    LOGS --> SYNC[Status + transcript sync]
    SYNC --> PIN[Demo sell authorization]
    PIN --> DB
    SYNC --> OUTBOX[Persistent Telegram outbox]
    OUTBOX --> TG[Official Telegram Bot API]
    TG --> CHAT[Private registered chat]

    style API fill:#008a68,color:#fff,stroke:#00b58b
    style DB fill:#203b2e,color:#fff,stroke:#00b58b
    style VOICE fill:#203b2e,color:#fff,stroke:#00b58b
    style OUTBOX fill:#203b2e,color:#fff,stroke:#00b58b
    style UI fill:#111,color:#fff,stroke:#00b58b
```

### Evidence and delivery rules

| Situation | Behaviour |
|---|---|
| Reviewed, recent **high-priority company development** | Eligible for a consented call; Telegram follows the provider outcome. |
| Reviewed, recent **medium-priority commitment** | Telegram notification when monitoring and consent are enabled. |
| Routine update or unreviewed headline | Dashboard/research only; no automatic call. |
| User-requested paper-price scenario crosses a threshold | Real demo call, with explicitly demo-portfolio context. |
| Repeated scenario in the same direction/purchase cycle | No duplicate call. |
| Call request accepted but no result yet | Remains dispatched; never shown as completed. |
| Telegram API rate limit | Bounded retry with backoff. |
| Delivery outcome is uncertain | Marked unknown; not blindly resent. |

Call results are polled every **20 seconds** using the provider's call-log API, correlated by request ID/metadata. No public webhook or inbound exposure of the laptop is needed. Optional research monitoring runs every **30 minutes** while the server is running.

## 🛠️ Technology stack

| Layer | Technology |
|---|---|
| Frontend | React 19 · TypeScript · Vite 7 |
| Interface | Tailwind CSS 4 · Lucide icons · responsive dark theme |
| Backend | Node.js 24 · Express 5 · Zod · Helmet · express-rate-limit |
| Database | PGlite: an embedded PostgreSQL engine compiled to WASM |
| Voice | OmniDimension outbound calling and call-log API |
| Messaging | Official Telegram Bot API |
| Market quotes | Yahoo Finance chart endpoint |
| Research | Google News RSS discovery + original-source human review |
| Verification | Node test runner through `tsx` · TypeScript build · GitHub Actions |

### Companies included

Tata Motors · Tata Steel · Reliance Industries · Mahindra & Mahindra · Infosys · Wipro · HDFC Bank · ICICI Bank · Adani Enterprises · ITC · Larsen & Toubro · Maruti Suzuki.

Tata Motors uses the current **TMCV** listing. Historical passenger-vehicle/group disclosures carry their business scope; they are not silently attributed to the current commercial-vehicle entity.

## 🚀 Run it locally

**Requirements:** Node.js 24, npm, an OmniDimension account with outbound calling access/credits, and a Telegram bot created with [BotFather](https://t.me/BotFather).

```bash
git clone https://github.com/TanishAggarwall/Groww-Stock-Calling.git
cd Groww-Stock-Calling
npm ci
```

Create the local configuration:

```powershell
# Windows PowerShell
Copy-Item .env.example .env.local
```

```bash
# macOS / Linux
cp .env.example .env.local
```

Fill in `.env.local`:

```dotenv
PORT=3000
APP_URL=http://localhost:3000
OMNIDIM_API_KEY=your_own_omnidimension_api_key
OMNIDIM_AGENT_ID=
TELEGRAM_BOT_TOKEN=your_own_botfather_token
TELEGRAM_BOT_USERNAME=your_bot_username_without_at
DEMO_SELL_PIN=your_own_four_digit_demo_pin
```

Then start the app:

```bash
npm run build
npm start
```

Open **http://localhost:3000**. For frontend hot reloading, use `npm run dev`; restart the server after backend changes.

No separate PostgreSQL service is required. The local database is initialized automatically under `data/postgres`.

### Connect the integrations

1. Open **Settings & integrations** and enter your own registered phone number.
2. Enable call consent; choose quiet hours, categories and the daily call limit.
3. Save the OmniDimension API key, check the connection and configure the voice agent. The agent ID is saved server-side.
4. Save the Telegram token and enable messaging consent.
5. Open the unique private registration link in Telegram and tap **Start**. Registration checks run automatically; only a matching private-chat start code can pair the workspace.
6. Send a Telegram test and use **Portfolio / Holdings** to buy paper shares and try a price scenario.

The server binds to **127.0.0.1** for this single-user local demo. Keep it running for monitoring, transcript sync and queued Telegram delivery. The localhost link in Telegram opens on the laptop; it is not a remotely hosted deployment.

<details>
<summary><strong>Configuration reference</strong></summary>

| Variable | Purpose |
|---|---|
| `PORT` | Local API/UI port; defaults to `3000`. |
| `APP_URL` | Dashboard URL included in notifications. |
| `OMNIDIM_API_KEY` | Server-side voice-provider credential. |
| `OMNIDIM_AGENT_ID` | Created/configured voice agent; may be left blank initially. |
| `TELEGRAM_BOT_TOKEN` | Server-side BotFather token. |
| `TELEGRAM_BOT_USERNAME` | Bot username used to construct the registration link when the API is unavailable. |
| `DEMO_SELL_PIN` | Four-digit passcode used only for demo paper sales. |

Actual credentials, registered phone/chat details, local databases, private transcripts and diagnostic scripts are excluded from Git. Use a demo passcode, never a real brokerage PIN. If Telegram API connections are reset on a network, use a network/VPN that can reach `api.telegram.org`.

</details>

## ✅ Tests & checks

```bash
npm test
npm run build
```

**Six automated tests** cover:

- India quiet-hour boundaries and consent/verification gates.
- Provider dispatch, correlation, actual-transcript summaries and Telegram delivery deduplication using mocked provider contracts.
- Secure private-chat registration, rate-limit backoff and uncertain-send handling.
- Idempotent paper purchases, threshold boundaries, separate crash/gain alerts and preservation of real quotes.
- Demo PIN authorization in one turn or successive turns, affirmative sell-offer acceptance, cancellation, wrong PINs, stale holdings and exactly-once paper sales.

The [GitHub Actions workflow](.github/workflows/ci.yml) runs the test suite and production build without live provider credentials.

## 📂 Project structure

```text
Groww-Stock-Calling/
├── .github/workflows/ci.yml   # Build and test pipeline
├── docs/                     # Team artwork, app previews and asset credits
├── public/
│   ├── fonts/                # Reference typography
│   └── logos/                # Listed-company logos
├── server/
│   ├── index.ts              # Local API and application server
│   ├── db.ts                 # PostgreSQL schema and persistence
│   ├── market.ts             # Genuine market quotes and cache
│   ├── monitor.ts            # Research discovery and alert routing
│   ├── integrations.ts       # Voice calls, transcript sync and Telegram outbox
│   ├── portfolio.ts          # Paper purchases and scenario thresholds
│   ├── paper-sell.ts         # Transcript-based demo sale authorization
│   ├── policy.ts             # Consent, quiet hours and outcome rules
│   └── catalog.ts            # Company catalogue and sourced disclosures
├── src/
│   ├── main.tsx              # Application screens and interactions
│   └── style.css             # Responsive dark dashboard
├── tests/                    # Six workflow/property tests
├── .env.example              # Configuration template, no real credentials
└── README.md
```

## 🧭 Current scope

This is a working **single-user hackathon application**. Paper-price scenarios are manually triggered; continuous live-price threshold monitoring and real-money brokerage execution are not implemented. Research discovery is not an exhaustive ESG service: new headlines need original-source human review before priority routing. Quotes may be delayed, stale or unavailable, and the UI labels that status. Provider credits, network connectivity and consent controls determine call availability.

The design is Groww-inspired, with original application flows. Company logos, the reference font, institution/event artwork and other third-party materials retain their owners' rights; see [asset credits](docs/ASSETS.md). This is an independent student project, not an official Groww integration.

## 👥 Team BB

<div align="center">

| Team member | Institution |
|:---:|:---:|
| **Tanish Aggarwal** | VIPS-TC |
| **Palak Gupta** | VIPS-TC |

**Competition:** ProdVerse ~ Tech Unbound<br/>
**Team:** Team BB<br/>
**Built around one idea:** a portfolio alert should be a conversation you can understand and act on in a demo.

<br/>

[![Repository](https://img.shields.io/badge/VIEW%20SOURCE-Groww--Stock--Calling-00B58B?style=for-the-badge&logo=github&labelColor=111111)](https://github.com/TanishAggarwall/Groww-Stock-Calling)

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:061B14,50:00B58B,100:083D2B&height=120&section=footer" width="100%" alt="Team BB footer"/>

</div>
