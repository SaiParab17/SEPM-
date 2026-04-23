import { Navbar } from "@/components/Navbar";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col mesh-bg">
      <Navbar />
      <main className="relative z-10 flex-1">{children}</main>
    </div>
  );
}