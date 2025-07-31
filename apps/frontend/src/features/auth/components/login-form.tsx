"use client";

import { useForm } from "react-hook-form";
import { useGoogleLogin as useGoogleOAuthLogin } from "@react-oauth/google";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogin } from "../hooks/useLogin";
import { useGoogleLogin } from "../hooks/useGoogleLogin";
import { GoogleIcon } from "@/components/shared/google-icon";

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
      performGoogleLogin(codeResponse.code);
    },
    onError: (error) => {
      console.error("Google OAuth failed:", error);
    },
    flow: "auth-code",
  });

  const onSubmit = (data: LoginFormInputs) => {
    loginWithPassword(data);
  };

  const isPending = isPasswordLoginPending || isGoogleLoginPending;
  const error = passwordLoginError ?? googleLoginError;

  return (
    <div className="w-full max-w-sm">
      <div className="bg-card/80 rounded-lg p-8 shadow-2xl backdrop-blur-sm">
        <div className="space-y-4">
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
              <span className="bg-card px-2 text-slate-400">Or</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => googleLogin()}
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
  );
};
