import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "CML Fuel Management System Pro | Compagnie Minière du Littoral",
  description: "Application professionnelle de gestion et d'audit de carburant pour la flotte minière CML en Côte d'Ivoire.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/icon-192x192.png"
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CML Fuel Pro"
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <meta name="theme-color" content="#f59e0b" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className="bg-slate-100 text-slate-900 antialiased min-h-screen selection:bg-amber-500 selection:text-slate-950">
        {children}
      </body>
    </html>
  );
}
