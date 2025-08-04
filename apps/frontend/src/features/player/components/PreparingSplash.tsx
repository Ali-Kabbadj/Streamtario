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
    // This is the main container that sets the size and positioning context.
    <div className="relative h-48 w-96">
      {/* Layer 1: The grayscale background image. It is always visible. */}
      <Image
        src={logoUrl}
        alt="Loading media background"
        fill
        className="object-contain opacity-30 grayscale filter"
        unoptimized
        priority
      />
      {/* Layer 2: The clipping container (motion.div). It starts at width 0 and animates to full width.
          The `overflow-hidden` is the key to the clipping effect. */}
      <motion.div
        className="absolute top-0 left-0 h-full overflow-hidden"
        initial={{ width: "0%" }}
        animate={animationControls}
      >
        {/* Layer 3: The full-color image. It is placed inside a div that is ALWAYS full-width.
            This prevents the image itself from resizing. It is simply revealed as the parent clipper expands. */}
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
