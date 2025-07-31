"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { graphqlClient } from "@/lib/graphql-client";
import { AccountDocument } from "@/orchestrators/graphql-query-orchestrator/queries";
import type { AccountQuery } from "@/orchestrators/graphql-query-orchestrator/gen/graphql";
import { Skeleton } from "@/components/ui/skeleton";
import { refreshSession } from "@/features/auth/services/auth.service";

type UserAccount = AccountQuery["account"];

interface AuthError extends Error {
  response?: {
    errors?: Array<{
      extensions?: {
        code?: string;
      };
    }>;
  };
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: UserAccount | null;
  isLoading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    void queryClient.resetQueries({ queryKey: ["Account"] });
  };

  const { data, isLoading, isSuccess } = useQuery<AccountQuery, AuthError>({
    queryKey: ["Account"],
    queryFn: async (): Promise<AccountQuery> => {
      try {
        if (
          typeof window !== "undefined" &&
          !localStorage.getItem("accessToken")
        ) {
          throw new Error("No access token found");
        }
        // --- FIX: Use the correctly named DocumentNode ---
        return await graphqlClient.request(AccountDocument);
      } catch (error) {
        const authError = error as AuthError;
        const isAuthError =
          authError?.response?.errors?.[0]?.extensions?.code ===
          "AUTHENTICATION_REQUIRED";

        if (isAuthError) {
          try {
            await refreshSession();
            // --- FIX: Use the correctly named DocumentNode ---
            return await graphqlClient.request(AccountDocument);
          } catch (refreshError) {
            console.error("Token refresh failed, logging out:", refreshError);
            logout();
            throw refreshError;
          }
        }
        throw error;
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="bg-primary flex h-screen w-screen items-center justify-center">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded-full bg-slate-700" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px] bg-slate-700" />
            <Skeleton className="h-4 w-[200px] bg-slate-700" />
          </div>
        </div>
      </div>
    );
  }

  const value = {
    isAuthenticated: isSuccess && !!data?.account,
    user: data?.account ?? null,
    isLoading: isLoading,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
