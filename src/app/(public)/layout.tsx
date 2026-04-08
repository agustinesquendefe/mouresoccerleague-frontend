import type { Metadata } from "next";
import "../global.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import MuiProvider from "./MuiProvider";

export const dynamic = 'force-dynamic';

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

export const metadata: Metadata = {
  title: "Moure Premier Soccer League - Home",
  description: "Welcome to Moure Premier Soccer League, the premier amateur soccer league in the United States. Join us for competitive play, community engagement, and a passion for the beautiful game.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <MuiProvider>
      <link rel="stylesheet" href="https://use.typekit.net/orf2jwd.css" />
      <Header />
      <div className="min-h-[80vh]">{children}</div>
      <Footer />
    </MuiProvider>
  );
}