import "./globals.css";
import Header from "@/components/Header";

export const metadata = { title: "Tokyo K-Food Map", description: "Demo" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen">
        <Header />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 pb-10 text-xs" style={{color:"var(--muted)"}}>
          Demo only • Next.js + Supabase
        </footer>
      </body>
    </html>
  );
}