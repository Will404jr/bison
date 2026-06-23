import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QMS – Queue management",
  description: "Ticket service system for customers, tellers and display board",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="app-canvas antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
