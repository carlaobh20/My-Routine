import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "My Routine",
  description: "Sua rotina em blocos, com aviso de transição.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "My Routine" },
};

export const viewport: Viewport = {
  themeColor: "#6366f1",
};

const temaScript = `(function(){try{var t=localStorage.getItem('tema');if(t==='escuro'||(!t&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches&&false)){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: temaScript }} /></head>
      <body className="bg-white text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">{children}</body>
    </html>
  );
}
