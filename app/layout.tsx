"use client";

import type { ReactNode } from "react";
import "./character-sheet.css";
import { I18nProvider } from "@/i18n";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt">
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
