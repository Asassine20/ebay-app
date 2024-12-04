"use client";

import { TITLE_TAILWIND_CLASS } from '@/utils/constants';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

const ProjectsData1 = [
  {
    id: 1,
    name: 'GemTCG',
    description: '"This tool helped me pinpoint exactly where I was losing money from items being out of stock "',
    image: 'https://utfs.io/f/8iXWGiUIA2Tmn1yFhDfqDK043j2ZeB7n9EdPbpgJcNxaO8fV',
    url: "https://www.ebay.com/str/kickznkardzstore"
  },
  {
    id: 2,
    name: 'GGCardsCo',
    description: '"I was able to double my sales by focusing on restocking items that were selling fast thanks to this tool"',
    image: 'https://utfs.io/f/8iXWGiUIA2TmAZx9c102xvl2qIWrkKmyg17Ch0DTAwcYRNV3',
    url: "https://www.ebay.com/usr/ggcardsco"
  },
];

const ProjectsData2 = [
  {
    id: 3,
    name: 'Stripe For Payments',
    description: 'Secure and seamless payment processing. Fast, reliable, and protected.',
    image: 'https://utfs.io/f/a2fbe9db-35f8-4738-a4c4-0b9a29f4efc7-er2coj.png',
    url: "https://stripe.com"
  },
  {
    id: 4,
    name: 'Clerk Authentication',
    description: 'Effortless and secure authentication.',
    image: 'https://utfs.io/f/aee7360d-54f1-4ed1-a4b4-49a56b455bf4-1ker11.png',
    url: "https://clerk.com/"
  },
];

const SpringAnimatedFeatures = () => {
  return (
    <div className="flex flex-col justify-center items-center lg:w-[75%]">
      {/* First Header and List */}
      <div className='flex flex-col mb-[3rem]'>
        <h2 className={`${TITLE_TAILWIND_CLASS} mt-2 font-semibold tracking-tight dark:text-white text-gray-900`}>
          Trusted by eBay Sellers Worldwide
        </h2>
        <p className="mx-auto max-w-[500px] text-gray-600 dark:text-gray-400 text-center mt-2 ">
          Hear how our product has helped eBay stores grow, streamline operations, and achieve success.
        </p>
      </div>
      <div className="grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {ProjectsData1.map((project) => {
          return (
            <motion.div
              whileHover={{
                y: -8,
              }}
              transition={{
                type: 'spring',
                bounce: 0.7,
              }}
              key={project.id}
              className="mt-5 text-left border p-6 rounded-md dark:bg-black"
            >
              <Link href={project?.url} target="_blank" rel="noopener noreferrer">
                <Image
                  src={project.image}
                  width={40}
                  height={30}
                  className="mb-3 rounded"
                  alt={project.name}
                />
                <div className="mb-1 text-sm font-medium">
                  {project.name}
                </div>
                <div className="max-w-[250px] text-sm font-normal text-gray-600 dark:text-gray-400">
                  {project.description}
                </div>
              </Link>
            </motion.div>
          )
        })}
      </div>

      {/* Second Header and List */}
      <div className='flex flex-col mt-[5rem] mb-[3rem]'>
        <h2 className={`${TITLE_TAILWIND_CLASS} mt-6 font-semibold tracking-tight dark:text-white text-gray-900`}>
        Powered by Industry-Leading Solutions
        </h2>
        <p className="mx-auto max-w-[500px] text-gray-600 dark:text-gray-400 text-center mt-2 ">
        Our platform is powered by trusted technologies like Stripe and Clerk to ensure a secure and reliable experience.
        </p>
      </div>
      <div className="grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {ProjectsData2.map((project) => {
          return (
            <motion.div
              whileHover={{
                y: -8,
              }}
              transition={{
                type: 'spring',
                bounce: 0.7,
              }}
              key={project.id}
              className="mt-5 text-left border p-6 rounded-md dark:bg-black"
            >
              <Link href={project?.url} target="_blank" rel="noopener noreferrer">
                <Image
                  src={project.image}
                  width={40}
                  height={30}
                  className="mb-3 rounded"
                  alt={project.name}
                />
                <div className="mb-1 text-sm font-medium">
                  {project.name}
                </div>
                <div className="max-w-[250px] text-sm font-normal text-gray-600 dark:text-gray-400">
                  {project.description}
                </div>
              </Link>
            </motion.div>
          )
        })}
      </div>
    </div>
  );
};

export default SpringAnimatedFeatures;
