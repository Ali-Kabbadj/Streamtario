"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { graphqlClient } from "@/lib/graphql-client";
import { AccountDocument } from "@/orchestrators/graphql-query-orchestrator/queries";
import type { AccountQuery } from "@/orchestrators/graphql-query-orchestrator/gen/graphql";
import { GlobalLoader } from "@/components/shared/GlobalLoader";
import { print } from "graphql";

type UserAccount = AccountQuery["account"];

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
    void queryClient.resetQueries();
  };

  const { data, isLoading, isSuccess } = useQuery<AccountQuery, Error>({
    queryKey: ["Account"],
    queryFn: async () => {
      if (
        typeof window !== "undefined" &&
        !localStorage.getItem("refreshToken")
      ) {
        throw new Error("No refresh token found, user is not logged in.");
      }
      return graphqlClient.request<AccountQuery, {}>(print(AccountDocument));
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    gcTime: Infinity,
    onError: (err) => {
      console.error("Account query failed permanently, logging out.", err);
      logout();
    },
  });

  if (isLoading) {
    return <GlobalLoader />;
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
