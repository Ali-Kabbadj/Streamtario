"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
  useRef,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { graphqlClient } from "@/lib/graphql-client";
import { AccountDocument } from "@/orchestrators/graphql-query-orchestrator/queries";
import type { AccountQuery } from "@/orchestrators/graphql-query-orchestrator/gen/graphql";
import { GlobalLoader } from "@/components/shared/GlobalLoader";
import { print } from "graphql";
import { jwtDecode } from "jwt-decode";
import { refreshSession } from "@/features/auth/services/auth.service";

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
  const queryClient = useQueryClient();
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    queryClient.clear();
    window.location.href = "/";
  }, [queryClient]);

  const hasToken = isClient && !!localStorage.getItem("refreshToken");

  const scheduleRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) return;

    try {
      const decoded = jwtDecode<{ exp: number }>(accessToken);
      const expiresIn = decoded.exp * 1000 - Date.now();
      const refreshIn = expiresIn - 60000;

      if (refreshIn > 0) {
        console.log(
          `[Auth] Scheduling token refresh in ${Math.round(refreshIn / 1000)}s`,
        );
        refreshTimeoutRef.current = setTimeout(() => {
          console.log("[Auth] Proactively refreshing session...");
          refreshSession()
            .then(() => {
              scheduleRefresh();
            })
            .catch((error) => {
              console.error(
                "[Auth] Proactive refresh failed, logging out.",
                error,
              );
              logout();
            });
        }, refreshIn);
      } else {
        refreshSession().catch(() => logout());
      }
    } catch (error) {
      console.error("[Auth] Failed to decode token, logging out.", error);
      logout();
    }
  }, [logout]);

  const { data, isLoading, isSuccess, isError, error } = useQuery<
    AccountQuery,
    Error
  >({
    queryKey: ["Account"],
    queryFn: async () => graphqlClient.request(print(AccountDocument)),
    enabled: hasToken,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  useEffect(() => {
    if (isSuccess && data?.account) {
      scheduleRefresh();
    }
    if (isError) {
      console.error("Account query failed permanently, logging out.", error);
      logout();
    }
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [isSuccess, isError, error, logout, scheduleRefresh, data]);

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
