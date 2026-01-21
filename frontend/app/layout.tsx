import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CloudChat Arcade",
  description: "Discord-like chat with arcade games",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="scanline">
        {/* Ambient animated background */}
        <div className="cc-bg" aria-hidden="true">
          <div className="cc-bg__gradient" />
          <div className="cc-orb cc-orb--a" />
          <div className="cc-orb cc-orb--b" />
          <div className="cc-orb cc-orb--c" />
        </div>
        {children}
      </body>
    </html>
  );
}
