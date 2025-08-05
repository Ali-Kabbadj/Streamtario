"use client";

import Image from "next/image";
import { motion, type animationControls } from "framer-motion";

interface PreparingSplashProps {
  logoUrl?: string | null;
  animationControls: ReturnType<typeof animationControls>;
}

export function PreparingSplash({
  logoUrl,
  animationControls,
}: PreparingSplashProps) {
  if (!logoUrl) {
    return <div className="text-xl font-semibold">Loading...</div>;
  }

  return (
    <div className="relative h-48 w-96">
      <Image
        src={logoUrl}
        alt="Loading media background"
        fill
        className="object-contain opacity-30 grayscale filter"
        unoptimized
        priority
      />
      <motion.div
        className="absolute top-0 left-0 h-full overflow-hidden"
        initial={{ width: "0%" }}
        animate={animationControls}
      >
        <div className="relative h-48 w-96">
          <Image
            src={logoUrl}
            alt="Loading media foreground"
            fill
            className="object-contain"
            unoptimized
            priority
          />
        </div>
      </motion.div>
    </div>
  );
}
