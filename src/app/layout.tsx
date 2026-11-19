import type { Metadata, Viewport } from "next";
import { Gabarito, Shrikhand } from "next/font/google";
import "./globals.css";
import { AudioUnlock } from "@/components/AudioUnlock";

const shrikhand = Shrikhand({ variable: "--font-shrikhand", weight: "400", subsets: ["latin"] });
const gabarito = Gabarito({ variable: "--font-gabarito", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ho imparato",
  description: "Practise Italian together — levels, stars and a leaderboard.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffd84d" },
    { media: "(prefers-color-scheme: dark)", color: "#101842" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it" className={`${shrikhand.variable} ${gabarito.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <AudioUnlock />
        {children}
      </body>
    </html>
  );
}
