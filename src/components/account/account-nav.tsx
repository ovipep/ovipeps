"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, Settings, LogOut, ShieldCheck } from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Overview", href: "/account", icon: LayoutDashboard, exact: true },
  { label: "Orders", href: "/account/orders", icon: Package },
  { label: "Settings", href: "/account/settings", icon: Settings },
];

export function AccountNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {isAdmin ? (
        <Link
          href="/admin"
          className="mb-3 flex items-center gap-3 rounded-lg bg-navy px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-deep"
        >
          <ShieldCheck className="h-4 w-4 shrink-0" />
          Open Admin Back Office
        </Link>
      ) : null}

      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-navy/10 text-navy"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}

      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/" })}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
      >
        <LogOut className="h-4 w-4 shrink-0" />
        Sign out
      </button>
    </nav>
  );
}
