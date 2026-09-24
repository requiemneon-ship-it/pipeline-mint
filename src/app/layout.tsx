import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PipelineMint — AI lead operations",
  description: "AI-assisted lead operations workspace for modern sales teams."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
