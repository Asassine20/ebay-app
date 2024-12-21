import { Button } from '@/components/ui/button'
import { Metadata } from 'next'
import Link from 'next/link'
import PageWrapper from "@/components/wrapper/page-wrapper";
import { VideoPlayer } from '@/components/video-player';

export const metadata: Metadata = {
  metadataBase: new URL("https://restockradar.com"),
  keywords: [
    'eBay inventory management',
    'top-selling items analytics',
    'out of stock alerts for eBay',
    'restock tracking for eBay sellers',
    'eBay sales optimization tools',
    'eBay variation item analytics',
    'inventory analytics for eBay'
  ],
  title: 'Restock Radar - Advanced eBay Inventory Analytics',
  openGraph: {
    description: 'Restock Radar is an advanced inventory analytics tool for eBay sellers. Track top-selling items, get restock alerts, monitor inventory levels, and optimize sales effortlessly.',
    images: ['https://utfs.io/f/8iXWGiUIA2TmidpBKKukQcfWJFaYuUItrD1ejPEnKH3SvZGs'],
  },
}

export default async function MarketingPage() {
  return (
    <PageWrapper>
      <div className='flex flex-col min-h-screen items-center mt-[2.5rem] p-3 w-full'>
        <h1 className="scroll-m-20 max-w-[600px] text-5xl font-bold tracking-tight text-center">
          Unlock eBay Success with Restock Radar
        </h1>
        <p className="mx-auto max-w-[600px] text-gray-500 md:text-lg text-center mt-2 dark:text-gray-400">
          Take control of your eBay inventory with advanced analytics. Restock Radar empowers you to track top-selling items, manage stock levels, and optimize sales effortlessly.
        </p>
        <div className='flex gap-2 mt-2'>
          <Link href="/dashboard" className="mt-2">
            <Button size="lg">Get Started</Button>
          </Link>
        </div>
        <div className='mb-3 mt-[1.5rem] max-w-[900px] w-full'>
          <VideoPlayer videoSrc="https://utfs.io/f/08b0a37f-afd7-4623-b5cc-e85184528fce-1f02.mp4" />
        </div>
        <div className='flex flex-col min-h-screen max-w-[900px] items-center mb-[2rem]'>
          <article className="w-full mx-auto pb-8">
            <h1 className="text-3xl lg:text-4xl font-bold mb-6">Why Restock Radar?</h1>

            <section className="mb-8">
              <p className="text-md leading-relaxed">
                Managing inventory on eBay can be a challenge, especially when tracking hundreds or thousands of products and variations. Restock Radar simplifies your workflow by providing actionable insights into your inventory performance. Whether you're monitoring top selling items or ensuring popular items are always in stock, Restock Radar is your ultimate tool.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="mt-10 scroll-m-20 border-b pb-2 mb-3 text-3xl font-semibold tracking-tight transition-colors first:mt-0">Features That Elevate Your eBay Business</h2>
              <ul className="flex flex-col gap-1 list-disc ml-8 mb-4">
                <li className="mb-2">
                  <strong>Out of Stock Alerts:</strong> Receive instant notifications when items sell out, so you can act fast and keep your store running smoothly.
                </li>
                <li className="mb-2">
                  <strong>Top-Selling Item Analytics:</strong> Identify your best-performing products to prioritize and maximize profits.
                </li>
                <li className="mb-2">
                  <strong>Restock Soon Notifications:</strong> Leverage recent sales data to know exactly when to replenish stock, avoiding lost sales opportunities.
                </li>
                <li className="mb-2">
                  <strong>Variation Item Analytics:</strong> Dive deeper into your product variations to understand which combinations drive the most sales.
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="mt-10 scroll-m-20 border-b pb-2 mb-3 text-3xl font-semibold tracking-tight transition-colors first:mt-0">Built for eBay Sellers</h2>
              <p className="text-md mb-5 leading-relaxed">
                Restock Radar was designed with eBay sellers in mind. By integrating advanced analytics with a user-friendly interface, we make it easy for you to focus on growing your business while we handle the data. Join thousands of eBay sellers already transforming their stores with Restock Radar.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="mt-10 scroll-m-20 border-b pb-2 mb-3 text-3xl font-semibold tracking-tight transition-colors first:mt-0">Start Optimizing Your Inventory Today</h2>
              <p className="text-md mb-5 leading-relaxed">
              Don&#39;t let stockouts or inefficiencies hold you back. With Restock Radar, you have the power to manage your eBay store like a pro. Try Restock Radar today with our 30-day money-back guarantee and experience the difference.
              </p>
              <Link href="/dashboard">
                <Button size="lg">Get Started</Button>
              </Link>
            </section>
          </article>
        </div>
      </div>
    </PageWrapper>
  )
}
