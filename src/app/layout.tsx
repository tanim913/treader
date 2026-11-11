import type { Metadata, Viewport } from "next";
import { Literata } from "next/font/google";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import "./globals.css";

const literata = Literata({
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-literata",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: APP_TAGLINE,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3efe6" },
    { media: "(prefers-color-scheme: dark)", color: "#171614" },
  ],
};

// Applies the reader's saved theme and reading settings before the first paint, so there is no flash.
const themeScript = `try{var d=document.documentElement,t=localStorage.getItem("treader-theme");if(t==="light"||t==="sepia"||t==="dark")d.dataset.theme=t;var r=JSON.parse(localStorage.getItem("treader-read")||"null");if(r){var L={compact:1.45,normal:1.62,loose:1.8};if(r.size)d.style.setProperty("--read-size",r.size+"px");if(L[r.leading])d.style.setProperty("--read-leading",L[r.leading]);if(r.face==="sans")d.style.setProperty("--font-read-active","var(--font-ui)")}}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={literata.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
