"use client";

import Image from "next/image";

interface PreparingSplashProps {
  logoUrl?: string | null;
  progress: number; // A value between 0 and 1
}

export function PreparingSplash({ logoUrl, progress }: PreparingSplashProps) {
  const fillPercentage = `${Math.min(progress * 100, 100)}%`;

  if (!logoUrl) {
    // Fallback for when there is no logo
    return <div className="text-xl font-semibold">Loading...</div>;
  }

  return (
    <div className="relative h-48 w-96">
      {/* Background, faded version */}
      <Image
        src={logoUrl}
        alt="Loading media"
        fill
        className="object-contain opacity-30 grayscale filter"
        unoptimized
      />
      {/* Foreground, full-color version, revealed by the clipping container */}
      <div
        className="absolute top-0 left-0 h-full overflow-hidden transition-all duration-500 ease-linear"
        style={{ width: fillPercentage }}
      >
        <Image
          src={logoUrl}
          alt="Loading media"
          className="h-48 w-96 object-contain"
          fill
          // style={{ width: "24rem", height: "12rem" }} // Explicit size to prevent layout shift inside the clipper
          unoptimized
        />
      </div>
    </div>
  );
}
