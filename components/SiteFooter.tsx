"use client";

import { Footer } from "rk-designsystem";

export function SiteFooter() {
  return (
    <Footer
      data-color="neutral"
      hideNewsletter
      shortcutsTitle="Snarveier"
      shortcutsLinks={[{ label: "Forsiden", href: "/" }]}
      linksTitle="Lenker"
      linksLinks={[
        { label: "Røde Kors", href: "https://www.rodekors.no" },
        {
          label: "GitHub-repo",
          href: "https://github.com/dbarlag/rk-samfunnspuls-case",
        },
      ]}
      visitingAddress={["Hausmannsgate 7", "0186 Oslo"]}
    />
  );
}
