"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  FileCheck,
  Megaphone,
  Settings,
  ClipboardList,
  Banknote,
  PackagePlus,
  Mail,
  BarChart3,
  Bell,
  MessagesSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/layout/brand-mark";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/bulk-orders", label: "Bulk Order Requests", icon: PackagePlus },
  { href: "/admin/support", label: "Customer Messages", icon: MessagesSquare },
  { href: "/admin/emails", label: "Email Center", icon: Mail },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/restock-subscriptions", label: "Restock Subscribers", icon: Bell },
  { href: "/admin/reports", label: "Sales Reports", icon: BarChart3 },
  { href: "/admin/affiliates", label: "Affiliates", icon: Users },
  { href: "/admin/affiliates/applications", label: "Applications", icon: ClipboardList },
  { href: "/admin/affiliates/payouts", label: "Payouts", icon: Banknote },
  { href: "/admin/coas", label: "COAs", icon: FileCheck },
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r border-border bg-card">
      <div className="border-b border-border px-4 py-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Admin
        </p>
        <BrandMark size="sm" className="mt-2" />
      </div>
      <nav className="flex flex-col gap-0.5 p-3">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
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
    </aside>
  );
}
