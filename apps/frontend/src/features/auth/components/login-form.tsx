"use client";

import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogin } from "../hooks/useLogin";
import { useGoogleLogin } from "../hooks/useGoogleLogin";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { fa } from "zod/v4/locales";

// Define the form data type
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

  const onSubmit = (data: LoginFormInputs) => {
    loginWithPassword(data);
  };

  const handleGoogleSuccess = (
    credentialResponse: CredentialResponse,
  ): void => {
    if (credentialResponse.credential) {
      performGoogleLogin(credentialResponse.credential);
    } else {
      console.error("Google login failed: No credential was returned.");
    }
  };

  const isPending = isPasswordLoginPending || isGoogleLoginPending;
  const error = passwordLoginError ?? googleLoginError;

  return (
    <div className="w-full max-w-sm">
      <div className="bg-card rounded-lg p-8 shadow-2xl backdrop-blur-sm">
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
              <span className="bg-accent-foreground/0 px-2 text-slate-400 backdrop-blur-sm">
                Or
              </span>
            </div>
          </div>

          <div className="flex justify-center bg-transparent">
            {isGoogleLoginPending ? (
              <p className="text-sm text-slate-300">
                Authenticating with Google...
              </p>
            ) : (
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => {
                  console.error("Google Login Failed");
                }}
                theme={undefined}
                size="large"
                width="320px"
                shape="circle"
              />
            )}
          </div>

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
