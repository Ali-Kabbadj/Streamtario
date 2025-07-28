"use client";

import { hover, motion } from "framer-motion";
import type { Profile } from "@/orchestrators/graphql-query-orchestrator/gen/graphql";
import Image from "next/image";

interface ProfileCardProps {
  profile: Pick<Profile, "id" | "name" | "avatar">;
  onSelect: () => void;
}

export const ProfileCard = ({ profile, onSelect }: ProfileCardProps) => {
  return (
    <motion.button
      onClick={onSelect}
      className="focus:bg-accent flex flex-col items-center gap-4 rounded-lg p-2 focus:ring-2 focus:outline-none"
      whileHover={{ scale: 1.05, background: "var(--card)" }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      <Image
        src={profile.avatar ?? "/default-avatar.png"}
        alt={profile.name ?? "Profile"}
        className="h-32 w-32 rounded-lg object-cover shadow-lg"
        width={10}
        height={10}
      />
      <span className="text-xl font-medium tracking-tight text-slate-200">
        {profile.name}
      </span>
    </motion.button>
  );
};
