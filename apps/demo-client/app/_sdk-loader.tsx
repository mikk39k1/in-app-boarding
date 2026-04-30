"use client";

import { useEffect } from "react";

export function SdkLoader() {
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_IB_KEY;
    if (!apiKey) {
      console.warn(
        "[demo-client] NEXT_PUBLIC_IB_KEY is not set — SDK will not initialise. Copy a dev_ key from the dashboard.",
      );
      return;
    }
    void (async () => {
      const sdk = await import("@ib/sdk");
      await sdk.init({
        apiKey,
        apiUrl: process.env.NEXT_PUBLIC_IB_API_URL ?? "http://localhost:3000",
      });
    })();
  }, []);

  return null;
}
