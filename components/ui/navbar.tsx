'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import Custombutton from "@/app/provider/Wallet"

export function MainNav() {
    const pathname = usePathname()

    return (
        <header className="fixed top-0 w-full outfit-font bg-white/95 backdrop-blur border-b border-gray-200 z-50">
            <div className="container flex h-16 px-4 sm:px-6 lg:px-8">
                <nav className="flex w-full justify-between items-center">
                    <Link href="/" className="wendy-font text-2xl font-medium text-[#10ad71]">
                        badOode
                    </Link>
                    <div className="flex items-center space-x-8">
                        <Link
                            href="/"
                            className={cn(
                                "text-sm font-medium transition-colors hover:text-[#10ad71]",
                                pathname === "/" ? "text-[#10ad71]" : "text-gray-500"
                            )}
                        >
                            Deploy token
                        </Link>
                        {/* <Link
                            href="/create-token"
                            className={cn(
                                "text-sm font-medium transition-colors hover:text-primary",
                                pathname === "/create-token" ? "text-foreground" : "text-muted-foreground"
                            )}
                        >
                            Create Token
                        </Link> */}
                        <Link
                            href="/create-wallet"
                            className={cn(
                                "text-sm font-medium transition-colors hover:text-[#10ad71]",
                                pathname === "/create-wallet" ? "text-[#10ad71]" : "text-gray-500"
                            )}
                        >
                            Create Wallet
                        </Link>
                    </div>
                    <div className="flex items-center">
                        <Custombutton />
                    </div>
                </nav>
            </div>
        </header>
    )
}