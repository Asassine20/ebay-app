import Provider from '@/app/provider'
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import AuthWrapper from '@/components/wrapper/auth-wrapper'
import { Analytics } from "@vercel/analytics/react"
import { GeistSans } from 'geist/font/sans'
import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

// Access the GA ID from the environment variable
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export const metadata: Metadata = {
  metadataBase: new URL("https://restockradar.com"), // Update with your domain
  title: {
    default: 'Restock Radar',
    template: `%s | Restock Radar`
  },
  description: 'Empowering eBay sellers with advanced inventory analytics. Track top-selling items, monitor stock levels, and optimize your eBay inventory management with ease.',
  openGraph: {
    title: 'Restock Radar',
    description: 'Empowering eBay sellers with advanced inventory analytics. Track top-selling items, monitor stock levels, and optimize your eBay inventory management with ease.',
    images: [
      'https://yourdomain.com/images/restock-radar-og-image.png', // Replace with your actual OG image URL
    ],
    url: 'https://restockradar.com/',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthWrapper>
      <html lang="en" suppressHydrationWarning>
        <head>
          {/* Preload images for faster loading */}
          <link
            rel="preload"
            href="https://yourdomain.com/images/logo-light.png" // Replace with your logo URL
            as="image"
          />
          <link
            rel="preload"
            href="https://yourdomain.com/images/logo-dark.png" // Replace with your dark mode logo URL
            as="image"
          />
          {/* Google Analytics Script */}
          {GA_ID && (
            <>
              <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
                strategy="afterInteractive"
              />
              <Script id="google-analytics" strategy="afterInteractive">
                {`
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${GA_ID}', {
                    page_path: window.location.pathname,
                  });
                `}
              </Script>
            </>
          )}
        </head>
        <body className={GeistSans.className}>
          <Provider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
              <Toaster />
            </ThemeProvider>
          </Provider>
          <Analytics />
        </body>
      </html>
    </AuthWrapper>
  )
}
