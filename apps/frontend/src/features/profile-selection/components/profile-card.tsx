"use client";

import { motion } from "framer-motion"; // <-- IMPORT
import type { Profile } from "@/orchestrators/graphql-query-orchestrator/gen/graphql";

interface ProfileCardProps {
  profile: Pick<Profile, "id" | "name" | "avatar">;
  onSelect: () => void;
}

export const ProfileCard = ({ profile, onSelect }: ProfileCardProps) => {
  return (
    <motion.button
      onClick={onSelect}
      className="flex flex-col items-center gap-4 rounded-lg p-2 focus:ring-2 focus:ring-slate-400 focus:outline-none"
      // Add animation properties
      whileHover={{ scale: 1.05, backgroundColor: "rgba(30, 41, 59, 0.5)" }} // bg-slate-800 with opacity
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={profile.avatar ?? "/default-avatar.png"}
        alt={profile.name ?? "Profile"}
        className="h-32 w-32 rounded-lg object-cover shadow-lg"
      />
      <span className="text-xl font-medium tracking-tight text-slate-200">
        {profile.name}
      </span>
    </motion.button>
  );
};
