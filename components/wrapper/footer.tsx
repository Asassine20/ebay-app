"use client"
import { useForm } from 'react-hook-form';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import Link from 'next/link';

export default function Footer() {
    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm();


    const onSubmit = async (data: any) => {


    };
    return (
        <footer className="border-t dark:bg-black">
            <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
                <div className="lg:grid lg:grid-cols-2">
                    {/*
                    <div className="border-b   py-8 lg:order-last lg:border-b-0 lg:border-s lg:py-16 lg:ps-16">
                        
                        <div className="mt-8 space-y-4 lg:mt-0">
                            
                            <div>
                                <h3 className="text-2xl font-medium">This is a fake newsletter title</h3>
                                <p className="mt-4 max-w-lg  ">
                                    This is not a real newsletter email input. This is for you to build upon
                                </p>
                            </div>
                            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col border rounded-xl p-4 gap-3 mt-6 w-full">
                                <Input
                                    {...register('email', { required: true })}
                                    placeholder="Enter your email"
                                    type="email"
                                />
                                <Button type="submit">
                                    Sign Up
                                </Button>
                            </form>
                            
                        </div>
                        
                    </div>
                    */}
                    <div className="py-8 lg:py-16 lg:pe-16">


                        <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2">

                            <div>
                                <p className="font-medium ">Socials</p>

                                <ul className="mt-6 space-y-4 text-sm">
                                    <li>
                                        <Link href="https://www.linkedin.com/in/andrewsassine/" target="_blank" className="  transition hover:opacity-75"> LinkedIn </Link>
                                    </li>
                                    <li>
                                        <Link href="https://www.tiktok.com/@webdevsnest" target="_blank" className="  transition hover:opacity-75"> TikTok </Link>
                                    </li>
                                    <li>
                                        <Link href="https://www.youtube.com/@WebDevsNest" target="_blank" className="  transition hover:opacity-75"> YouTube </Link>
                                    </li>
                                    <li>
                                        <Link href="https://x.com/WebDevsNest" target="_blank" className="transition hover:opacity-75"> Twitter </Link>
                                    </li>
                                </ul>
                            </div>
                            {/*
                            <div>
                                <p className="font-medium ">Helpful Links</p>

                                <ul className="mt-6 space-y-4 text-sm">
                                    <li>
                                        <Link target="_blank" href="/" rel="noopener noreferrer" className="  transition hover:opacity-75"> Docs </Link>
                                    </li>
                                    <li>
                                        <Link href="/" className="  transition hover:opacity-75"> Methodology </Link>
                                    </li>
                                </ul>
                            </div>
*/}
                        </div>

                        <div className="mt-8 border-t   pt-8">
                            <ul className="flex flex-wrap gap-4 text-xs">
                                <li>
                                    <a href="/contact" className="transition hover:opacity-75">Contact Us </a>
                                </li>
                                <li>
                                    <a href="/terms-and-conditions" target="_blank" className="transition hover:opacity-75">Terms & Conditions </a>
                                </li>

                                <li>
                                    <a href="/privacy-policy" target="_blank" className="transition hover:opacity-75">Privacy Policy </a>
                                </li>
                            </ul>

                            <p className="mt-8 text-xs  ">&copy; 2025. GemTCG LLC. All rights reserved.</p>
                            <p className="mt-8 text-xs">
                                <a href="https://targetrankseo.com" target="_blank">Web Design & SEO by Target Rank SEO</a>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </footer>

    )
}
