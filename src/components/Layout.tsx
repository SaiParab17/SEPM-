import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-12 flex items-center border-b px-4">
            <SidebarTrigger className="mr-3" />
            <span className="text-sm font-medium text-muted-foreground">DocuMind</span>
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}