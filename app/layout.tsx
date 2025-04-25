'use client';

import "./globals.css";

import '@rainbow-me/rainbowkit/styles.css';


import { MainNav } from "@/components/ui/navbar";
import { Inter } from "next/font/google";
import { Providers } from '@/app/providers';




const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <title>badOode: Your custom blockchain address</title>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&family=Outfit:wght@100..900&family=Wendy+One&display=swap" rel="stylesheet" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#10ad71" />
        <link rel="icon" type="image/png" href="/badoodelight.png" />
        <link rel="apple-touch-icon" href="/badoodelight.png" />
      </head>
      <body className={`${inter.className} outfit-font`}>
        <Providers>
          <MainNav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
