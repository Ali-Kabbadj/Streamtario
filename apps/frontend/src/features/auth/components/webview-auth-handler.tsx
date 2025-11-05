"use client";

import { useEffect } from "react";
import { useGoogleLogin } from "../hooks/useGoogleLogin";
import { isWebView } from "@/features/player/hooks/useMpvPlayer";
import type { GoogleLoginPayload } from "../services/auth.service";

export const WebViewAuthHandler = () => {
  const { mutate: performGoogleLogin } = useGoogleLogin();

  useEffect(() => {
    console.log("[WebViewAuth] useEffect running. isWebView:", isWebView());
    if (!isWebView()) return;
    const handleWebViewMessage = (event: MessageEvent<string>) => {
      try {
        const data = JSON.parse(event.data);

        if (
          data.event === "google-auth-code" &&
          data.payload?.code &&
          data.payload?.redirectUri
        ) {
          console.log("[WebViewAuth] Auth code identified:", data.payload.code);
          const decodedCode = decodeURIComponent(data.payload.code);
          console.log("[WebViewAuth] Decoded auth code:", decodedCode);
          const payload: GoogleLoginPayload = {
            code: decodedCode,
            redirectUri: data.payload.redirectUri,
          };
          console.log(
            "[WebViewAuth] Calling performGoogleLogin with payload:",
            payload,
          );
          performGoogleLogin(payload);
        }
      } catch (error) {
        console.error("[WebViewAuth] Error handling message:", error);
      }
    };

    console.log(
      "[WebViewAuth] Adding message listener to window.chrome.webview...",
    );
    window.chrome.webview?.addEventListener("message", handleWebViewMessage);

    return () => {
      console.log("[WebViewAuth] Cleaning up message listener.");
      window.chrome.webview?.removeEventListener(
        "message",
        handleWebViewMessage,
      );
    };
  }, [performGoogleLogin]);

  return null;
};
