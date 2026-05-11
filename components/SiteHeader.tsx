"use client";

import { Header } from "rk-designsystem";

export function SiteHeader() {
  return (
    <Header
      data-color="primary"
      showNavItems={false}
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
