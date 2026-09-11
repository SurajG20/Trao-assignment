import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Petrona } from "next/font/google";
import "./globals.css";

const ui = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-ui",
});

const petrona = Petrona({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-petrona",
});

export const metadata: Metadata = {
  title: "Interview Prep Kit",
  description: "Turn a job description into a personalised interview kit",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${ui.variable} ${petrona.variable} min-h-screen font-sans`}>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-card focus:px-3 focus:py-2 focus:ring-2 focus:ring-ring"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
