import { InstallBanner } from "@/components/install-banner"
import { PwaRegister } from "@/components/pwa-register"
import { ThemeProvider } from "@/components/theme-provider"
import type { Metadata, Viewport } from "next"
import { Bricolage_Grotesque, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google"
import "./globals.css"

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["opsz"],
})

const body = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
})

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
})

export const metadata: Metadata = {
  title: "Knowledge Elicitation Studio — Agent-ready tribal knowledge",
  description:
    "Capture tribal heuristics, procedures, gotchas, and glossary terms as agent-ready knowledge packs. Record expert interviews on Android and extract structured memory.",
  applicationName: "Knowledge Elicitation Studio",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "KE Studio",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0b3d38" },
    { media: "(prefers-color-scheme: dark)", color: "#071418" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
}

const themeInitScript = `(function(){try{var t=localStorage.getItem("tribal.theme");var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light";}catch(e){}})();`

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col font-[family-name:var(--font-body)]">
        <ThemeProvider>
          {children}
          <PwaRegister />
          <InstallBanner />
        </ThemeProvider>
      </body>
    </html>
  )
}
