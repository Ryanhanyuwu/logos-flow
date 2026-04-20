"use client";

import { motion, useAnimation } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "~/lib/utils";

type Phase = "in" | "out";

interface BreathingPacerProps {
  large?: boolean;
}

export function BreathingPacer({ large = false }: BreathingPacerProps) {
  const controls = useAnimation();
  const [phase, setPhase] = useState<Phase>("in");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      while (!cancelled) {
        setPhase("in");
        try {
          await controls.start({
            scale: large ? 2.0 : 1.6,
            opacity: 0.9,
            transition: { duration: 4, ease: "easeInOut" },
          });
        } catch {
          break;
        }
        if (cancelled) break;

        setPhase("out");
        try {
          await controls.start({
            scale: 1,
            opacity: 0.45,
            transition: { duration: 6, ease: "easeInOut" },
          });
        } catch {
          break;
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [controls, large]);

  return (
    <div className={cn("flex flex-col items-center", large ? "gap-8" : "gap-2.5")}>
      <motion.div
        animate={controls}
        initial={{ scale: 1, opacity: 0.45 }}
        className={cn(
          "rounded-full bg-sky-400/15 border border-sky-400/25",
          "shadow-[0_0_40px_rgba(56,189,248,0.12)]",
          large ? "size-24" : "size-10",
        )}
      />
      <motion.p
        key={phase}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className={cn(
          "font-light tracking-[0.18em] uppercase text-sky-300/50",
          large ? "text-sm" : "text-[9px]",
        )}
      >
        {phase === "in" ? "Breathe In" : "Breathe Out"}
      </motion.p>
    </div>
  );
}
