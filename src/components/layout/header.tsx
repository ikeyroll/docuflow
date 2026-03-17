"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, LogOut, User } from "lucide-react";

interface HeaderProps {
  userName: string;
  userRole: string;
  companyName: string;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  STAFF: "Staff",
  VIEWER: "Viewer",
};

export function Header({ userName, userRole, companyName }: HeaderProps) {
  const router = useRouter();

  async function handleLogout() {
    await signOut({ redirect: false });
    router.push("/login");
  }

  return (
    <header className="h-14 border-b bg-background flex items-center justify-between px-6 shrink-0">
      <span className="text-sm font-semibold text-foreground truncate">
        {companyName}
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted outline-none">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold uppercase">
            {userName.charAt(0) || "U"}
          </div>
          <div className="hidden sm:flex flex-col items-start leading-none">
            <span className="text-sm font-medium">{userName}</span>
            <span className="text-xs text-muted-foreground">{ROLE_LABELS[userRole] ?? userRole}</span>
          </div>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium">{userName}</p>
            <p className="text-xs text-muted-foreground">{ROLE_LABELS[userRole] ?? userRole}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/dashboard/settings/users")}>
            <User className="mr-2 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
