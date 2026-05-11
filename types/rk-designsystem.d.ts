// Declaration merging-fiks for rk-designsystem 1.x.
//
// Pakkens publiserte TS-typer er ufullstendige: `ParagraphProps` (m.fl.)
// extend-er fra et internt `./components`-modul som ikke følger med i
// pakken, så TypeScript ser tomme typer uten `className`, `data-size`,
// `asChild` etc. Komponentene fungerer i runtime — kun typene er ødelagte.
//
// Vi merger inn de manglende propsene her så vi kan bruke designsystem-
// komponentene normalt uten `as any`-cast.

import type { HTMLAttributes } from "react";

declare module "rk-designsystem" {
  type Size = "xs" | "sm" | "md" | "lg" | "xl";

  interface ParagraphProps extends HTMLAttributes<HTMLParagraphElement> {
    "data-size"?: Size;
    variant?: "long" | "default" | "short";
    asChild?: boolean;
  }

  interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
    "data-size"?: "2xs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
    level?: 1 | 2 | 3 | 4 | 5 | 6;
    asChild?: boolean;
  }
}
