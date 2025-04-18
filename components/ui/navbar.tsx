'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import Custombutton from "@/app/provider/Wallet"

export function MainNav() {
    const pathname = usePathname()

    return (
        <header className="fixed top-0 w-full outfit-font bg-background/95 backdrop-blur bg-transparent z-50 outfit-font">
            <div className="container  flex h-16 px-32 text-white">
                <nav className="flex w-full justify-between items-center space-x-6">
                    <Link href="/" className="font-bold text-xl">
                        Badoode
                    </Link>
                    <div className="flex items-center space-x-4">
                        <Link
                            href="/vanity-finder"
                            className={cn(
                                "text-sm font-medium transition-colors hover:text-primary",
                                pathname === "/vanity-finder" ? "text-foreground" : "text-muted-foreground"
                            )}
                        >
                            Vanity Finder
                        </Link>
                        <Link
                            href="/create-token"
                            className={cn(
                                "text-sm font-medium transition-colors hover:text-primary",
                                pathname === "/create-token" ? "text-foreground" : "text-muted-foreground"
                            )}
                        >
                            Create Token
                        </Link>
                        <Link
                            href="/create-wallet"
                            className={cn(
                                "text-sm font-medium transition-colors hover:text-primary",
                                pathname === "/create-wallet" ? "text-foreground" : "text-muted-foreground"
                            )}
                        >
                            Create Wallet
                        </Link>
                        <div className="flex items-center">
                            <Custombutton />
                        </div>
                    </div>
                </nav>

            </div>
        </header>
    )
}