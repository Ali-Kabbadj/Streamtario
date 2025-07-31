"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/providers/auth-provider";
import { ProfileCard } from "./components/profile-card";
import { PlusCircle, LogOut } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CreateProfileForm } from "./components/create-profile-form";
import { useVerifyPin } from "./hooks/useVerifyPin";
import { PinInputDialog } from "@/components/shared/PinInputDialog";
import type { AccountQuery } from "@/orchestrators/graphql-query-orchestrator/gen/graphql";

type SelectableProfile = NonNullable<AccountQuery["account"]>["profiles"][0];

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

interface ProfileSelectionFeatureProps {
  onProfileSelect: (profile: SelectableProfile) => void;
}

export const ProfileSelectionFeature = ({
  onProfileSelect,
}: ProfileSelectionFeatureProps) => {
  const { user, logout } = useAuth();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [profileToUnlock, setProfileToUnlock] =
    useState<SelectableProfile | null>(null);
  const {
    mutate: verifyPin,
    isPending: isVerifyingPin,
    error: pinError,
    reset: resetPinMutation,
  } = useVerifyPin();

  const handleProfileClick = (profile: SelectableProfile) => {
    if (profile.isPrivate) {
      setProfileToUnlock(profile);
      setIsPinDialogOpen(true);
    } else {
      onProfileSelect(profile);
    }
  };

  const handlePinVerify = (pin: string) => {
    if (!profileToUnlock) return;
    verifyPin(
      { profileId: profileToUnlock.id, pin },
      {
        onSuccess: () => {
          onProfileSelect(profileToUnlock);
          setIsPinDialogOpen(false);
          setProfileToUnlock(null);
        },
      },
    );
  };

  const handlePinDialogClose = () => {
    setIsPinDialogOpen(false);
    setProfileToUnlock(null);
    resetPinMutation();
  };

  return (
    <>
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <div className="bg-background flex h-screen w-screen flex-col items-center justify-center gap-12 text-white">
          <motion.button
            onClick={logout}
            className="absolute top-6 right-6 flex items-center gap-1 rounded-lg border-2 border-solid px-3 py-2 text-slate-400 transition-colors hover:bg-red-600 hover:text-white"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, type: "spring" }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <span>Leave</span>
            <LogOut size={20} />
          </motion.button>

          <motion.h1
            className="text-secondary text-5xl font-bold tracking-tight"
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            Who&apos;s Watching?
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
                  onSelect={() => handleProfileClick(profile)}
                />
              </motion.div>
            ))}

            <motion.div variants={itemVariants}>
              <button
                onClick={() => setIsSheetOpen(true)}
                className="hover:bg-card text-foreground flex h-[184px] w-32 flex-col items-center justify-center gap-4 rounded-lg p-2 transition-colors hover:text-white focus:ring-2 focus:ring-slate-400 focus:outline-none"
              >
                <PlusCircle size={64} />
                <span className="text-xl font-medium">Add Profile</span>
              </button>
            </motion.div>
          </motion.div>
        </div>

        <SheetContent className="bg-primary border-slate-700 text-white">
          <SheetHeader>
            <SheetTitle className="text-2xl">Create a New Profile</SheetTitle>
            <SheetDescription>
              This profile will be added to your account.
            </SheetDescription>
          </SheetHeader>
          <CreateProfileForm onSuccess={() => setIsSheetOpen(false)} />
        </SheetContent>
      </Sheet>

      <PinInputDialog
        isOpen={isPinDialogOpen}
        onClose={handlePinDialogClose}
        onVerify={handlePinVerify}
        isVerifying={isVerifyingPin}
        error={pinError?.message}
      />
    </>
  );
};
