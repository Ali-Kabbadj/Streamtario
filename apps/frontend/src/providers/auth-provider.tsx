"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
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
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    window.location.href = "/";
  }, []);

  const hasToken = isClient && !!localStorage.getItem("refreshToken");

  const { data, isLoading, isSuccess, isError, error } = useQuery<
    AccountQuery,
    Error
  >({
    queryKey: ["Account"],
    queryFn: async () => {
      return graphqlClient.request<AccountQuery, Record<string, unknown>>(
        print(AccountDocument),
      );
    },
    enabled: hasToken,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  useEffect(() => {
    if (isError) {
      console.error("Account query failed permanently, logging out.", error);
      logout();
    }
  }, [isError, error, logout]);

  if (isLoading && hasToken) {
    return <GlobalLoader />;
  }

  const value = {
    isAuthenticated: hasToken && isSuccess && !!data?.account,
    user: data?.account ?? null,
    isLoading: isLoading && hasToken,
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
