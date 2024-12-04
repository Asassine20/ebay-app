"use client";

import Link from 'next/link';
import * as React from "react";
import { GiHamburgerMenu } from "react-icons/gi";
import { Button } from "../ui/button";
import { SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../ui/sheet";
import { UserProfile } from "../user-profile";
import ModeToggle from "../mode-toggle";
import { BlocksIcon } from "lucide-react";
import { NavigationMenu, NavigationMenuItem, NavigationMenuList } from "@/components/ui/navigation-menu";
import config from "@/config";
import { cn } from "@/lib/utils";
import { useAuth } from "@clerk/nextjs";
import { Dialog, DialogClose } from "@radix-ui/react-dialog";

export default function NavBar() {
    const { userId } = useAuth(); // Always call the hook, even if auth is disabled
    const isAuthenticated = config?.auth?.enabled && userId;

    return (
        <div className="flex min-w-full fixed justify-between p-2 border-b z-10 dark:bg-black dark:bg-opacity-50 bg-white">
            <div className="flex justify-between w-full min-[825px]:hidden">
                <Dialog>
                    <SheetTrigger className="p-2 transition">
                        <Button size="icon" variant="ghost" className="w-4 h-4" aria-label="Open menu" asChild>
                            <GiHamburgerMenu />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left">
                        <SheetHeader>
                            <SheetTitle>Next Starter</SheetTitle>
                        </SheetHeader>
                        <div className="flex flex-col space-y-3 mt-[1rem]">
                            <DialogClose asChild>
                                <Link href="/">
                                    <Button variant="outline" className="w-full">Home</Button>
                                </Link>
                            </DialogClose>
                            <DialogClose asChild>
                                <Link href="/#reviews">
                                    <Button variant="outline" className="w-full">Marketing</Button>
                                </Link>
                            </DialogClose>
                            <DialogClose asChild>
                                <Link href="/#pricing">
                                    <Button variant="outline" className="w-full">Pricing</Button>
                                </Link>
                            </DialogClose>
                            {isAuthenticated && (
                                <DialogClose asChild>
                                    <Link href="/dashboard">
                                        <Button variant="outline" className="w-full">Dashboard</Button>
                                    </Link>
                                </DialogClose>
                            )}
                        </div>
                    </SheetContent>
                </Dialog>
                <ModeToggle />
            </div>
            <NavigationMenu>
                <NavigationMenuList className="max-[825px]:hidden flex gap-3 w-[100%] justify-between">
                    <Link href="/" className="pl-2 flex items-center" aria-label="Home">
                        <BlocksIcon aria-hidden="true" />
                        <span className="sr-only">Home</span>
                    </Link>
                    <NavigationMenuItem>
                        <Link href="/#reviews" className={cn("px-4 py-2 transition-colors hover:bg-accent hover:text-accent-foreground rounded-md")}>
                            Reviews
                        </Link>
                    </NavigationMenuItem>
                    <NavigationMenuItem>
                        <Link href="/#pricing" className={cn("px-4 py-2 transition-colors hover:bg-accent hover:text-accent-foreground rounded-md")}>
                            Pricing
                        </Link>
                    </NavigationMenuItem>
                    {isAuthenticated && (
                        <NavigationMenuItem>
                            <Link href="/dashboard" className={cn("px-4 py-2 transition-colors hover:bg-accent hover:text-accent-foreground rounded-md")}>
                                Dashboard
                            </Link>
                        </NavigationMenuItem>
                    )}
                </NavigationMenuList>
            </NavigationMenu>
            <div className="flex items-center gap-2 max-[825px]:hidden">
                {isAuthenticated ? (
                    <UserProfile />
                ) : (
                    <Link href="/sign-up">
                        <Button variant="outline" className="px-4 py-2">
                            Sign Up
                        </Button>
                    </Link>
                )}
                <ModeToggle />
            </div>
        </div>
    );
}
