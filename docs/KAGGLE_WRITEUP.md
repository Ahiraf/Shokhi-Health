# সখী · Shokhi — A Bangla Women's Health Companion, Powered by Gemma 4

**Subtitle:** Free-form Bangla symptom understanding + a deterministic clinical safety layer
for every woman.

---

## The problem

In Bangladesh, menstrual and reproductive health is buried under stigma, silence, and
misinformation. The cost is measured in real health outcomes:

- **PCOS affects an estimated ~51% of reproductive-aged women** in recent Bangladeshi
  studies, and is *higher in rural areas*, with 50–60% of affected women also reporting
  depression, anxiety, or insomnia. Yet most women never get it named or managed.
- **Endometriosis** — severe period pain that stops school, work, and daily life — is
  routinely dismissed as "normal," delaying diagnosis by years.
- Nearly **half of adolescent girls** receive no menstrual education before their first
  period; **30% miss school** every month.

The women who suffer most are the hardest to reach. Research is blunt: rural and
less-educated women often own only **basic button phones**, are frequently **unable to
read SMS or app text**, and face stigma that stops them asking anyone. They need
**Bangla voice input on supported devices**, with guidance returned in simple text.

## Why existing tools don't close the gap

Two well-known tools exist — and both leave this population behind:

- **Ananya (WaterAid Bangladesh)** is a period *tracker* with static articles. It has
  **no AI**, **no clinical triage**, **no PCOS/endometriosis support**, **no voice**, and
  requires a **smartphone and literacy** to install and read it.
- **Probahini (WaterAid + Acme AI)** is a **scripted FAQ chatbot** on messaging apps — it
  does not *reason* over a woman's real, messy symptom description, and still needs a
  smartphone plus the ability to read and type.

**Shokhi closes this gap for phone-only, low-literacy women affected by these conditions.**

## Our solution

**Shokhi (সখী — "a woman's trusted confidante")** lets any woman describe how she feels —
by **typing or speaking in Bangla** — and returns warm, safe, personalized guidance:

1. **Understand** free-form Bangla symptoms → structured facts (Gemma 4).
2. **Triage** them with a deterministic clinical rules layer: *emergency*, *see a doctor
   soon*, *safe home care*, or *general info* — with red-flag detection.
3. **Explain** kindly in simple, spoken-style Bangla what it might be, what to do now, and
   which real service to go to (Gemma 4) — never a firm diagnosis.

Shokhi covers **menstrual health, PCOS, PMS, endometriosis, and common cramps**, and busts
harmful myths. An urban teenager gets private education; a rural woman gets **voice-first
guidance**.

### Situation-first learning paths

Learn and Health Guides now begin with a question a real user can answer: **"What brings you
here today?"** Instead of forcing a first-time user to choose a diagnosis, Shokhi offers paths
for a first period, period cramps, avoiding pregnancy, planning a pregnancy, possible pregnancy,
after birth, and general symptoms. Each path turns a long article into three small decisions:
**start here**, **next step**, and **get help if**.

The contraception path includes a conservative missed-pill helper. It asks for the pill type and
what happened before showing general next steps, because pill instructions differ by product. The
helper never gives a brand-specific dose or replaces a pharmacist/health worker.

### The upgraded report and companion experience

The demo now shows how the same Gemma foundation can support a woman's next decisions, not
just answer one question:

1. **Structured report advice** — report explanations are divided into a simple summary,
   value-by-value review, safe next steps, and questions for a doctor. This makes a long model
   response easier to read on a phone.
2. **Local report history and comparison** — up to twelve report summaries are kept in the
   browser and repeated values such as haemoglobin or TSH can be compared locally. Image bytes
   are not saved in the history.
3. **Doctor handoff summary** — the woman can copy or download a compact visit summary with the
   report source, visible values, and a reminder to confirm with a clinician.
4. **Family explanation modes** — Gemma can rewrite the same health message for the whole
   family, a partner, or a mother/older family member, reducing the social misunderstanding
   around period-related mood changes.
5. **Weekly personal companion** — cycle phase, local mood logs, known conditions, and the next
   seven days are passed as context to generate a gentle, non-clinical weekly plan.
6. **Specialist image review mode** — the report uploader can request a stricter multimodal
   review focused on image quality, visibly readable values, printed reference ranges,
   uncertainty, and safe next steps. It remains general information, not a diagnosis.

These features keep the product's privacy boundary clear: the report timeline is local-first,
while Gemma is used for language, explanation, and personalization. Safety-critical urgency
and critical haemoglobin flags remain deterministic and are never delegated to the model.

## How Gemma 4 is integrated (and why it is core)

Shokhi runs on a **"one Gemma brain, a safety rail underneath"** architecture:

```
Bangla text / voice
      │  extractSymptoms()  ── Gemma 4 turns messy free-form Bangla into structured facts
      ▼
Symptom profile (JSON)
      │
      ▼  triage.ts  ── DETERMINISTIC rules decide urgency + red flags (never the LLM)
Safety-checked result (JSON)
      │  explainTriage() / bustMyth()  ── Gemma 4 speaks back with warmth, at the
      ▼                                     right literacy level
Bangla guidance (text)
```

**Gemma 4 does the genuinely hard, generative work** that no rule-tree can: interpreting
colloquial, code-mixed Bangla and producing empathetic, simple responses. This separates
Shokhi from static content and scripted FAQs.

**Crucially, the safety-critical decision is *not* made by the LLM.** The urgency level
and red flags (e.g. "possible pregnancy + severe pain → emergency") are computed by a
deterministic engine, so Gemma **can never under-triage an emergency because of a
hallucination**. This is the responsible pattern for health AI: *LLM for language,
deterministic logic for safety.* Gemma stays core (natural language), wrapped in a guardrail.

The Gemma 4 implementation is deliberately structured rather than a single free-form prompt:
symptom intake uses an allow-listed function schema with evidence and uncertainty, thinking is
minimal for routine turns and high for ambiguous turns, and support-number tool calls are
side-effect-free and bounded. Report images use a separate structured review schema for image
quality, visible values, printed ranges, uncertainty, and safe next steps. In every path,
deterministic triage remains the final urgency authority.

**Voice input is supported** for women who cannot type: the Voice Bridge transcribes a short
recording, extracts structured symptoms with Gemma, and sends the result through the same
safety-first pipeline. Guidance is returned as readable text.
 Report photos go directly to multimodal Gemma 4, which reads the visible report and explains it.
 The report route also supports structured section prompts, local history comparison, doctor
 handoff export, and a stricter specialist image-review prompt.
Other supporting,
non-generative tools assist Gemma — a curated knowledge base of red flags/conditions/myths,
embeddings + cosine search for RAG, and two exported ML risk classifiers. **Gemma 4 is the only
LLM in the system.**

### Multi-Provider AI Fallback (reliability by design)

Hosted Gemma 4 calls rotate through up to three Google AI Studio keys when quota, access,
rate-limit, or transient service errors occur. A local Gemma adapter can be selected for
privacy-first operation, with deterministic fallback when its endpoint is unavailable. This
is a provider layer, not a second LLM: guidance still comes from Gemma 4; browser speech,
image understanding, embeddings, rules, and traditional ML are supporting components.

## System architecture: one brain, many front doors

Because the triage engine and Gemma backend are decoupled from the UI, the *same core* can
serve multiple channels:

| User | Front door | Status |
|---|---|---|
| Urban teen / literate woman | Web app (text + voice) | Built — the demo |
| Health worker / NGO field staff | Same web app, checklist mode | Built |
| **Rural, low-literacy woman** | **Browser voice input** — speak Bangla and receive written guidance | Available in the demo |

## Technical implementation

Shokhi is a **single Next.js app** (TypeScript) — UI and backend (API routes) together,
with server logic in `lib/server/`:

- **Triage engine** — deterministic safety logic (zero LLM/network): maps symptoms to
  urgency, fires red flags, suspects conditions (PCOS, endometriosis, PMS), and asks
  screening questions. **Never fires an emergency on a missing field**, and **never
  downgrades** one.
- **Gemma backend** — a `Backend` interface with deterministic **Mock**, hosted **Gemma 4**,
  and OpenAI-compatible **local Gemma 4** implementations. Symptom and report extraction use
  structured function calls where supported, with defensive parsing and evidence/uncertainty
  fields because model responses can include formatting noise.
- **`lib/server/prompts.ts`** — carefully-scoped Gemma prompts (extract, explain, myth,
  RAG-grounded), instructed to extract only stated facts, never diagnose, never override urgency.
- **`lib/server/assistant.ts`** — the orchestrator tying conversation → symptoms → triage →
  guidance (and RAG), holding state across turns.
- **Voice Bridge** — the microphone path combines transcription, structured Gemma extraction,
  deterministic triage, and written guidance in one turn, removing the typing step for
  low-literacy users.
- **`lib/server/knowledge.json`** — the clinical knowledge base (red flags, conditions with
  bilingual self-care, myths, 22-field symptom schema).
- **Supporting ML risk models** — two lightweight, *non-generative* classifiers that add a
  risk signal to triage, trained on real public **self-report** datasets: **PCOS** (Kaggle,
  541 records — test AUC **0.84**) and **endometriosis** (Scientific Reports 2023, 886
  records — test AUC **0.93**). They use only features a woman can state in conversation
  (cycle regularity, excess hair, acne, period pain, etc.), *not* lab values. Allowed
  "traditional ML that supports, not replaces" Gemma 4: the signal **never overrides**
  urgency, and degrades gracefully if absent.
- **Web UI** (Next.js) — chat, a symptom **checklist** (so a helper can assist a woman who
  can't type), browser voice input, colored urgency cards, report history, doctor handoff,
  family audience modes, and weekly companion cards.
- **Pure-TypeScript runtime + tests** — ML risk classifiers are trained offline and
**exported to plain JSON**, so inference runs in TypeScript with **no Python/ML runtime on
the server**; everything deploys as **one unit on Vercel**. A **Vitest** suite (47 tests)
  locks the safety guarantees: emergencies are never downgraded, the ML signal never
  overrides urgency, RAG degrades gracefully, and the new report/personalization helpers remain
  deterministic and local-first.

### Retrieval-Augmented Generation (RAG)

For open questions about a topic, Shokhi does not answer from memory. It first **retrieves**
the most relevant passages from a small library of **trusted health documents** (WHO,
national guidelines), then **Gemma 4 answers using only those passages** and cites the
source. Retrieval uses **non-generative embeddings** + cosine
search — both **non-generative**, which the rules permit as support — so **Gemma 4 stays the
only LLM**. The pipeline is **TypeScript** (RAG is an architecture, not a Python library)
inside the one Next.js app. If nothing relevant is
found it falls back to the knowledge base; **urgency is still decided by rules**, so
retrieval never affects safety — it only enriches and *cites* answers.

## Technical challenges & how we addressed them

- **Safety vs. LLM freedom:** we refused to let the model decide urgency. A separate
  deterministic engine owns that, so a hallucination can never miss an emergency.
- **Messy, code-mixed Bangla:** Gemma handles free-form input; a defensive JSON parser
  tolerates prose or code fences that models sometimes add.
- **Reaching non-readers:** voice input and a checklist mode; a decoupled
  backend a phone IVR hotline can reuse.
- **Avoiding harm:** conditions are surfaced only as "worth discussing with a doctor,"
  always alongside the free hotline (16263) and 999.

## Real-world impact & future work

Shokhi targets a large, underserved population that existing tools ignore. Next steps:
measure the live Gemma 4 experience, add a verified IVR speech adapter, and pilot the
**voice hotline** with an NGO. By pairing Gemma 4's language with a strict safety layer, Shokhi
turns a private, stigmatized struggle into a free, judgment-free companion in every woman's
own language.

## Sources & acknowledgements

The RAG corpus uses only reliable, public, licensed sources, cited in every answer: **WHO**
fact sheets/guidelines under **CC BY-NC-SA 3.0 IGO** (adapted with WHO's required disclaimer),
**NHS** under the **Open Government Licence**, and **Bangladesh DGHS/DGFP** and **icddr,b**
summarised with attribution. Full credits in `ATTRIBUTION.md`. Shokhi is free and
non-commercial.

The repository stores concise, attributed Markdown summaries rather than copying whole
publications into the app. The current additions cover WHO's antenatal-care guidance,
postnatal-care guidance, and the 2025 contraceptive-practice recommendations; the original
publication links and licences remain in each document's frontmatter.

*Repository & public demo attached. Gemma 4 is the only LLM used.*
