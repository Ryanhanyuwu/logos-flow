import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Navbar } from "~/components/navbar";
import { CalmModeProvider } from "~/lib/calm-mode-context";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Logos Flow",
  description: "Speech-to-logic graph",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full">
      <body
        className={`${inter.className} flex h-full flex-col overflow-hidden`}
      >
        <CalmModeProvider>
          <Navbar />
          <div className="flex-1 overflow-hidden min-h-0">{children}</div>
        </CalmModeProvider>
      </body>
    </html>
  );
}
