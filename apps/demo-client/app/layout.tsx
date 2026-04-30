import type { Metadata } from "next";
import "./globals.css";
import { SdkLoader } from "./_sdk-loader";

export const metadata: Metadata = {
  title: "Acme — demo client",
  description: "Sample app for the in-app onboarding SDK.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SdkLoader />
        {children}
      </body>
    </html>
  );
}
