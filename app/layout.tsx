import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";

import "@digdir/designsystemet-css/index.css";
import "rk-design-tokens/design-tokens-build/theme.css";
import "./globals.css";

const sourceSans3 = Source_Sans_3({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Røde Kors Samfunnspuls — Besøkstjeneste",
  description:
    "Hvor i Norge bør Røde Kors prioritere å starte eller styrke besøkstjenesten? Datadrevet beslutningsstøtte for fagansvarlige.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nb">
      <body className={sourceSans3.className}>{children}</body>
    </html>
  );
}
