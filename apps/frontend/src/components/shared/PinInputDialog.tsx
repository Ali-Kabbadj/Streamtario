"use client";
import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { LoaderIcon } from "lucide-react";
interface PinInputDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (pin: string) => void;
  isVerifying: boolean;
  error?: string | null;
}
export const PinInputDialog = ({
  isOpen,
  onClose,
  onVerify,
  isVerifying,
  error,
}: PinInputDialogProps) => {
  const [pin, setPin] = useState("");
  const [shouldShowError, setShouldShowError] = useState(true);
  const otpRef = useRef<HTMLInputElement>(null);

  // Focus the OTP input when there's an error
  useEffect(() => {
    if (error && otpRef.current) {
      otpRef.current.focus();
      setShouldShowError(true);
    }
  }, [error]);

  const handlePinChange = (value: string) => {
    setPin(value);
    // Clear error display when user starts typing again
    if (error && shouldShowError) {
      setShouldShowError(false);
    }
  };

  const handleSubmit = () => {
    if (pin.length === 4) {
      onVerify(pin);
    }
  };
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      setPin(""); // Reset PIN on close
    }
  };
  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-card text-primary border-slate-700 focus:outline-none sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">Enter PIN</DialogTitle>
          <DialogDescription className="text-secondary text-center">
            This profile is locked. Please enter the 4-digit PIN to continue.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-6 py-4">
          <InputOTP
            ref={otpRef}
            maxLength={4}
            value={pin}
            onChange={handlePinChange}
            onComplete={handleSubmit}
            disabled={isVerifying}
            autoComplete="off"
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
            </InputOTPGroup>
          </InputOTP>
          {error && shouldShowError && (
            <p className="text-sm font-medium text-red-500">{error}</p>
          )}
          {isVerifying && <LoaderIcon />}
        </div>
      </DialogContent>
    </Dialog>
  );
};
