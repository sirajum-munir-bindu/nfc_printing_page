"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  PlusCircle,
  Users,
  CreditCard,
  ShoppingBag,
  Settings,
  LogOut,
  Sparkles,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
  Zap,
} from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(pathname !== "/login");

  useEffect(() => {
    // If on login page, do not fetch session
    if (pathname === "/login") {
      setCheckingAuth(false);
      return;
    }

    let isMounted = true;

    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) {
          window.location.href = "/login";
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (isMounted && data?.user) {
          setUser(data.user);
          setCheckingAuth(false);
        }
      })
      .catch(() => {
        window.location.href = "/login";
      });

    return () => {
      isMounted = false;
    };
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore network errors on logout
    }
    window.location.href = "/login";
  };

  if (pathname === "/login") {
    return <>{children}</>;
  }

  if (checkingAuth) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30 animate-pulse">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <span className="text-sm font-semibold text-slate-300 tracking-wide">
            Verifying Studio Session...
          </span>
        </div>
      </div>
    );
  }

  const navGroups = [
    {
      group: "Overview",
      items: [
        { label: "Dashboard", href: "/", icon: LayoutDashboard },
      ],
    },
    {
      group: "Production & Fulfillment",
      items: [
        { label: "Create Card", href: "/cards/create", icon: CreditCard, highlight: true },
        { label: "Card Orders", href: "/orders", icon: ShoppingBag },
      ],
    },
    {
      group: "Design & Assets",
      items: [
        { label: "Card Templates", href: "/templates", icon: Layers },
        { label: "Customer Directory", href: "/customers", icon: Users },
      ],
    },
    {
      group: "System",
      items: [
        { label: "Settings & Quality", href: "/settings", icon: Settings },
      ],
    },
  ];

  // Helper to format page title for header breadcrumb
  const getPageTitle = () => {
    if (pathname === "/") return "Dashboard";
    const segment = pathname.replace(/^\//, "").split("/")[0];
    switch (segment) {
      case "templates":
        return pathname.includes("create")
          ? "Create Template"
          : pathname.includes("editor")
          ? "Visual Template Editor"
          : "Card Templates";
      case "cards":
        return pathname.includes("create") ? "Create Personalized Card" : "Generated Output PDFs";
      case "orders":
        return "Card Orders & Fulfillment";
      case "customers":
        return "Customer Directory";
      case "settings":
        return "Studio Settings & Diagnostics";
      default:
        return segment.replace(/-/g, " ");
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-slate-50 font-sans text-slate-900 antialiased">
      {/* Pinned Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 xl:w-72 h-full flex-shrink-0 bg-slate-900 text-white border-r border-slate-800/90 z-20 select-none">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800/90 flex items-center justify-between flex-shrink-0 bg-slate-900">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-105 transition duration-200">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-white group-hover:text-blue-300 transition">
                  NFC Studio
                </span>
                <span className="text-[10px] font-bold bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30">
                  PRO
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase block mt-0.5">
                Card Personalizer
              </span>
            </div>
          </Link>
        </div>

        {/* Scrollable Navigation - scrolls independently if screen height is compact */}
        <nav className="flex-1 px-3.5 py-4 space-y-6 overflow-y-auto sidebar-scrollbar">
          {navGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              <p className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                {group.group}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/" && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                        isActive
                          ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30 font-bold"
                          : item.highlight
                          ? "text-blue-300 hover:bg-slate-800/90 hover:text-white border border-blue-500/25 bg-blue-500/5"
                          : "text-slate-400 hover:bg-slate-800/80 hover:text-white"
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 flex-shrink-0 ${
                          isActive
                            ? "text-white"
                            : item.highlight
                            ? "text-blue-400"
                            : "text-slate-400"
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                      {item.highlight && !isActive && (
                        <span className="ml-auto text-[10px] font-bold bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/30">
                          Action
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Pinned User Footer at bottom of sidebar */}
        <div className="p-3.5 border-t border-slate-800/90 bg-slate-900/95 flex-shrink-0">
          <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-xs">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : "AD"}
              </div>
              <div className="truncate text-left leading-tight">
                <p className="text-xs font-bold text-white truncate">{user?.name || "Administrator"}</p>
                <p className="text-[11px] text-slate-400 truncate font-mono">{user?.email || "admin@example.com"}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800/80 rounded-lg transition flex-shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main App Container */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden bg-slate-50">
        {/* Desktop Pinned Top Header */}
        <header className="hidden lg:flex items-center justify-between px-8 py-3.5 bg-white border-b border-slate-200/90 shadow-2xs z-10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span className="text-slate-400">NFC Studio</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-900 font-bold capitalize">
                {getPageTitle()}
              </span>
            </div>
            <div className="h-4 w-px bg-slate-200 mx-1" />
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Lossless Engine Ready</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/cards/create"
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition duration-150"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Create Card</span>
            </Link>
            <Link
              href="/templates/create"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition duration-150"
            >
              <PlusCircle className="w-3.5 h-3.5 text-slate-500" />
              <span>New Template</span>
            </Link>
          </div>
        </header>

        {/* Mobile Header */}
        <header className="lg:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800 z-10 flex-shrink-0">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm">NFC Card Studio</span>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-300 hover:text-white"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </header>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-slate-900 border-b border-slate-800 px-4 py-4 space-y-3 z-30 max-h-[75vh] overflow-y-auto">
            {navGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
                  {group.group}
                </p>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${
                        isActive
                          ? "bg-blue-600 text-white"
                          : "text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
            <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
              <span className="truncate max-w-[200px]">{user?.email}</span>
              <button onClick={handleLogout} className="text-red-400 font-semibold px-2 py-1">
                Log Out
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area - ONLY THIS ELEMENT SCROLLS */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
