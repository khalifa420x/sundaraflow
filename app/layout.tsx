import type { Metadata } from "next";
import "./globals.css";
import LoadingScreen from "@/components/LoadingScreen";
import SWRegister from "./sw-register"; // ✅ AJOUT

export const metadata: Metadata = {
  title: "SundaraFlow — Outil Coach Premium",
  description:
    "SundaraFlow centralise la gestion de vos membres, programmes d'entraînement, plans nutritionnels et suivi de progression — dans une interface premium conçue pour les coachs.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>
        <SWRegister /> {/* ✅ AJOUT ICI */}
        <LoadingScreen />
        {children}
      </body>
    </html>
  );
}