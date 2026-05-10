"use client";

import { Header } from "rk-designsystem";

export function SiteHeader() {
  return (
    <Header
      data-color="primary"
      navItems={[
        { label: "Forsiden", href: "/" },
        { label: "Metode", href: "/metode" },
      ]}
      showNavItems
      showMenuButton={false}
      showLogin={false}
      showSearch={false}
      showCta={false}
      showThemeToggle={false}
      showLanguageSwitch={false}
      showUser={false}
      showHeaderExtension={false}
      showModeToggle={false}
    />
  );
}
