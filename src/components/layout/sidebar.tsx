"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  FileText,
  Receipt,
  ShoppingCart,
  CreditCard,
  Users,
  Truck,
  Package,
  BarChart2,
  Settings,
  ClipboardList,
  Menu,
  X,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "MANAGER", "STAFF", "VIEWER"] },
  { href: "/dashboard/quotations", label: "Quotations", icon: FileText, roles: ["ADMIN", "MANAGER", "STAFF", "VIEWER"] },
  { href: "/dashboard/invoices", label: "Invoices", icon: Receipt, roles: ["ADMIN", "MANAGER", "STAFF", "VIEWER"] },
  { href: "/dashboard/purchase-orders", label: "Purchase Orders", icon: ShoppingCart, roles: ["ADMIN", "MANAGER", "STAFF", "VIEWER"] },
  { href: "/dashboard/credit-notes", label: "Credit Notes", icon: CreditCard, roles: ["ADMIN", "MANAGER", "STAFF", "VIEWER"] },
  { href: "/dashboard/clients", label: "Clients", icon: Users, roles: ["ADMIN", "MANAGER", "STAFF"] },
  { href: "/dashboard/suppliers", label: "Suppliers", icon: Truck, roles: ["ADMIN", "MANAGER", "STAFF"] },
  { href: "/dashboard/products", label: "Products", icon: Package, roles: ["ADMIN", "MANAGER", "STAFF"] },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart2, roles: ["ADMIN", "MANAGER", "VIEWER"] },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, roles: ["ADMIN"] },
  { href: "/dashboard/audit-log", label: "Audit Log", icon: ClipboardList, roles: ["ADMIN"] },
];

interface SidebarProps {
  userRole: string;
}

function NavLinks({ userRole, onNavigate }: { userRole: string; onNavigate?: () => void }) {
  const pathname = usePathname();

  const visibleItems = navItems.filter((item) => item.roles.includes(userRole));

  return (
    <nav className="flex flex-col gap-1 px-3 py-4">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarContent({ userRole, onNavigate }: { userRole: string; onNavigate?: () => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-5 border-b">
        <h1 className="text-xl font-bold text-primary">DocuFlow</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Document Automation</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        <NavLinks userRole={userRole} onNavigate={onNavigate} />
      </div>
    </div>
  );
}

export function Sidebar({ userRole }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r bg-background">
        <SidebarContent userRole={userRole} />
      </aside>

      {/* Mobile sidebar trigger */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger className="flex h-9 w-9 items-center justify-center rounded-md border bg-background shadow-sm hover:bg-muted">
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </SheetTrigger>
          <SheetContent side="left" className="w-60 p-0">
            <SidebarContent
              userRole={userRole}
              onNavigate={() => setMobileOpen(false)}
            />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
