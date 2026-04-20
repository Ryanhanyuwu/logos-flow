"use client";

import { motion, useInView } from "framer-motion";
import { ArrowRight, BarChart2, Filter, GitFork, Users } from "lucide-react";
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

const FEATURES = [
  {
    Icon: GitFork,
    title: "Live Logic Mapping",
    desc: "Every spoken premise and conclusion renders as a live node graph — your argument visualised in real time as you think out loud.",
  },
  {
    Icon: Filter,
    title: "Disfluency Filtering",
    desc: "Filler words, repetitions, and blocks are stripped automatically. What reaches your audience is only the signal — never the noise.",
  },
  {
    Icon: Users,
    title: "Audience Sync",
    desc: "Share a live read-only view. Your audience sees the structured logic tree the moment you build it — not your speech process.",
  },
  {
    Icon: BarChart2,
    title: "Session Analytics",
    desc: "Track fluency trends, thought-completion rate, and argument depth over time. Your progress, as clear as your logic.",
  },
] as const;

const PERSONAS = [
  {
    primary: true,
    group: "People Who Stutter, Clutter, or Have Apraxia",
    tagline: "Your mind runs faster than your mouth. This bridges the gap.",
    body: "Logos Flow was built for the space between what you think and what listeners hear. Use it in meetings, presentations, interviews — any moment where your ideas deserve to land fully.",
  },
  {
    primary: false,
    group: "Law Students & Legal Professionals",
    tagline: "Structure is your edge.",
    body: "Oral arguments and client consultations demand clear logical chains under pressure. Logos Flow turns preparation into a live visual map your judges can follow.",
  },
  {
    primary: false,
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

  // Left-side speech particles
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

  // Per-particle jitter keyframes
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

  // Tangled dashed lines between particles (index pairs)
  const CHAOS_LINES: [number, number][] = [
    [0, 1],
    [1, 2],
    [3, 4],
    [5, 2],
    [6, 1],
    [7, 3],
  ];

  // Funnel SVG paths (converge to x=314, y=120)
  const FUNNEL_TOP = `M 188,20  C 238,20  272,112 314,120`;
  const FUNNEL_BOTTOM = `M 188,220 C 238,220 272,128 314,120`;
  const FUNNEL_FILL = `M 188,20  C 238,20  272,112 314,120 C 272,128 238,220 188,220 Z`;

  // Tree structure (right zone, x > 314)
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
      {/* Zone labels */}
      <div className="flex items-center justify-between border-b border-border px-8 py-2.5 text-xs text-muted-foreground">
        <span>Raw speech</span>
        <span className="font-medium text-brand-warm">Logic engine</span>
        <span className="font-medium text-brand-blue">Structured output</span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden="true">
        {/* Zone tint backgrounds */}
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

        {/* Chaotic dashed connection lines (left) */}
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

        {/* Jittery speech particles */}
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

        {/* Funnel fill */}
        <motion.path
          d={FUNNEL_FILL}
          fill="oklch(0.62 0.16 238 / 0.07)"
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.7, delay: 0.5 }}
        />

        {/* Funnel outline paths */}
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

        {/* Convergence glow (amber dot) */}
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

        {/* Tree edges */}
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

        {/* Tree nodes */}
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
        Live logic nodes — built as you speak
      </p>
    </div>
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
            Speech-first thinking tool
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-6 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl"
          >
            Your Logic.{" "}
            <span className="bg-gradient-to-r from-brand-blue to-[oklch(0.7_0.18_260)] bg-clip-text text-transparent">
              Visible.
            </span>{" "}
            Irrefutable.
          </motion.h1>

          {/* Sub-headline */}
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-10 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl"
          >
            Stuttering, cluttering, and apraxia don&apos;t slow your mind — only
            your motor delivery. Logos Flow separates your intellectual
            bandwidth from speech mechanics so your arguments land exactly as
            sharp as they are.
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

        {/* ── Bottleneck visual ─────────────────────────────────── */}
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
              From tangled to clear
            </h2>
            <p className="text-muted-foreground">
              Your ideas enter as speech. They exit as structured logic.
            </p>
          </motion.div>
          <BottleneckAnimation />
        </section>

        {/* ── Features grid ─────────────────────────────────────── */}
        <section className="w-full max-w-5xl px-6 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5 }}
            className="mb-12 text-center"
          >
            <h2 className="mb-3 text-3xl font-bold sm:text-4xl">
              Built for your thinking, not your tongue
            </h2>
            <p className="text-muted-foreground">
              Four tools that close the gap between what you mean and what
              others hear.
            </p>
          </motion.div>

          <div className="grid gap-5 sm:grid-cols-2">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, delay: i * 0.1 }}
              >
                <Card className="h-full border-border bg-muted/5 transition-colors hover:bg-muted/10">
                  <CardHeader className="gap-3 pb-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
                      <f.Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-base">{f.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <CardDescription className="text-sm leading-relaxed">
                      {f.desc}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
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
              Who it&apos;s for
            </h2>
            <p className="text-muted-foreground">
              For anyone whose thinking outpaces what speech can carry.
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
                className={cn(
                  "rounded-2xl border p-6",
                  p.primary
                    ? "border-brand-blue/30 bg-brand-blue/5"
                    : "border-border bg-muted/5",
                )}
              >
                {p.primary && (
                  <span className="mb-4 inline-block rounded-full bg-brand-blue/15 px-3 py-0.5 text-xs font-medium text-brand-blue">
                    Primary audience
                  </span>
                )}
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
              Ready to think without limits?
            </h2>
            <p className="mb-8 text-muted-foreground">
              Your arguments are already there.
              <br />
              Let Logos Flow make them visible.
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
