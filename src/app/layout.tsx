import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Purple Signals",
  description: "Recurring leadership pulse — signal, not noise."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
