"use client";

import { motion, useInView } from "framer-motion";
import {
  Activity,
  ArrowRight,
  BarChart2,
  Brain,
  GitFork,
  Radio,
  Shield,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { cn } from "~/lib/utils";

/* ─── Static data ───────────────────────────────────────────────── */

const LOGICAL_INTEGRITY = [
  {
    Icon: Brain,
    title: "Logical Debugger",
    desc: "Catch circular reasoning and weak links in real-time. Every premise is mapped to its conclusion so your argument is bulletproof before it lands.",
  },
  {
    Icon: GitFork,
    title: "Argument Architecture",
    desc: "Watch your reasoning tree take shape as you speak. Identify where your logic branches, converges, or collapses — and correct it on the fly.",
  },
  {
    Icon: Shield,
    title: "Evidence Mapping",
    desc: "Surface hidden assumptions and unsupported leaps automatically. Present with the confidence of someone who has already stress-tested every claim.",
  },
] as const;

const COMMUNICATION_FLOW = [
  {
    Icon: Activity,
    title: "Pace & Flow Coaching",
    desc: "Actionable feedback to prevent breathlessness and physical strain. Dynamic pacing cues guide your rhythm so your delivery stays smooth under pressure.",
  },
  {
    Icon: Radio,
    title: "Live Sync",
    desc: "Engage your audience with a visual map that speaks for you. Share a live read-only view so listeners follow your structured logic — not your speech process.",
  },
  {
    Icon: BarChart2,
    title: "Articulation Analytics",
    desc: "Track fluency trends, thought-completion rate, and argument depth over time. Your articulation training, quantified and actionable.",
  },
] as const;

const PERSONAS = [
  {
    group: "High-Stakes Communicators",
    tagline: "Precision under pressure.",
    body: "Executives, attorneys, and consultants use Logos Flow to ensure every presentation, oral argument, and client conversation is backed by airtight logic and delivered with commanding clarity.",
  },
  {
    group: "Fluency-Focused Speakers",
    tagline: "Your thinking deserves to be heard.",
    body: "Logos Flow was built for the space between what you think and what listeners hear. Reduce cognitive load, navigate speech mechanics, and let your ideas land exactly as sharp as they are.",
  },
  {
    group: "Students & Academic Debaters",
    tagline: "Build arguments that hold.",
    body: "Seminar, thesis defence, or competitive debate — see your argument structure in real time and catch logical gaps before your audience does.",
  },
] as const;

/* ─── Bottleneck animation ──────────────────────────────────────── */

function BottleneckAnimation() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });

  const W = 680;
  const H = 240;

  const PARTICLES = [
    { cx: 38, cy: 44 },
    { cx: 85, cy: 108 },
    { cx: 52, cy: 168 },
    { cx: 138, cy: 68 },
    { cx: 158, cy: 140 },
    { cx: 100, cy: 192 },
    { cx: 25, cy: 112 },
    { cx: 168, cy: 32 },
  ] as const;

  const RADII = [5, 4, 6, 3, 5, 3, 4, 3] as const;

  const JITTER = [
    { x: [0, 5, -3, 7, -4, 0], y: [0, -4, 6, -2, 5, 0], dur: 2.8 },
    { x: [0, -5, 3, -7, 2, 0], y: [0, 3, -5, 4, -2, 0], dur: 3.2 },
    { x: [0, 4, -6, 3, -5, 0], y: [0, -3, 4, -6, 3, 0], dur: 2.5 },
    { x: [0, -4, 5, -3, 6, 0], y: [0, 5, -3, 6, -4, 0], dur: 3.5 },
    { x: [0, 6, -4, 5, -3, 0], y: [0, -5, 4, -3, 6, 0], dur: 2.9 },
    { x: [0, -3, 6, -5, 4, 0], y: [0, 4, -6, 3, -5, 0], dur: 3.1 },
    { x: [0, 5, -3, 4, -6, 0], y: [0, -2, 5, -4, 3, 0], dur: 2.7 },
    { x: [0, -4, 3, -6, 5, 0], y: [0, 3, -4, 5, -3, 0], dur: 3.3 },
  ] as const;

  const CHAOS_LINES: [number, number][] = [
    [0, 1],
    [1, 2],
    [3, 4],
    [5, 2],
    [6, 1],
    [7, 3],
  ];

  const FUNNEL_TOP = `M 188,20  C 238,20  272,112 314,120`;
  const FUNNEL_BOTTOM = `M 188,220 C 238,220 272,128 314,120`;
  const FUNNEL_FILL = `M 188,20  C 238,20  272,112 314,120 C 272,128 238,220 188,220 Z`;

  const TREE_EDGES = [
    { x1: 448, y1: 120, x2: 396, y2: 72 },
    { x1: 448, y1: 120, x2: 500, y2: 72 },
    { x1: 396, y1: 72, x2: 368, y2: 32 },
    { x1: 396, y1: 72, x2: 424, y2: 32 },
    { x1: 500, y1: 72, x2: 472, y2: 32 },
    { x1: 500, y1: 72, x2: 528, y2: 32 },
    { x1: 448, y1: 120, x2: 396, y2: 168 },
    { x1: 448, y1: 120, x2: 500, y2: 168 },
    { x1: 396, y1: 168, x2: 368, y2: 208 },
    { x1: 396, y1: 168, x2: 424, y2: 208 },
  ];

  const TREE_NODES = [
    { cx: 448, cy: 120, r: 13, warm: true, delay: 1.1 },
    { cx: 396, cy: 72, r: 9, warm: false, delay: 1.4 },
    { cx: 500, cy: 72, r: 9, warm: false, delay: 1.6 },
    { cx: 368, cy: 32, r: 6, warm: false, delay: 1.8 },
    { cx: 424, cy: 32, r: 6, warm: false, delay: 2.0 },
    { cx: 472, cy: 32, r: 6, warm: false, delay: 2.2 },
    { cx: 528, cy: 32, r: 6, warm: false, delay: 2.4 },
    { cx: 396, cy: 168, r: 9, warm: false, delay: 1.5 },
    { cx: 500, cy: 168, r: 9, warm: false, delay: 1.7 },
    { cx: 368, cy: 208, r: 6, warm: false, delay: 1.9 },
    { cx: 424, cy: 208, r: 6, warm: false, delay: 2.1 },
  ];

  return (
    <div
      ref={ref}
      className="overflow-hidden rounded-2xl border border-border bg-muted/5"
    >
      <div className="flex items-center justify-between border-b border-border px-8 py-2.5 text-xs text-muted-foreground">
        <span>Unstructured speech</span>
        <span className="font-medium text-brand-warm">Logic engine</span>
        <span className="font-medium text-brand-blue">Articulated output</span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden="true">
        <rect
          x="0"
          y="0"
          width="188"
          height={H}
          fill="oklch(0.5 0.12 280 / 0.04)"
        />
        <rect
          x="315"
          y="0"
          width="365"
          height={H}
          fill="oklch(0.62 0.16 238 / 0.04)"
        />

        {CHAOS_LINES.map(([a, b], i) => (
          <motion.path
            key={i}
            d={`M ${PARTICLES[a].cx} ${PARTICLES[a].cy} L ${PARTICLES[b].cx} ${PARTICLES[b].cy}`}
            stroke="oklch(0.55 0.18 270 / 0.5)"
            strokeWidth="1"
            strokeDasharray="3 3"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={inView ? { pathLength: 1, opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.06 + i * 0.08 }}
          />
        ))}

        {PARTICLES.map((p, i) => {
          const j = JITTER[i];
          return (
            <motion.g
              key={i}
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 0.8, x: [...j.x], y: [...j.y] } : {}}
              transition={{
                opacity: { duration: 0.4, delay: i * 0.06 },
                x: {
                  duration: j.dur,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.2,
                },
                y: {
                  duration: j.dur,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.2,
                },
              }}
            >
              <circle
                cx={p.cx}
                cy={p.cy}
                r={RADII[i]}
                fill="oklch(0.55 0.18 270)"
              />
            </motion.g>
          );
        })}

        <motion.path
          d={FUNNEL_FILL}
          fill="oklch(0.62 0.16 238 / 0.07)"
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.7, delay: 0.5 }}
        />

        {[FUNNEL_TOP, FUNNEL_BOTTOM].map((d, i) => (
          <motion.path
            key={i}
            d={d}
            fill="none"
            stroke="oklch(0.62 0.16 238 / 0.55)"
            strokeWidth="1.5"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={inView ? { pathLength: 1, opacity: 1 } : {}}
            transition={{ duration: 0.7, delay: 0.5 + i * 0.05 }}
          />
        ))}

        <motion.circle
          cx="314"
          cy="120"
          r="8"
          fill="oklch(0.78 0.12 62)"
          style={{ transformOrigin: "314px 120px" }}
          initial={{ scale: 0, opacity: 0 }}
          animate={inView ? { scale: [0, 1.5, 1], opacity: [0, 1, 0.9] } : {}}
          transition={{ duration: 0.5, delay: 1.0 }}
        />

        {TREE_EDGES.map((e, i) => (
          <motion.path
            key={i}
            d={`M ${e.x1} ${e.y1} L ${e.x2} ${e.y2}`}
            stroke="oklch(0.62 0.16 238 / 0.55)"
            strokeWidth="1.5"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={inView ? { pathLength: 1, opacity: 1 } : {}}
            transition={{ duration: 0.25, delay: 1.15 + i * 0.09 }}
          />
        ))}

        {TREE_NODES.map((n, i) => (
          <motion.g
            key={i}
            style={{ transformOrigin: `${n.cx}px ${n.cy}px` }}
            initial={{ scale: 0, opacity: 0 }}
            animate={inView ? { scale: 1, opacity: 1 } : {}}
            transition={{
              type: "spring",
              stiffness: 320,
              damping: 22,
              delay: n.delay,
            }}
          >
            <circle
              cx={n.cx}
              cy={n.cy}
              r={n.r}
              fill={n.warm ? "oklch(0.78 0.12 62)" : "oklch(0.62 0.16 238)"}
              fillOpacity={n.warm ? 0.9 : 0.75}
            />
          </motion.g>
        ))}
      </svg>

      <p className="border-t border-border px-6 py-3 text-center text-xs text-muted-foreground">
        <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-brand-blue align-middle" />
        Logic nodes built live — debug your argument as you articulate it
      </p>
    </div>
  );
}

/* ─── Track feature card ────────────────────────────────────────── */

function TrackCard({
  Icon,
  title,
  desc,
  accent,
  delay,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  accent: "blue" | "warm";
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45, delay }}
    >
      <Card className="h-full border-border bg-muted/5 transition-colors hover:bg-muted/10">
        <CardHeader className="gap-3 pb-0">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              accent === "blue"
                ? "bg-brand-blue/10 text-brand-blue"
                : "bg-brand-warm/10 text-brand-warm",
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <CardDescription className="text-sm leading-relaxed">
            {desc}
          </CardDescription>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="h-full overflow-y-auto">
      <main className="flex flex-col items-center">
        {/* ── Hero ──────────────────────────────────────────────── */}
        <section className="flex min-h-[calc(100svh-4rem)] w-full max-w-5xl flex-col items-center justify-center px-6 py-24 text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted/30 px-4 py-1.5 text-xs text-muted-foreground"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-brand-blue" />
            Logical Articulation Platform
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-6 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl"
          >
            Master the Logic.{" "}
            <span className="bg-gradient-to-r from-brand-warm to-[oklch(0.82_0.14_55)] bg-clip-text text-transparent">
              Perfect the Delivery.
            </span>
          </motion.h1>

          {/* Sub-headline */}
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-10 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl"
          >
            Logos Flow is the first communication trainer that maps your logic
            while you speak. Bridge the gap between deep thought and effortless
            expression.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-4"
          >
            <Button
              asChild
              size="lg"
              className="gap-2 bg-brand-warm px-7 text-brand-warm-foreground hover:bg-brand-warm/90"
            >
              <Link href="/app">
                Launch App <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#how-it-works">See how it works</a>
            </Button>
          </motion.div>
        </section>

        {/* ── How it works ──────────────────────────────────────── */}
        <section
          id="how-it-works"
          className="w-full max-w-5xl scroll-mt-16 px-6 py-20"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
            className="mb-12 text-center"
          >
            <h2 className="mb-3 text-3xl font-bold sm:text-4xl">
              Dual Training. One Session.
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Most tools help you talk. We help you communicate. By visualizing
              your logic, we reduce the cognitive load of speaking — allowing
              you to focus on your rhythm and resonance.
            </p>
          </motion.div>
          <BottleneckAnimation />

          {/* Dual engine callout */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-10 grid gap-4 sm:grid-cols-2"
          >
            <div className="rounded-2xl border border-brand-blue/20 bg-brand-blue/5 p-6">
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-brand-blue">
                Track 1
              </p>
              <h3 className="mb-2 text-lg font-bold">Logical Integrity</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Your argument is stress-tested in real time. Fallacies, weak
                links, and unsupported claims are surfaced before your audience
                hears them.
              </p>
            </div>
            <div className="rounded-2xl border border-brand-warm/20 bg-brand-warm/5 p-6">
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-brand-warm">
                Track 2
              </p>
              <h3 className="mb-2 text-lg font-bold">Communication Flow</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Dynamic pacing cues and sentence chunking guide your delivery.
                Friction points are identified so you can navigate them with
                composure.
              </p>
            </div>
          </motion.div>
        </section>

        {/* ── Track 1: Logical Integrity ────────────────────────── */}
        <section className="w-full max-w-5xl px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5 }}
            className="mb-10"
          >
            <span className="mb-3 inline-block rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-semibold text-brand-blue">
              Track 1 — Logical Integrity
            </span>
            <h2 className="mb-2 text-2xl font-bold sm:text-3xl">
              Speaking Logically Sound
            </h2>
            <p className="max-w-xl text-muted-foreground">
              Your second brain for argumentation. Know your logic holds before
              a single word reaches the room.
            </p>
          </motion.div>

          <div className="grid gap-5 sm:grid-cols-3">
            {LOGICAL_INTEGRITY.map((f, i) => (
              <TrackCard
                key={f.title}
                Icon={f.Icon}
                title={f.title}
                desc={f.desc}
                accent="blue"
                delay={i * 0.1}
              />
            ))}
          </div>
        </section>

        {/* ── Track 2: Communication Flow ───────────────────────── */}
        <section className="w-full max-w-5xl px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5 }}
            className="mb-10"
          >
            <span className="mb-3 inline-block rounded-full bg-brand-warm/10 px-3 py-1 text-xs font-semibold text-brand-warm">
              Track 2 — Communication Flow
            </span>
            <h2 className="mb-2 text-2xl font-bold sm:text-3xl">
              Speaking with Ease
            </h2>
            <p className="max-w-xl text-muted-foreground">
              Your personal coach for voice and rhythm. Reduce the friction
              between thought and expression so your presence is felt, not just
              heard.
            </p>
          </motion.div>

          <div className="grid gap-5 sm:grid-cols-3">
            {COMMUNICATION_FLOW.map((f, i) => (
              <TrackCard
                key={f.title}
                Icon={f.Icon}
                title={f.title}
                desc={f.desc}
                accent="warm"
                delay={i * 0.1}
              />
            ))}
          </div>
        </section>

        {/* ── Who it's for ──────────────────────────────────────── */}
        <section className="w-full max-w-5xl px-6 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5 }}
            className="mb-12 text-center"
          >
            <h2 className="mb-3 text-3xl font-bold sm:text-4xl">
              Built for every articulate mind
            </h2>
            <p className="text-muted-foreground">
              Whether you are sharpening your edge or finding your voice —
              Logos Flow meets you where you are.
            </p>
          </motion.div>

          <div className="grid gap-5 lg:grid-cols-3">
            {PERSONAS.map((p, i) => (
              <motion.div
                key={p.group}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, delay: i * 0.12 }}
                className="rounded-2xl border border-border bg-muted/5 p-6"
              >
                <h3 className="mb-1 text-sm font-semibold">{p.group}</h3>
                <p className="mb-3 text-sm font-medium text-brand-warm">
                  {p.tagline}
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {p.body}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Final CTA ─────────────────────────────────────────── */}
        <section className="w-full px-6 py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-2xl rounded-3xl border border-border bg-muted/5 px-8 py-16 text-center"
          >
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
              Your second brain. Your personal coach.
            </h2>
            <p className="mb-8 text-muted-foreground">
              Your arguments are already there.
              <br />
              Let Logos Flow make them visible — and your delivery
              unmistakable.
            </p>
            <Button
              asChild
              size="lg"
              className="gap-2 bg-brand-warm px-8 text-brand-warm-foreground hover:bg-brand-warm/90"
            >
              <Link href="/app">
                Launch App <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </section>
      </main>
    </div>
  );
}
