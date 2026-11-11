import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "FarmDoctor AI - Crop Disease Scanner & Farmer Advisory Platform",
  description:
    "AI-powered crop disease detection and farmer decision support using PyTorch EfficientNet-B0 and the PlantVillage dataset.",
  keywords: [
    "crop disease detection",
    "plant pathology AI",
    "agriculture",
    "PlantVillage",
    "farmer advisory",
    "EfficientNet-B0",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#FAFAF2] text-[#17251C] font-sans flex flex-col selection:bg-[#E7F4DF] selection:text-[#16803C]">
        {children}
      </body>
    </html>
  );
}
