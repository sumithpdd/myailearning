import type { Metadata } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import { AppShell } from "@/components/shell/app-shell";
import { describeConnection } from "@/lib/repository";
import "./globals.css";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

export const metadata: Metadata = {
  title: {
    default: "MyAILearning",
    template: "%s · MyAILearning",
  },
  description: "Personal learning system. The plan is read from Notion.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const themeScript = `try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const connection = await describeConnection();
  return (
    <html lang="en" suppressHydrationWarning className={`${sourceSans.variable} ${fraunces.variable} h-full`}>
      <body className="min-h-full bg-canvas text-ink antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <AppShell connection={connection}>{children}</AppShell>
      </body>
    </html>
  );
}
