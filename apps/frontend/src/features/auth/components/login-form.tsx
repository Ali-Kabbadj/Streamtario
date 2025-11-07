"use client";

import { useForm } from "react-hook-form";
import { useGoogleLogin as useGoogleOAuthLogin } from "@react-oauth/google";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogin } from "../hooks/useLogin";
import { useGoogleLogin } from "../hooks/useGoogleLogin";
import { GoogleIcon } from "@/components/shared/google-icon";
import { APP_CONFIG } from "@/config/env";
import { isWebView } from "@/features/player/hooks/useMpvPlayer";

type LoginFormInputs = {
  email: string;
  password: string;
};

export const LoginForm = () => {
  const {
    mutate: loginWithPassword,
    isPending: isPasswordLoginPending,
    error: passwordLoginError,
  } = useLogin();
  const {
    mutate: performGoogleLogin,
    isPending: isGoogleLoginPending,
    error: googleLoginError,
  } = useGoogleLogin();
  const { register, handleSubmit } = useForm<LoginFormInputs>();

  const googleLogin = useGoogleOAuthLogin({
    onSuccess: (codeResponse) => {
      performGoogleLogin({ code: codeResponse.code });
    },
    onError: (error) => {
      console.error("Google OAuth failed:", error);
    },
    flow: "auth-code",
  });

  const handleGoogleSignInClick = () => {
    if (isWebView()) {
      // DESKTOP FLOW
      window.chrome.webview?.postMessage(
        JSON.stringify({
          command: "begin-google-auth",
          payload: {
            clientId: APP_CONFIG.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          },
        }),
      );
    } else {
      // WEB FLOW
      googleLogin();
    }
  };

  const onSubmit = (data: LoginFormInputs) => {
    loginWithPassword(data);
  };

  const isPending = isPasswordLoginPending || isGoogleLoginPending;
  const error = passwordLoginError ?? googleLoginError;

  // --- CUSTOMIZATION ---
  // Change these values to move the display image.
  // Use positive values to move right/down, negative to move left/up.
  const imageOffsetX = "20rem"; // Moves the image to the right
  const imageOffsetY = "7rem"; // Moves the image down

  return (
    // This main container centers everything and holds the background
    <div className="bg-background relative flex min-h-screen w-full items-center justify-center overflow-hidden p-4">
      {/* Background Display Image - Positioned absolutely */}
      <div
        className="pointer-events-none absolute z-10 opacity-80"
        style={{
          transform: `translate(${imageOffsetX}, ${imageOffsetY})`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={"/images/display.png"}
          alt="Display"
          className="w-[90rem] max-w-none rounded-lg"
        />
      </div>

      {/* The main blurred card, positioned on top */}
      <div className="bg-card/50 relative z-20 w-full max-w-4xl overflow-hidden rounded-2xl border border-white/20 shadow-2xl backdrop-blur-lg">
        <div className="flex flex-col md:flex-row">
          {/* Left Side: Logo */}
          <div className="flex w-full items-center justify-center p-8 md:w-1/3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={"/images/app.png"}
              alt="App Logo"
              className="w-40 object-contain"
            />
          </div>

          {/* Right Side: Form */}
          <div className="bg-card/70 w-full p-8 md:w-2/3">
            <div className="mx-auto max-w-sm space-y-4">
              <h1 className="text-primary text-center text-2xl font-bold">
                Sign In
              </h1>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label className="my-3" htmlFor="email">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email", { required: true })}
                    disabled={isPending}
                    className="border-primary"
                  />
                </div>
                <div>
                  <Label className="my-3" htmlFor="password">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    {...register("password", { required: true })}
                    disabled={isPending}
                    className="border-primary"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPasswordLoginPending ? "Signing in..." : "Sign In"}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-600" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-inherit px-2 text-slate-400">Or</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleGoogleSignInClick}
                disabled={isPending}
              >
                {isGoogleLoginPending ? (
                  "Authenticating..."
                ) : (
                  <>
                    <GoogleIcon className="mr-2 h-5 w-5" />
                    Sign in with Google
                  </>
                )}
              </Button>

              {error && (
                <p className="pt-2 text-center text-sm font-medium text-red-400">
                  {error.message}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
