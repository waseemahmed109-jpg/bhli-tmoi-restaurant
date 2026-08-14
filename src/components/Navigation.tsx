"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Receipt, Settings, LogOut, Users } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import './Navigation.css';

export function Navigation() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (!session) return null;

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Order Pad", href: "/order", icon: Receipt },
    { name: "Kitchen", href: "/kitchen", icon: Settings }, 
  ];

  if (session.user.role === "admin") {
    navItems.push({ name: "Staff", href: "/staff", icon: Users });
  }

  return (
    <>
      <header className="top-header glass-panel">
        <div className="header-logo">
          <img src="/images/logo.jpg" alt="TMOI Logo" className="logo-img" />
          <span className="header-title">TMOI POS</span>
        </div>
        <div className="header-user">
          <span className="user-name">{session.user.name}</span>
          <span className="user-role">{session.user.role}</span>
          <button onClick={() => signOut()} className="logout-btn hover-lift">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <nav className="bottom-nav glass-panel">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`nav-item ${isActive ? "active" : ""}`}
            >
              <Icon size={24} className="nav-icon" />
              <span className="nav-label">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
