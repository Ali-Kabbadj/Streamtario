"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/providers/auth-provider";
import { useProfileContext } from "@/providers/profile-provider";
import { ProfileCard } from "./components/profile-card";
import { PlusCircle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CreateProfileForm } from "./components/create-profile-form";

// Animation variants remain the same
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
  },
};

export const ProfileSelectionFeature = () => {
  const { user } = useAuth();
  const { selectProfile } = useProfileContext();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // --- THIS IS THE FIX ---
  // The <Sheet> component now wraps the entire feature.
  // This ensures that all its children, especially SheetContent,
  // are always within the correct React context provided by the parent Sheet.
  return (
    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-12 bg-slate-900 text-white">
        <motion.h1
          className="text-5xl font-bold tracking-tight"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          Who's Watching?
        </motion.h1>

        <motion.div
          className="flex flex-wrap items-center justify-center gap-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {user?.profiles.map((profile) => (
            <motion.div key={profile.id} variants={itemVariants}>
              <ProfileCard
                profile={profile}
                onSelect={() => selectProfile(profile)}
              />
            </motion.div>
          ))}

          <motion.div variants={itemVariants}>
            <button
              onClick={() => setIsSheetOpen(true)} // This now just toggles the state
              className="flex h-[184px] w-32 flex-col items-center justify-center gap-4 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white focus:ring-2 focus:ring-slate-400 focus:outline-none"
            >
              <PlusCircle size={64} />
              <span className="text-xl font-medium">Add Profile</span>
            </button>
          </motion.div>
        </motion.div>
      </div>

      {/* SheetContent is now correctly nested inside the Sheet parent */}
      <SheetContent className="border-slate-700 bg-slate-900 text-white">
        <SheetHeader>
          <SheetTitle className="text-2xl">Create a New Profile</SheetTitle>
          <SheetDescription>
            This profile will be added to your account.
          </SheetDescription>
        </SheetHeader>
        <CreateProfileForm onSuccess={() => setIsSheetOpen(false)} />
      </SheetContent>
    </Sheet>
  );
};
