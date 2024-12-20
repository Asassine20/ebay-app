import { FaChartLine } from 'react-icons/fa';
import { FiBox } from 'react-icons/fi';
import { AiOutlineBulb } from 'react-icons/ai';
// import { OrbitingCirclesComponent } from './orbiting-circles' - Add it back once you have more logos to show
import { TITLE_TAILWIND_CLASS } from '@/utils/constants'

const features = [
  {
    name: 'Optimize Your Listings:',
    description:
      'Gain insights into which products perform best and where to focus your efforts and capital.',
    icon: FaChartLine,
  },
  {
    name: 'Track Inventory Effortlessly:',
    description: 'Never run out of stock or oversell again with powerful tracking tools.',
    icon: FiBox,
  },
  {
    name: 'Actionable Insights:',
    description: "Make informed decisions to maximize your store's potential.",
    icon: AiOutlineBulb,
  },
]

export default function SideBySide() {
  return (
    <div className="overflow-hidden ">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 sm:gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-2">
          <div className="lg:pr-8 lg:pt-4">
            <div className="lg:max-w-lg">
              <p className={`${TITLE_TAILWIND_CLASS} mt-2 font-semibold tracking-tight dark:text-white text-gray-900`}>
                Restock Radar: Unlock the Power of Insights
              </p>
              <p className="mt-6 leading-8 text-gray-600 dark:text-gray-400">
                Transform how you manage your eBay store with real-time analytics and actionable insights.
                Focus on growth, reduce inefficiencies, and make data-driven decisions with ease.
              </p>
              <dl className="mt-10 max-w-xl space-y-8 leading-7 text-gray-600 lg:max-w-none">
                {features.map((feature) => (
                  <div key={feature.name} className="relative pl-9">
                    <dt className="inline font-semibold dark:text-gray-100 text-gray-900">
                      <feature.icon className="absolute left-1 top-1 h-5 w-5" aria-hidden="true" />
                      {feature.name}
                    </dt>{' '}
                    <dd className="inline dark:text-gray-400">{feature.description}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
          {/* Add back once you have more logos to display for orbit<OrbitingCirclesComponent />*/}
        </div>
      </div>
    </div>
  )
}
