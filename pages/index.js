import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { API, apiGet, apiFetch } from "../lib/api";

function FieldLabel({ children, hint }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "6px" }}>
      <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--label)", textTransform: "uppercase", letterSpacing: "0.7px" }}>
        {children}
      </label>
      {hint && <span style={{ fontSize: "11px", color: "#4a5568" }}>{hint}</span>}
    </div>
  );
}

const fieldBase = {
  width: "100%", padding: "10px 13px", fontSize: "13.5px",
  background: "var(--field-bg)", border: "1px solid rgba(139,92,246,0.18)",
  borderRadius: "9px", outline: "none", color: "var(--text)",
  transition: "border-color 0.2s, box-shadow 0.2s", fontFamily: "inherit",
};

// ─── Style Options (mirrors STYLE_DIMENSIONS in Super-team/routes/generate.js) ─
// First option in every dimension is empty = "use default for this field".
const DEFAULT_OPT = { value: "", label: "— default —" };
const STYLE_OPTIONS = {
  tone: [
    DEFAULT_OPT,
    { value: "formal and polished, measured professional language with restrained adjectives", label: "Formal & polished" },
    { value: "conversational and confident, senior engineer narrating their own achievements", label: "Conversational & confident" },
    { value: "technical and precise, depth and specificity over flair", label: "Technical & precise" },
    { value: "results-driven and assertive, ownership and measurable business outcomes", label: "Results-driven & assertive" },
    { value: "pragmatic and understated, metrics and technical detail doing the talking", label: "Pragmatic & understated" },
    { value: "crisp and executive, tight scannable sentences for busy recruiters", label: "Crisp & executive" },
    { value: "narrative and reflective, each role framed as a chapter with context", label: "Narrative & reflective" },
    { value: "mentorship-forward, collaboration, code review, and team-lifting moments", label: "Mentorship-forward" },
    { value: "product-minded, customer impact, usage metrics, and feature outcomes foregrounded", label: "Product-minded" },
    { value: "systems-oriented, scale, reliability, latency, and throughput emphasized", label: "Systems-oriented" },
    { value: "startup-flavored, scrappy and ownership-heavy with stack breadth", label: "Startup-flavored" },
    { value: "enterprise-flavored, governance, compliance, and cross-team alignment emphasized", label: "Enterprise-flavored" },
    { value: "quiet expert, modest but technically deep with subtle signals of mastery", label: "Quiet expert" },
    { value: "visionary builder, forward-looking with transformation and reinvention language", label: "Visionary builder" },
    { value: "battle-tested operator, incident-aware and resilience-forward wartime framing", label: "Battle-tested operator" },
    { value: "craftsperson, code quality pride and attention-to-detail emphasized", label: "Craftsperson" },
    { value: "research-minded, experimentation, hypothesis, and iteration language", label: "Research-minded" },
    { value: "growth-oriented, momentum, velocity, and learning-curve emphasis", label: "Growth-oriented" },
    { value: "platform engineer, self-service, reusable, internal-tooling language", label: "Platform engineer" },
    { value: "domain expert, industry terminology and business-context fluency", label: "Domain expert" },
  ],
  bulletRange: [
    DEFAULT_OPT,
    ...[[6,8],[6,9],[6,10],[6,11],[7,8],[7,9],[7,10],[7,11],[8,9],[8,10],[8,11],[8,12],[9,10],[9,11],[9,12],[10,11],[10,12],[10,13],[11,12],[11,13]].map(([min,max]) => ({ value: `${min}-${max}`, label: `${min} to ${max} bullets per role` })),
  ],
  summaryLength: [
    DEFAULT_OPT,
    ...[[550,650],[580,680],[600,700],[620,720],[640,740],[650,750],[660,760],[680,780],[680,800],[700,800],[700,820],[720,820],[720,840],[740,860],[750,850],[770,870],[780,880],[800,900],[820,920],[850,950]].map(([min,max]) => ({ value: `${min}-${max}`, label: `${min}-${max} letters` })),
  ],
  verbPalette: [
    DEFAULT_OPT,
    { value: "engineered, architected, spearheaded, orchestrated, pioneered, championed, delivered, optimized, instrumented, productionized", label: "Architect-level verbs" },
    { value: "built, shipped, led, designed, improved, scaled, integrated, refactored, modernized, automated", label: "Builder-level verbs" },
    { value: "developed, implemented, drove, launched, streamlined, owned, partnered, coordinated, consolidated, hardened", label: "Classic development verbs" },
    { value: "crafted, introduced, migrated, hardened, instrumented, tuned, rolled out, stewarded, reimagined, unblocked", label: "Craftsmanship verbs" },
    { value: "authored, rebuilt, decomposed, untangled, parallelized, federated, containerized, profiled, right-sized, rearchitected", label: "Refactoring & scaling verbs" },
    { value: "prototyped, validated, de-risked, ramped, rationalized, retired, extracted, isolated, simplified, consolidated", label: "Iteration & validation verbs" },
    { value: "shepherded, unblocked, onboarded, mentored, paired, reviewed, evangelized, documented, championed, aligned", label: "Mentorship & collaboration verbs" },
    { value: "scaled, sharded, cached, batched, throttled, pipelined, backfilled, replayed, paginated, deduplicated", label: "Performance & systems verbs" },
    { value: "reduced, eliminated, cut, trimmed, accelerated, halved, minimized, compressed, shortened, tightened", label: "Reduction & efficiency verbs" },
    { value: "grew, expanded, multiplied, amplified, boosted, elevated, doubled, strengthened, reinforced, accelerated", label: "Growth & expansion verbs" },
    { value: "automated, scripted, codified, templated, generalized, abstracted, parametrized, standardized, regularized, formalized", label: "Automation verbs" },
    { value: "measured, benchmarked, profiled, traced, diagnosed, observed, monitored, alerted, charted, audited", label: "Measurement & observability verbs" },
    { value: "unified, consolidated, merged, standardized, centralized, harmonized, normalized, reconciled, converged, synchronized", label: "Unification & standardization verbs" },
    { value: "decomposed, modularized, split, extracted, isolated, untangled, partitioned, carved, refactored, unbundled", label: "Decomposition verbs" },
    { value: "migrated, transitioned, replatformed, retargeted, cut-over, converted, modernized, upgraded, lifted, shifted", label: "Migration & modernization verbs" },
    { value: "secured, hardened, audited, patched, remediated, encrypted, tokenized, scoped, rotated, safeguarded", label: "Security & hardening verbs" },
    { value: "documented, diagrammed, specced, outlined, articulated, charted, authored, annotated, described, clarified", label: "Documentation verbs" },
    { value: "reviewed, triaged, inspected, validated, approved, vetted, gate-kept, quality-checked, spot-checked, verified", label: "Review & validation verbs" },
    { value: "negotiated, aligned, advocated, facilitated, brokered, socialized, rallied, persuaded, influenced, sold", label: "Negotiation & alignment verbs" },
    { value: "ideated, brainstormed, explored, experimented, piloted, trialed, road-mapped, proposed, blueprinted, envisioned", label: "Ideation & experimentation verbs" },
  ],
  skillOrder: [
    DEFAULT_OPT,
    { value: "frontend-first (Languages, Frontend, Backend, Databases, Cloud, Tooling)", label: "Frontend-first" },
    { value: "backend-first (Languages, Backend, Databases, Cloud, Frontend, Tooling)", label: "Backend-first" },
    { value: "data-first (Databases, Data Engineering, Languages, Cloud, Backend, Frontend)", label: "Data-first" },
    { value: "cloud-first (Cloud, DevOps, Languages, Backend, Databases, Frontend)", label: "Cloud-first" },
    { value: "devops-first (CI/CD, Infrastructure, Observability, Languages, Backend, Cloud)", label: "DevOps-first" },
    { value: "platform-first (Platform Services, APIs, Languages, Backend, Data, Cloud)", label: "Platform-first" },
    { value: "fullstack-balanced (Languages, Frontend, Backend, Databases, Cloud, DevOps, Testing)", label: "Fullstack balanced" },
    { value: "ai-ml-first (AI/ML, Data, Languages, Cloud, Backend, Tooling)", label: "AI/ML-first" },
    { value: "mobile-first (Mobile, Languages, Backend, APIs, Cloud, Tooling)", label: "Mobile-first" },
    { value: "security-first (Security, Languages, Backend, Cloud, Databases, Tooling)", label: "Security-first" },
    { value: "architecture-first (Architecture Patterns, Languages, Backend, Cloud, Data, Frontend)", label: "Architecture-first" },
    { value: "embedded-first (Embedded, Systems Languages, Protocols, Hardware, Tooling, Frontend)", label: "Embedded-first" },
    { value: "ml-ops-first (ML Ops, AI/ML, Data, Cloud, Languages, Tooling)", label: "ML Ops-first" },
    { value: "blockchain-first (Blockchain, Smart Contracts, Languages, Cryptography, Backend, Frontend)", label: "Blockchain-first" },
    { value: "game-dev-first (Game Engines, Languages, Graphics, Tooling, Backend, Cloud)", label: "Game dev-first" },
    { value: "qa-first (Testing, Automation, Languages, Tools, CI/CD, Backend)", label: "QA-first" },
    { value: "sre-first (Reliability, Observability, Infrastructure, Languages, Cloud, Incident Response)", label: "SRE-first" },
    { value: "api-first (API Design, Languages, Backend, Data, Auth, Cloud)", label: "API-first" },
    { value: "design-system-first (Design Systems, Frontend, Languages, Tooling, Accessibility, Performance)", label: "Design system-first" },
    { value: "data-science-first (Data Science, Statistics, Languages, ML, Visualization, Data Engineering)", label: "Data science-first" },
  ],
  bulletStructure: [
    DEFAULT_OPT,
    { value: "challenge, then action, then quantified result", label: "Challenge → action → result" },
    { value: "action first, tool or technology used, then impact metric", label: "Action → tool → impact" },
    { value: "situation, task undertaken, and measurable outcome", label: "Situation → task → outcome" },
    { value: "problem statement, technical approach, and business value", label: "Problem → approach → value" },
    { value: "trigger event, engineering response, and downstream effect", label: "Trigger → response → effect" },
    { value: "goal stated, methodology applied, and outcome measured", label: "Goal → methodology → outcome" },
    { value: "context, decision, and consequence", label: "Context → decision → consequence" },
    { value: "opportunity identified, solution shipped, and adoption or savings", label: "Opportunity → solution → adoption" },
    { value: "pain point surfaced, remediation delivered, and reduction metric", label: "Pain → remediation → reduction" },
    { value: "observation, hypothesis, experiment, and conclusion", label: "Observation → hypothesis → conclusion" },
    { value: "constraint acknowledged, workaround built, and improvement delivered", label: "Constraint → workaround → improvement" },
    { value: "vision articulated, deliverable shipped, and validation signal", label: "Vision → deliverable → validation" },
    { value: "stakeholder ask, execution approach, and response metric", label: "Ask → execution → response" },
    { value: "baseline stated, change made, and delta achieved", label: "Baseline → change → delta" },
    { value: "system weakness found, fix implemented, and reliability gain", label: "Weakness → fix → reliability gain" },
    { value: "initiative launched, milestones hit, and outcome quantified", label: "Initiative → milestones → outcome" },
    { value: "capability gap identified, capability built, and usage growth", label: "Gap → capability → adoption" },
    { value: "technical debt called out, refactor completed, velocity improvement", label: "Tech debt → refactor → velocity" },
    { value: "partnership formed, artifact delivered, and mutual outcome", label: "Partnership → artifact → outcome" },
    { value: "spike or prototype, decision reached, and production rollout", label: "Spike → decision → rollout" },
  ],
  metricDensity: [
    DEFAULT_OPT,
    ...[50,55,60,63,65,67,70,72,75,77,78,80,82,83,85,87,88,90,92,95].map(n => ({ value: String(n), label: `${n}% quantified` })),
  ],
  summaryOpeningVariant: [
    DEFAULT_OPT,
    { value: "lead with years of experience and primary stack", label: "Lead with years + stack" },
    { value: "lead with a signature achievement phrase before stack", label: "Lead with achievement" },
    { value: "lead with domain or industry specialization", label: "Lead with domain" },
    { value: "lead with scale indicator (team size, system scale, user reach)", label: "Lead with scale" },
    { value: "lead with a crisp value proposition sentence, then stack", label: "Lead with value prop" },
    { value: "lead with a specific flagship project reference", label: "Lead with flagship project" },
    { value: "lead with a recent certification or credential mention", label: "Lead with credential" },
    { value: "lead with a dominant technical philosophy (e.g., systems thinking)", label: "Lead with philosophy" },
    { value: "lead with mentorship or leadership framing", label: "Lead with leadership" },
    { value: "lead with product outcome orientation (customer obsession)", label: "Lead with product outcomes" },
    { value: "lead with reliability or availability posture", label: "Lead with reliability" },
    { value: "lead with performance-first posture (latency, throughput)", label: "Lead with performance" },
    { value: "lead with architectural vision (distributed, event-driven)", label: "Lead with architecture" },
    { value: "lead with cross-functional breadth (frontend, backend, data)", label: "Lead with breadth" },
    { value: "lead with quantified lifetime impact (cost saved, users reached)", label: "Lead with lifetime impact" },
    { value: "lead with a career narrative arc (progression over time)", label: "Lead with career arc" },
    { value: "lead with a technology-first framing (JD primary tech named)", label: "Lead with tech" },
    { value: "lead with an industry-transformation angle", label: "Lead with transformation" },
    { value: "lead with a team-impact framing (org or team scope built)", label: "Lead with team impact" },
    { value: "lead with a research or innovation posture", label: "Lead with research" },
  ],
  bulletOpenerPattern: [
    DEFAULT_OPT,
    { value: "vary aggressively, no verb repeats within any role", label: "Vary aggressively" },
    { value: "cluster past-tense verbs, interleave occasional gerund phrases", label: "Past-tense + gerunds" },
    { value: "mix short punchy openers with longer compound sentences", label: "Short + long mix" },
    { value: "alternate action verbs with outcome-leading phrasing", label: "Verb / outcome alternating" },
    { value: "begin every bullet with a strong past-tense verb", label: "Strict verb-first" },
    { value: "occasionally lead with a metric or number", label: "Occasional metric-led" },
    { value: "occasionally lead with a subject noun before the verb", label: "Occasional noun-led" },
    { value: "alternate between process verbs and outcome verbs", label: "Process vs outcome alternating" },
    { value: "include a mix of solo-action and partnered-action verbs", label: "Solo + partnered verbs" },
    { value: "vary between high-level and detailed-scope openers", label: "High-level + detailed mix" },
    { value: "occasionally lead with a time-bound phrase (e.g., within six months)", label: "Occasional time-led" },
    { value: "interleave a cause-and-effect connector where natural", label: "Cause-and-effect connectors" },
    { value: "vary between mechanism-led and result-led openers", label: "Mechanism vs result alternating" },
    { value: "include occasional conditional or comparative openers", label: "Conditional / comparative" },
    { value: "alternate between past simple and past continuous tenses", label: "Tense alternating" },
    { value: "keep all openers in past simple, strict verb-first rhythm", label: "Past simple only" },
    { value: "mix proper-noun-led openers with verb-led openers", label: "Proper-noun + verb mix" },
    { value: "include occasional infinitive-phrase openers (e.g., To reduce latency)", label: "Occasional infinitive-led" },
    { value: "mix between ownership (owned) and contribution (contributed)", label: "Ownership + contribution mix" },
    { value: "vary rhythm: some abrupt, some flowing, natural narrative cadence", label: "Natural varied cadence" },
  ],
  achievementFlavor: [
    DEFAULT_OPT,
    { value: "performance and latency wins", label: "Performance & latency" },
    { value: "reliability and uptime improvements", label: "Reliability & uptime" },
    { value: "cost reduction and efficiency wins", label: "Cost & efficiency" },
    { value: "adoption and usage growth", label: "Adoption & usage" },
    { value: "developer velocity and productivity", label: "Developer velocity" },
    { value: "security hardening and compliance", label: "Security & compliance" },
    { value: "technical debt reduction", label: "Technical debt reduction" },
    { value: "scale and throughput milestones", label: "Scale & throughput" },
    { value: "feature delivery and shipping velocity", label: "Feature delivery" },
    { value: "observability and incident reduction", label: "Observability & incidents" },
    { value: "test coverage and quality improvements", label: "Test coverage & quality" },
    { value: "onboarding time and developer experience", label: "Onboarding & DX" },
    { value: "documentation and knowledge-sharing", label: "Documentation" },
    { value: "cross-team enablement and platform leverage", label: "Platform leverage" },
    { value: "revenue or business-metric impact", label: "Revenue & business" },
    { value: "user retention and engagement gains", label: "Retention & engagement" },
    { value: "deployment frequency and release automation", label: "Deployment frequency" },
    { value: "migration and modernization wins", label: "Migration & modernization" },
    { value: "mentoring and team-capability growth", label: "Mentoring & team growth" },
    { value: "research breakthroughs and novel solutions", label: "Research breakthroughs" },
  ],
  sentenceRhythm: [
    DEFAULT_OPT,
    { value: "short punchy sentences throughout", label: "Short & punchy" },
    { value: "medium-length balanced sentences throughout", label: "Medium & balanced" },
    { value: "long flowing sentences with subordinate clauses", label: "Long & flowing" },
    { value: "mix of short and medium sentences, no long ones", label: "Short + medium mix" },
    { value: "mix of medium and long sentences, no short ones", label: "Medium + long mix" },
    { value: "wide variation: short, medium, and long interspersed", label: "Wide variation" },
    { value: "front-loaded: long sentences in recent roles, shorter in older", label: "Front-loaded" },
    { value: "rear-loaded: shorter in recent, longer narrative in older", label: "Rear-loaded" },
    { value: "metric-dense short sentences with embedded numbers", label: "Metric-dense short" },
    { value: "narrative long sentences with causal chains", label: "Narrative causal" },
    { value: "parallel-structure sentences within each role", label: "Parallel structure" },
    { value: "semicolon-joined compound sentences", label: "Semicolon compound" },
    { value: "comma-rich sentences with multiple clauses", label: "Comma-rich multi-clause" },
    { value: "simple subject-verb-object rhythm throughout", label: "Simple SVO" },
    { value: "occasional hyphenated asides for emphasis (no em dashes)", label: "Hyphenated asides" },
    { value: "gerund-phrase heavy sentences", label: "Gerund-phrase heavy" },
    { value: "appositive-heavy sentences with in-line definitions", label: "Appositive-heavy" },
    { value: "conditional phrasing where natural (e.g., after X, Y followed)", label: "Conditional phrasing" },
    { value: "time-bound phrasing with periods and timelines", label: "Time-bound phrasing" },
    { value: "quantification-first sentences (metric up front)", label: "Metric-first sentences" },
  ],
  technologyClustering: [
    DEFAULT_OPT,
    { value: "one technology per bullet", label: "One tech per bullet" },
    { value: "two related technologies per bullet", label: "Two related per bullet" },
    { value: "three or more technologies per bullet", label: "Three+ per bullet" },
    { value: "front-load tech names in the bullet opener", label: "Tech front-loaded" },
    { value: "back-load tech names toward the outcome", label: "Tech back-loaded" },
    { value: "pair primary language with one framework per bullet", label: "Language + framework" },
    { value: "cluster all tech in one using-X-and-Y phrase", label: "Clustered phrase" },
    { value: "spread tech names across different clauses of the bullet", label: "Spread across clauses" },
    { value: "name tech only when the bullet is specifically about it", label: "Tech only when relevant" },
    { value: "name at least one tech in every bullet", label: "Tech in every bullet" },
    { value: "name at most one tech per bullet to avoid density", label: "Max one tech per bullet" },
    { value: "group infrastructure tech together in dedicated bullets", label: "Infra grouped" },
    { value: "group data tech together in dedicated bullets", label: "Data tech grouped" },
    { value: "group frontend tech together in dedicated bullets", label: "Frontend tech grouped" },
    { value: "distribute JD primary tech across 60% of bullets", label: "JD tech in 60% of bullets" },
    { value: "distribute JD primary tech across every bullet in the top role", label: "JD tech in top role" },
    { value: "use ecosystem labels (e.g., AWS stack) sometimes instead of lists", label: "Ecosystem labels" },
    { value: "mix explicit names with abstract capability terms", label: "Explicit + abstract mix" },
    { value: "use parentheticals for supporting tech (e.g., Python (FastAPI, SQLAlchemy))", label: "Parenthetical supporting tech" },
    { value: "use comma-separated tech lists at the end of action clauses", label: "Trailing tech lists" },
  ],
  seniorityPosture: [
    DEFAULT_OPT,
    { value: "quiet expert, modest but technically deep", label: "Quiet expert" },
    { value: "assertive technical leader, ownership-forward", label: "Assertive leader" },
    { value: "pragmatic shipper, outcomes over elegance", label: "Pragmatic shipper" },
    { value: "deep specialist, narrow domain mastery", label: "Deep specialist" },
    { value: "polymath generalist, broad stack fluency", label: "Polymath generalist" },
    { value: "staff-level architect, cross-system reasoning", label: "Staff architect" },
    { value: "principal-level visionary, long-horizon framing", label: "Principal visionary" },
    { value: "mentor and multiplier, team-capability growth", label: "Mentor & multiplier" },
    { value: "operator and firefighter, incident-tested resilience", label: "Operator & firefighter" },
    { value: "researcher and experimenter, hypothesis-driven", label: "Researcher" },
    { value: "product-minded engineer, customer-first framing", label: "Product-minded" },
    { value: "platform engineer, internal-leverage-first framing", label: "Platform engineer" },
    { value: "reliability engineer, uptime and stability framing", label: "Reliability engineer" },
    { value: "performance engineer, latency and efficiency framing", label: "Performance engineer" },
    { value: "security engineer, threat-model and compliance framing", label: "Security engineer" },
    { value: "data engineer, pipelines and quality framing", label: "Data engineer" },
    { value: "ML engineer, model and inference framing", label: "ML engineer" },
    { value: "frontend craftsman, UX polish and accessibility framing", label: "Frontend craftsman" },
    { value: "fullstack hustler, end-to-end delivery framing", label: "Fullstack hustler" },
    { value: "tech lead, planning and execution coordination framing", label: "Tech lead" },
  ],
  quantificationFlavor: [
    DEFAULT_OPT,
    { value: "percentages (e.g., 42%, 87%)", label: "Percentages" },
    { value: "raw counts (e.g., 1.2M users, 340 services)", label: "Raw counts" },
    { value: "latency and performance times (e.g., 230ms p95, 40% p99 reduction)", label: "Latency & perf" },
    { value: "throughput (e.g., 12K rps, 3B events/day)", label: "Throughput" },
    { value: "money (e.g., $450K saved, $1.2M ARR impact)", label: "Money" },
    { value: "time saved (e.g., 4 hours per sprint, 3 days per release)", label: "Time saved" },
    { value: "team and org scale (e.g., 12-engineer team, 4 squads)", label: "Team & org scale" },
    { value: "uptime (e.g., 99.99%, four nines)", label: "Uptime" },
    { value: "code and repo metrics (e.g., 80K LOC, 1200 PRs reviewed)", label: "Code & repo metrics" },
    { value: "coverage and quality (e.g., 94% test coverage)", label: "Coverage & quality" },
    { value: "incident reduction (e.g., 63% fewer pages, 72% lower MTTR)", label: "Incident reduction" },
    { value: "cost per unit (e.g., $0.003 per request, 47% cost-per-user reduction)", label: "Cost per unit" },
    { value: "frequency (e.g., 12 deploys/day, 3 releases/week)", label: "Frequency" },
    { value: "adoption (e.g., 23 teams onboarded, 87% rollout)", label: "Adoption" },
    { value: "capacity (e.g., 8x headroom, 3x peak load)", label: "Capacity" },
    { value: "conversion and growth (e.g., 18% lift, 2.3x engagement)", label: "Conversion & growth" },
    { value: "ratio metrics (e.g., 3:1 ROI, 4.2x faster)", label: "Ratios" },
    { value: "ranges (e.g., 30-50% improvement)", label: "Ranges" },
    { value: "mixed: percentages and counts balanced", label: "Mixed: % + counts" },
    { value: "mixed: time and money balanced", label: "Mixed: time + money" },
  ],
  domainVocabularyLevel: [
    DEFAULT_OPT,
    { value: "generic and universal, no domain jargon", label: "Generic & universal" },
    { value: "mildly domain-flavored, occasional terms", label: "Mildly domain-flavored" },
    { value: "moderately domain-specific, regular terminology", label: "Moderately domain-specific" },
    { value: "heavily domain-specific, industry-native vocabulary", label: "Heavily domain-specific" },
    { value: "JD-industry-matched vocabulary throughout", label: "JD-industry matched" },
    { value: "candidate-industry-native vocabulary preserved", label: "Candidate-industry preserved" },
    { value: "mix of generic and domain-specific, balanced", label: "Balanced mix" },
    { value: "domain-specific in recent roles, generic in older", label: "Domain in recent" },
    { value: "mostly generic with a few signature domain terms", label: "Mostly generic + signature" },
    { value: "domain-dense in summary, lighter in experience", label: "Domain-dense summary" },
    { value: "domain-dense in experience, lighter in summary", label: "Domain-dense experience" },
    { value: "domain-dense in skills, balanced elsewhere", label: "Domain-dense skills" },
    { value: "domain terms paired with plain-language explanations", label: "Domain + explanations" },
    { value: "heavy fintech vocabulary if JD is fintech", label: "Fintech heavy (if JD)" },
    { value: "heavy healthcare vocabulary if JD is healthcare", label: "Healthcare heavy (if JD)" },
    { value: "heavy retail/e-commerce vocabulary if JD matches", label: "Retail heavy (if JD)" },
    { value: "heavy adtech/martech vocabulary if JD matches", label: "Adtech heavy (if JD)" },
    { value: "heavy edtech vocabulary if JD matches", label: "Edtech heavy (if JD)" },
    { value: "adapt dynamically to JD sector, stay natural", label: "Dynamic to JD sector" },
    { value: "prioritize JD keywords over native-domain terms", label: "JD-keyword priority" },
  ],
  collaborationEmphasis: [
    DEFAULT_OPT,
    { value: "strongly solo-ownership framing", label: "Strongly solo" },
    { value: "mostly solo with occasional partnership mentions", label: "Mostly solo" },
    { value: "balanced solo and collaborative framing", label: "Balanced" },
    { value: "mostly collaborative with named partnerships", label: "Mostly collaborative" },
    { value: "strongly team-oriented framing throughout", label: "Strongly team-oriented" },
    { value: "cross-functional emphasis (product, design, data)", label: "Cross-functional" },
    { value: "mentorship-first framing", label: "Mentorship-first" },
    { value: "lead-partner framing (led N engineers with M stakeholders)", label: "Lead-partner" },
    { value: "org-spanning framing (across multiple teams)", label: "Org-spanning" },
    { value: "contributor framing (contributed to X led by Y)", label: "Contributor framing" },
    { value: "pair-programming emphasis", label: "Pair-programming" },
    { value: "code-review emphasis (reviewed N PRs)", label: "Code-review emphasis" },
    { value: "on-call partnership emphasis", label: "On-call partnership" },
    { value: "design-partnership emphasis (co-designed with X)", label: "Design-partnership" },
    { value: "customer-facing collaboration emphasis", label: "Customer-facing" },
    { value: "vendor or external-partner collaboration emphasis", label: "Vendor / external partner" },
    { value: "open-source community collaboration emphasis", label: "Open-source community" },
    { value: "standardization-committee collaboration emphasis", label: "Standardization committee" },
    { value: "hiring and interviewing collaboration emphasis", label: "Hiring & interviewing" },
    { value: "executive-stakeholder collaboration emphasis", label: "Executive stakeholder" },
  ],
  architectureDepth: [
    DEFAULT_OPT,
    { value: "minimal, stay at feature-level", label: "Minimal (feature-level)" },
    { value: "light, occasional system mentions", label: "Light" },
    { value: "moderate, architecture surfaced in top role", label: "Moderate (top role)" },
    { value: "heavy, architecture details across all roles", label: "Heavy (all roles)" },
    { value: "distributed-systems framing throughout", label: "Distributed systems" },
    { value: "event-driven framing throughout", label: "Event-driven" },
    { value: "microservices framing throughout", label: "Microservices" },
    { value: "monolith-modular framing where relevant", label: "Monolith-modular" },
    { value: "serverless framing where relevant", label: "Serverless" },
    { value: "data-pipeline framing throughout", label: "Data-pipeline" },
    { value: "request-response latency framing", label: "Request-response latency" },
    { value: "queue and worker framing", label: "Queue & worker" },
    { value: "pub-sub and streaming framing", label: "Pub-sub & streaming" },
    { value: "batch processing framing", label: "Batch processing" },
    { value: "real-time processing framing", label: "Real-time processing" },
    { value: "multi-tenant SaaS framing", label: "Multi-tenant SaaS" },
    { value: "single-tenant on-prem framing where relevant", label: "Single-tenant on-prem" },
    { value: "edge and CDN framing where relevant", label: "Edge & CDN" },
    { value: "hybrid cloud framing where relevant", label: "Hybrid cloud" },
    { value: "layered-architecture (presentation, domain, data) framing", label: "Layered architecture" },
  ],
  outcomeFraming: [
    DEFAULT_OPT,
    { value: "business impact (revenue, cost, margin)", label: "Business impact" },
    { value: "user impact (adoption, retention, satisfaction)", label: "User impact" },
    { value: "technical impact (performance, reliability, scale)", label: "Technical impact" },
    { value: "team impact (velocity, onboarding, morale)", label: "Team impact" },
    { value: "organizational impact (standards, practices, tooling)", label: "Organizational impact" },
    { value: "product impact (features shipped, roadmap delivered)", label: "Product impact" },
    { value: "customer-facing impact (support reduction, CSAT lift)", label: "Customer-facing impact" },
    { value: "compliance impact (audit findings, policy adherence)", label: "Compliance impact" },
    { value: "security impact (vulns closed, exposure reduced)", label: "Security impact" },
    { value: "innovation impact (patents, novel approaches)", label: "Innovation impact" },
    { value: "platform impact (self-service adoption, leverage)", label: "Platform impact" },
    { value: "data-quality impact (accuracy, freshness, completeness)", label: "Data-quality impact" },
    { value: "analytics impact (insights delivered, decisions enabled)", label: "Analytics impact" },
    { value: "GTM impact (launches, enabling sales/marketing)", label: "GTM impact" },
    { value: "hiring impact (team growth, retention, bar raising)", label: "Hiring impact" },
    { value: "cost-efficiency impact (cloud spend, resource utilization)", label: "Cost-efficiency" },
    { value: "mixed: business and technical balanced", label: "Mixed: business + technical" },
    { value: "mixed: user and product balanced", label: "Mixed: user + product" },
    { value: "mixed: team and organizational balanced", label: "Mixed: team + org" },
    { value: "mixed across all dimensions, no single lens dominant", label: "Mixed: all dimensions" },
  ],
};

const STYLE_DIMENSION_META = [
  { key: "tone",                  label: "Tone" },
  { key: "seniorityPosture",      label: "Seniority posture" },
  { key: "bulletStructure",       label: "Bullet structure" },
  { key: "bulletOpenerPattern",   label: "Bullet opener pattern" },
  { key: "verbPalette",           label: "Verb palette" },
  { key: "sentenceRhythm",        label: "Sentence rhythm" },
  { key: "technologyClustering", label: "Technology clustering" },
  { key: "achievementFlavor",     label: "Achievement flavor" },
  { key: "outcomeFraming",        label: "Outcome framing" },
  { key: "domainVocabularyLevel", label: "Domain vocabulary" },
  { key: "collaborationEmphasis", label: "Collaboration emphasis" },
  { key: "architectureDepth",     label: "Architecture depth" },
  { key: "quantificationFlavor",  label: "Quantification flavor" },
  { key: "skillOrder",            label: "Skills section ordering" },
  { key: "summaryOpeningVariant", label: "Summary opening variant" },
  { key: "bulletRange",           label: "Bullets per role" },
  { key: "summaryLength",         label: "Summary length" },
  { key: "metricDensity",         label: "Metric density" },
];

const emptyStyle = () => STYLE_DIMENSION_META.reduce((o, { key }) => (o[key] = "", o), {});

function toApiStyle(style) {
  const out = {};
  for (const { key } of STYLE_DIMENSION_META) {
    const v = style[key];
    if (!v) continue;
    if (key === "bulletRange" || key === "summaryLength") {
      const [min, max] = String(v).split("-").map(Number);
      if (Number.isFinite(min) && Number.isFinite(max)) out[key] = { min, max };
    } else if (key === "metricDensity") {
      const n = Number(v);
      if (Number.isFinite(n)) out[key] = n;
    } else {
      out[key] = v;
    }
  }
  return out;
}

// Persisted across navigation and app restart (per browser). Cleared on
// logout via lib/api.js.
const GEN_PREFS_KEY = "_gen_prefs";

function loadGenPrefs() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(GEN_PREFS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveGenPrefs(prefs) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(GEN_PREFS_KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
}

export default function Home() {
  const [profiles, setProfiles]               = useState([]);
  const [templates, setTemplates]             = useState([]);
  const [selectedProfile, setSelectedProfile] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("Resume");
  const [jd, setJd]                           = useState("");
  const [jobTitle, setJobTitle]               = useState("");
  const [companyName, setCompanyName]         = useState("");
  const [loading, setLoading]                 = useState(false);
  const [style, setStyle]                     = useState(emptyStyle);
  const [randomize, setRandomize]             = useState(false);
  const [styleOpen, setStyleOpen]             = useState(false);
  const [jobUrl, setJobUrl]                   = useState("");
  const [scraping, setScraping]               = useState(false);
  const [scrapeMsg, setScrapeMsg]             = useState(null);
  const [includeCv, setIncludeCv]             = useState(false);
  const [prefsLoaded, setPrefsLoaded]         = useState(false);

  // Hydrate persisted preferences once on mount.
  useEffect(() => {
    const prefs = loadGenPrefs();
    if (prefs) {
      if (prefs.style && typeof prefs.style === "object") {
        // Only adopt keys the current emptyStyle knows about, in case the
        // dimension list changed between releases.
        const base = emptyStyle();
        for (const k of Object.keys(base)) {
          if (typeof prefs.style[k] === "string") base[k] = prefs.style[k];
        }
        setStyle(base);
      }
      if (typeof prefs.randomize === "boolean") setRandomize(prefs.randomize);
      if (typeof prefs.selectedTemplate === "string" && prefs.selectedTemplate) setSelectedTemplate(prefs.selectedTemplate);
      if (typeof prefs.includeCv === "boolean") setIncludeCv(prefs.includeCv);
      if (typeof prefs.styleOpen === "boolean") setStyleOpen(prefs.styleOpen);
    }
    setPrefsLoaded(true);
  }, []);

  // Persist whenever any of the saved fields change (after the initial
  // hydration, so we never overwrite stored values with the defaults).
  useEffect(() => {
    if (!prefsLoaded) return;
    saveGenPrefs({ style, randomize, selectedTemplate, includeCv, styleOpen });
  }, [prefsLoaded, style, randomize, selectedTemplate, includeCv, styleOpen]);

  const scrapeJobUrl = async (urlToFetch) => {
    const target = (urlToFetch ?? jobUrl).trim();
    if (!target) return;
    if (scraping) return;
    setScraping(true);
    setScrapeMsg(null);
    try {
      const res = await fetch(`${API}/api/scrape-job`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ url: target }),
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch {
        if (res.status === 404) throw new Error("Backend /api/scrape-job not found — restart the backend server to pick up the new route.");
        throw new Error(`Backend returned non-JSON (HTTP ${res.status}).`);
      }
      if (!res.ok) throw new Error(data?.error || `Scrape failed (HTTP ${res.status})`);
      const filled = [];
      if (data.jobDescription) { setJd(data.jobDescription); filled.push("description"); }
      if (data.jobTitle)       { setJobTitle(data.jobTitle);  filled.push("title"); }
      if (data.companyName)    { setCompanyName(data.companyName); filled.push("company"); }
      const sourceLabels = {
        "json-ld": "structured JobPosting data",
        "og-meta": "page metadata (weak — full JD not found)",
        "puppeteer-dom": "rendered page DOM",
      };
      const srcLabel = sourceLabels[data.source]
        || (data.source?.startsWith("embedded-js") ? `embedded JSON (${data.source.replace("embedded-js:", "")})` : data.source || "unknown source");
      const descLen = (data.jobDescription || "").length;
      setScrapeMsg(filled.length
        ? { type: data.source === "og-meta" && descLen < 400 ? "error" : "success",
            text: `Filled ${filled.join(", ")} from ${srcLabel}` + (descLen ? ` (${descLen} chars)` : "") }
        : { type: "error", text: "Nothing extractable found on that page. Paste manually." });
    } catch (err) {
      setScrapeMsg({ type: "error", text: err.message });
    } finally {
      setScraping(false);
    }
  };

  const onJobUrlPaste = (e) => {
    const pasted = e.clipboardData?.getData("text")?.trim();
    if (pasted && /^https?:\/\//i.test(pasted)) {
      // let React set the value, then fetch using the pasted string directly
      setJobUrl(pasted);
      setTimeout(() => scrapeJobUrl(pasted), 0);
    }
  };

  const chStyle = (key, val) => setStyle(s => ({ ...s, [key]: val }));
  const resetStyle = () => setStyle(emptyStyle());
  const styleCount = STYLE_DIMENSION_META.reduce((n, { key }) => n + (style[key] ? 1 : 0), 0);

  useEffect(() => {
    apiGet("/api/profiles").then(r => r.json()).then(setProfiles).catch(console.error);
    fetch(`${API}/api/templates`).then(r => r.json()).then(setTemplates).catch(console.error);
  }, []);

  const generatePDF = async () => {
    if (loading) return;
    if (!selectedProfile)    return alert("Please select a profile");
    if (!jd.trim())          return alert("Please paste a job description");
    if (!jobTitle.trim())    return alert("Please enter the job title");
    if (!companyName.trim()) return alert("Please enter the company name");

    setLoading(true);
    try {
      const apiStyle = toApiStyle(style);
      const body = {
        profile: selectedProfile, jd, template: selectedTemplate, jobTitle, companyName,
        randomize, includeCv,
        jobUrl: jobUrl?.trim() || null,
        ...(Object.keys(apiStyle).length > 0 ? { style: apiStyle } : {}),
      };
      const res = await apiFetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text() || "Generation failed");

      const san  = s => s ? s.replace(/\s+/g, "").replace(/[^A-Za-z0-9]/g, "") : "";
      const prof = profiles.find(p => p.id === selectedProfile);
      const fallbackName = `${san(prof?.name || "resume")}_${san(companyName)}_${san(jobTitle)}.pdf`;

      const downloadBlob = (blob, filename) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      };

      const b64ToBlob = (b64) => {
        const bin = atob(b64);
        const len = bin.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
        return new Blob([bytes], { type: "application/pdf" });
      };

      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await res.json();
        if (data?.resume?.base64) {
          downloadBlob(b64ToBlob(data.resume.base64), data.resume.filename || fallbackName);
        }
        if (data?.cv?.base64) {
          downloadBlob(b64ToBlob(data.cv.base64), data.cv.filename || fallbackName.replace(/\.pdf$/, "_CoverLetter.pdf"));
        }
      } else {
        const blob = await res.blob();
        downloadBlob(blob, fallbackName);
      }
    } catch (err) {
      alert(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        html, body { height:100%; overflow:hidden; }
        body { font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif; background:#0c0a1e; color:#f1f5f9; }
        input,select,textarea,button { font-family:inherit; }
        ::-webkit-scrollbar { width:5px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(139,92,246,0.35); border-radius:6px; }
        select option { background:#1c1733; color:#e2e8f0; }
        .field:focus { border-color:rgba(139,92,246,0.55)!important; box-shadow:0 0 0 3px rgba(139,92,246,0.12)!important; }
        .nav-link:hover { background:rgba(139,92,246,0.1)!important; color:#c4b5fd!important; }
      `}</style>

      <div style={{ display:"flex", height:"100vh", background:"var(--bg)" }}>

        {/* ──────────── SIDEBAR ──────────── */}
        <Sidebar active="generate" />

        {/* ──────────── MAIN ──────────── */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>

          {/* Top bar */}
          <header style={{
            padding:"0 28px", height:"56px", flexShrink:0,
            background:"var(--topbar-bg)", backdropFilter:"blur(12px)",
            borderBottom:"1px solid rgba(139,92,246,0.08)",
            display:"flex", alignItems:"center", justifyContent:"space-between",
          }}>
            <div>
              <h1 style={{ fontSize:"16px", fontWeight:"700", color:"var(--text)" }}>Generate Tailored Resume</h1>
              <p style={{ fontSize:"11px", color:"#4b5563", marginTop:"1px" }}>AI-powered · ATS-optimized · PDF output</p>
            </div>
            <div style={{ display:"flex", gap:"8px" }}>
              {[
                { v:`${templates.length}`, l:"Templates" },
                { v:`${profiles.length}`, l:"Profiles" },
              ].map(({ v, l }) => (
                <div key={l} style={{ padding:"5px 12px", background:"rgba(139,92,246,0.08)", border:"1px solid rgba(139,92,246,0.15)", borderRadius:"8px", textAlign:"center" }}>
                  <div style={{ fontSize:"14px", fontWeight:"700", color:"#a78bfa" }}>{v}</div>
                  <div style={{ fontSize:"10px", color:"#6b7280" }}>{l}</div>
                </div>
              ))}
            </div>
          </header>

          {/* Two-column workspace */}
          <div style={{ flex:1, overflow:"hidden", display:"flex", gap:"0" }}>

            {/* Left panel — controls */}
            <div style={{
              width:"340px", flexShrink:0,
              borderRight:"1px solid rgba(139,92,246,0.08)",
              padding:"22px 20px",
              overflowY:"auto",
              display:"flex", flexDirection:"column", gap:"16px",
            }}>

              {/* Profile */}
              <div>
                <FieldLabel>Profile</FieldLabel>
                <select className="field" value={selectedProfile} onChange={e => setSelectedProfile(e.target.value)} style={{ ...fieldBase, color: selectedProfile ? "var(--text)" : "#6b7280" }}>
                  <option value="">Choose a profile…</option>
                  {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {/* Job URL auto-fill */}
              <div>
                <FieldLabel hint={scraping ? "Fetching…" : "Paste to auto-fill title, company, and description"}>Job URL</FieldLabel>
                <div style={{ display:"flex", gap:"6px" }}>
                  <input
                    className="field"
                    type="url"
                    value={jobUrl}
                    onChange={e => setJobUrl(e.target.value)}
                    onPaste={onJobUrlPaste}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); scrapeJobUrl(); } }}
                    placeholder="https://… (paste to auto-fill)"
                    style={{ ...fieldBase, flex:1 }}
                    disabled={scraping}
                  />
                  <button
                    type="button"
                    onClick={() => scrapeJobUrl()}
                    disabled={scraping || !jobUrl.trim()}
                    style={{
                      padding:"0 14px", fontSize:"12.5px", fontWeight:"600",
                      background: (scraping || !jobUrl.trim()) ? "rgba(139,92,246,0.08)" : "rgba(139,92,246,0.18)",
                      border:"1px solid rgba(139,92,246,0.3)", borderRadius:"9px",
                      color: (scraping || !jobUrl.trim()) ? "#6b7280" : "var(--accent-2)",
                      cursor: (scraping || !jobUrl.trim()) ? "not-allowed" : "pointer",
                      whiteSpace:"nowrap",
                    }}
                  >
                    {scraping ? "…" : "Fetch"}
                  </button>
                </div>
                {scrapeMsg && (
                  <div style={{
                    marginTop:"6px", fontSize:"11px", lineHeight:"1.4",
                    color: scrapeMsg.type === "error" ? "#f87171" : "#6ee7b7",
                  }}>
                    {scrapeMsg.type === "error" ? "✗ " : "✓ "}{scrapeMsg.text}
                  </div>
                )}
              </div>

              {/* Template */}
              <div>
                <FieldLabel>Template</FieldLabel>
                <select className="field" value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)} style={fieldBase}>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              {/* Job Title */}
              <div>
                <FieldLabel>Job Title</FieldLabel>
                <input className="field" type="text" value={jobTitle} onChange={e => setJobTitle(e.target.value)}
                  placeholder="e.g. Senior Software Engineer" style={fieldBase} />
              </div>

              {/* Company */}
              <div>
                <FieldLabel>Company</FieldLabel>
                <input className="field" type="text" value={companyName} onChange={e => setCompanyName(e.target.value)}
                  placeholder="e.g. Google" style={fieldBase} />
              </div>

              {/* Style customization (collapsible) */}
              <div style={{ background:"rgba(139,92,246,0.04)", border:"1px solid rgba(139,92,246,0.12)", borderRadius:"10px", overflow:"hidden", flexShrink:0 }}>
                <button
                  type="button"
                  onClick={() => setStyleOpen(o => !o)}
                  style={{
                    width:"100%", padding:"11px 14px", background:"transparent", border:"none",
                    display:"flex", alignItems:"center", justifyContent:"space-between",
                    cursor:"pointer", color:"var(--accent-2)", fontSize:"12px", fontWeight:"700",
                    textTransform:"uppercase", letterSpacing:"0.7px",
                  }}
                >
                  <span style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                    <span style={{ fontSize:"14px" }}>🎨</span>
                    Style {styleCount > 0 && <span style={{ fontSize:"10px", fontWeight:"600", color:"#a78bfa", background:"rgba(139,92,246,0.15)", padding:"2px 7px", borderRadius:"6px", textTransform:"none", letterSpacing:"0" }}>{randomize ? "random" : `${styleCount} set`}</span>}
                  </span>
                  <span style={{ fontSize:"11px", color:"var(--label)", transform: styleOpen ? "rotate(90deg)" : "rotate(0deg)", transition:"transform 0.15s" }}>▶</span>
                </button>

                {styleOpen && (
                  <div style={{ padding:"4px 14px 14px", borderTop:"1px solid rgba(139,92,246,0.08)" }}>
                    <label style={{ display:"flex", alignItems:"center", gap:"9px", padding:"10px 0 12px", cursor:"pointer", fontSize:"12px", color:"#d4d0ea", fontWeight:"600" }}>
                      <input
                        type="checkbox"
                        checked={randomize}
                        onChange={e => setRandomize(e.target.checked)}
                        style={{ width:"15px", height:"15px", accentColor:"#8b5cf6", cursor:"pointer" }}
                      />
                      <span>Random <span style={{ fontSize:"10.5px", color:"#6b7280", fontWeight:"500" }}>(AI picks all dimensions to best fit the job description)</span></span>
                    </label>

                    <p style={{ fontSize:"10.5px", color:"#6b7280", lineHeight:"1.5", marginBottom:"10px" }}>
                      Leave fields as <span style={{ color:"#a78bfa" }}>— default —</span> to skip them. Set any field to pin that dimension for this generation. Unset fields use the default prompt unless <span style={{ color:"#a78bfa" }}>Random</span> is checked.
                    </p>

                    <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:"8px", opacity: randomize ? 0.45 : 1, pointerEvents: randomize ? "none" : "auto", maxHeight:"52vh", overflowY:"auto", paddingRight:"6px" }}>
                      {STYLE_DIMENSION_META.map(({ key, label }) => (
                        <div key={key}>
                          <label style={{ display:"block", fontSize:"10px", fontWeight:"700", color:"var(--label)", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:"3px" }}>{label}</label>
                          <select
                            className="field"
                            value={style[key]}
                            onChange={e => chStyle(key, e.target.value)}
                            style={{ ...fieldBase, padding:"8px 11px", fontSize:"12.5px" }}
                          >
                            {STYLE_OPTIONS[key].map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>

                    {(styleCount > 0 || randomize) && (
                      <button
                        type="button"
                        onClick={() => { resetStyle(); setRandomize(false); }}
                        style={{ marginTop:"12px", padding:"7px 12px", fontSize:"11.5px", fontWeight:"600", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:"7px", color:"#f87171", cursor:"pointer" }}
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Stats grid */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px", marginTop:"4px" }}>
                {[
                  { icon:"🎯", label:"ATS Score",  val:"95-100%" },
                  { icon:"🤖", label:"AI Model",   val:"GPT-5.4-mini" },
                  { icon:"📄", label:"Templates",  val:`${templates.length} styles` },
                  { icon:"⚡", label:"Avg. Speed", val:"~60s" },
                ].map(({ icon, label, val }) => (
                  <div key={label} style={{
                    background:"rgba(139,92,246,0.05)", border:"1px solid rgba(139,92,246,0.1)",
                    borderRadius:"9px", padding:"10px 12px",
                  }}>
                    <div style={{ fontSize:"15px", marginBottom:"3px" }}>{icon}</div>
                    <div style={{ fontSize:"10px", color:"#6b7280" }}>{label}</div>
                    <div style={{ fontSize:"12px", fontWeight:"600", color:"var(--accent-2)", marginTop:"1px" }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right panel — JD + generate */}
            <div style={{
              flex:1, padding:"22px 24px",
              display:"flex", flexDirection:"column", gap:"14px",
              overflow:"hidden", minWidth:0,
            }}>
              <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
                <FieldLabel hint="Paste the complete job posting — the AI extracts every keyword">
                  Job Description
                </FieldLabel>
                <textarea
                  className="field"
                  value={jd}
                  onChange={e => setJd(e.target.value)}
                  placeholder={"Paste the full job description here...\n\nTip: Include the entire posting — requirements, responsibilities, tech stack. The more context, the better the match."}
                  style={{
                    ...fieldBase,
                    flex:1, resize:"none",
                    lineHeight:"1.65", fontSize:"13px",
                    fontFamily:"'JetBrains Mono','Courier New',monospace",
                    padding:"14px",
                  }}
                />
              </div>

              {/* Include cover letter toggle */}
              <label style={{
                display:"flex", alignItems:"center", gap:"10px",
                padding:"10px 13px",
                background: includeCv ? "rgba(139,92,246,0.10)" : "rgba(139,92,246,0.04)",
                border:`1px solid ${includeCv ? "rgba(139,92,246,0.35)" : "rgba(139,92,246,0.12)"}`,
                borderRadius:"10px",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize:"12.5px", color:"#d4d0ea", fontWeight:"600",
                transition:"all 0.15s",
                flexShrink:0,
              }}>
                <input
                  type="checkbox"
                  checked={includeCv}
                  onChange={e => setIncludeCv(e.target.checked)}
                  disabled={loading}
                  style={{ width:"15px", height:"15px", accentColor:"#8b5cf6", cursor: loading ? "not-allowed" : "pointer" }}
                />
                <span>
                  Include cover letter (CV)
                  <span style={{ fontSize:"10.5px", color:"#6b7280", fontWeight:"500", display:"block", marginTop:"2px" }}>
                    Short, professional CV in the same style as the selected template — both PDFs download together.
                  </span>
                </span>
              </label>

              {/* Generate button */}
              <button
                onClick={generatePDF}
                disabled={loading}
                style={{
                  width:"100%", padding:"15px 24px",
                  fontSize:"15px", fontWeight:"700", letterSpacing:"-0.2px",
                  color: loading ? "#7c3aed" : "#fff",
                  background: loading
                    ? "rgba(109,40,217,0.1)"
                    : "linear-gradient(135deg, #7c3aed 0%, #9333ea 40%, #db2777 100%)",
                  border: loading ? "1px solid rgba(109,40,217,0.25)" : "none",
                  borderRadius:"12px",
                  cursor: loading ? "not-allowed" : "pointer",
                  display:"flex", alignItems:"center", justifyContent:"center", gap:"10px",
                  boxShadow: loading ? "none" : "0 4px 28px rgba(139,92,246,0.4)",
                  transition:"all 0.25s",
                  flexShrink:0,
                }}
              >
                {loading ? (
                  <>
                    <span style={{ width:"17px", height:"17px", border:"2.5px solid transparent", borderTopColor:"#7c3aed", borderRadius:"50%", animation:"spin 0.75s linear infinite", display:"inline-block" }} />
                    {includeCv ? "Generating resume + cover letter…" : "Generating resume…"}
                  </>
                ) : (
                  <>
                    <span style={{ fontSize:"17px" }}>⚡</span>
                    {includeCv ? "Generate Tailored Resume + Cover Letter" : "Generate Tailored Resume"}
                  </>
                )}
              </button>

              {/* Tip */}
              <p style={{ fontSize:"11px", color:"#374151", textAlign:"center", marginTop:"-4px" }}>
                {includeCv
                  ? "Both PDFs download automatically · Generation takes ~75 seconds"
                  : "PDF downloads automatically · Generation takes ~60 seconds"}
              </p>
            </div>

          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin { to { transform:rotate(360deg); } }
      `}</style>
    </>
  );
}
