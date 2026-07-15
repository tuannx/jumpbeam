import type { Metadata } from "next";
import { Nunito, Space_Grotesk } from "next/font/google";
import "./globals.css";
import "./ar.css";

const display = Space_Grotesk({ variable: "--font-display", subsets: ["latin"] });
const body = Nunito({ variable: "--font-body", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "JumpBeam — Pop the Bubbles on your TV",
  description: "A private, controller-free 60-second movement game powered by your phone camera.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${display.variable} ${body.variable}`}>{children}</body></html>;
}
