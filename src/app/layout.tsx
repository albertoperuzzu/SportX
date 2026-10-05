import type { Metadata, Viewport } from "next";
import { Inter, Russo_One } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const russo = Russo_One({ variable: "--font-russo", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: "SportX Gestionale",
  description: "Gestionale corsi, iscritti e presenze di ASD SportX",
};

export const viewport: Viewport = {
  themeColor: "#036b3a",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <body className={`${inter.variable} ${russo.variable} font-sans`}>{children}</body>
    </html>
  );
}
