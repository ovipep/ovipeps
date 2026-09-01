import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { AffiliateTracker } from "@/components/affiliate-tracker";
import { ScrollToTop } from "@/components/layout/scroll-to-top";
import { ScrollProgress } from "@/components/motion/scroll-progress";
import { Providers } from "@/components/providers";
import { SITE_NAME, SITE_URL } from "@/lib/content";
import { getAnnouncements } from "@/lib/safe-db";
import "./globals.css";

export const dynamic = "force-dynamic";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  icons: {
    icon: "/images/brand/icon-blue.png",
    shortcut: "/images/brand/icon-blue.png",
    apple: "/images/brand/icon-blue.png",
  },
  title: {
    default: `${SITE_NAME} — Research-Grade Peptides`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Premium research peptides and laboratory supplies with published batch documentation where available, fulfilled from within Canada.",
  keywords: [
    "research peptides",
    "laboratory peptides",
    "COA peptides",
    "Canadian peptide supplier",
    "research compounds",
  ],
  openGraph: {
    type: "website",
    locale: "en_CA",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Research-Grade Peptides`,
    description:
      "Premium research peptides and laboratory supplies with published batch documentation where available, fulfilled from within Canada.",
    images: [
      {
        url: "/images/brand/logo.png",
        alt: `${SITE_NAME} logo`,
      },
    ],
  },
  twitter: {
    card: "summary",
    title: `${SITE_NAME} — Research-Grade Peptides`,
    description:
      "Premium research peptides and laboratory supplies with published batch documentation where available, fulfilled from within Canada.",
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      "max-snippet": 0,
      "max-image-preview": "none",
      "max-video-preview": 0,
    },
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/images/brand/logo.png`,
  description:
    "Canadian supplier of research-grade peptides and laboratory supplies for qualified research professionals.",
  contactPoint: {
    "@type": "ContactPoint",
    email: "ovipeps@gmail.com",
    contactType: "customer support",
    areaServed: "CA",
    availableLanguage: "English",
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const announcements = await getAnnouncements();

  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
        />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <Providers>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-navy focus:shadow-lg"
          >
            Skip to content
          </a>
          <ScrollProgress />
          <AnnouncementBar announcements={announcements} />
          <Header />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <Footer />
          <ScrollToTop />
          <AffiliateTracker />
        </Providers>
      </body>
    </html>
  );
}
