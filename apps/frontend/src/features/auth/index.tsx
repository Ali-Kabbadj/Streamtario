"use client";

import { LoginForm } from "./components/login-form";

export const AuthFeature = () => {
  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <LoginForm />
    </div>
  );
};
