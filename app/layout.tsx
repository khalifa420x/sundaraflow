import type { Metadata } from "next";
import "./globals.css";
import LoadingScreen from "@/components/LoadingScreen";
import SWRegister from "./sw-register";

export const metadata: Metadata = {
  title: "SundaraFlow — Outil Coach Premium",
  description:
    "SundaraFlow centralise la gestion de vos membres, programmes d'entraînement, plans nutritionnels et suivi de progression — dans une interface premium conçue pour les coachs.",

  manifest: "/manifest.json", // ✅ AJOUT CRUCIAL

  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>
        <SWRegister />
        <LoadingScreen />
        {children}
      </body>
    </html>
  );
}