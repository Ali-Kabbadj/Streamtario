"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { graphqlClient } from "@/lib/graphql-client";
import { ACCOUNT_QUERY } from "@/orchestrators/graphql-query-orchestrator/queries";
import type { AccountQuery } from "@/orchestrators/graphql-query-orchestrator/gen/graphql";
import { Skeleton } from "@/components/ui/skeleton";

type UserAccount = AccountQuery["account"];

interface AuthContextType {
  isAuthenticated: boolean;
  user: UserAccount | null;
  isLoading: boolean;
  // --- ADD functions to imperatively log in and out ---
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, isSuccess } = useQuery<AccountQuery, Error>(
    {
      queryKey: ["Account"],
      queryFn: async () => {
        if (
          typeof window !== "undefined" &&
          !localStorage.getItem("accessToken")
        ) {
          throw new Error("No access token found");
        }
        return graphqlClient.request(ACCOUNT_QUERY);
      },
      retry: false,
      refetchOnWindowFocus: false,
    },
  );

  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    queryClient.removeQueries({ queryKey: ["Account"] });
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-900">
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
