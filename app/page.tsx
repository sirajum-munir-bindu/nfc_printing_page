"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import {
  Layers,
  Users,
  CreditCard,
  ShoppingBag,
  Plus,
  ArrowRight,
  Download,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

interface DashboardData {
  stats: {
    totalTemplates: number;
    totalCustomers: number;
    totalGeneratedCards: number;
    pendingOrders: number;
  };
  recentCards: Array<{
    id: string;
    createdAt: string;
    order: {
      orderReference?: string | null;
      customer: { name: string; designation?: string | null; portfolioUrl: string };
      template: { name: string };
    };
  }>;
  recentOrders: Array<{
    id: string;
    orderReference?: string | null;
    status: string;
    createdAt: string;
    customer: { name: string };
    template: { name: string };
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAllCards, setShowAllCards] = useState(false);
  const [loadingAllCards, setLoadingAllCards] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load dashboard data:", err);
        setLoading(false);
      });
  }, []);

  const toggleShowAll = async () => {
    if (!showAllCards) {
      setLoadingAllCards(true);
      try {
        const res = await fetch("/api/dashboard/stats?all=true");
        const json = await res.json();
        setData((prev) => (prev ? { ...prev, recentCards: json.recentCards } : json));
        setShowAllCards(true);
      } catch (err) {
        console.error("Failed to load all cards:", err);
      } finally {
        setLoadingAllCards(false);
      }
    } else {
      setShowAllCards(false);
      try {
        const res = await fetch("/api/dashboard/stats");
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Failed to reload stats:", err);
      }
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header Hero */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold tracking-wide text-blue-200">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Lossless PDF Personalization Engine</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">NFC Card Studio</h1>
            <p className="text-blue-100/90 text-sm leading-relaxed">
              Overlay Name, Designation, and high-density QR codes onto master business card PDFs without full-page rasterization or artwork degradation.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/cards/create"
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-blue-900 hover:bg-blue-50 font-bold text-sm shadow-md transition"
            >
              <CreditCard className="w-4 h-4 text-blue-600" />
              <span>Create Card</span>
            </Link>
            <Link
              href="/templates/create"
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600/60 hover:bg-blue-600 text-white font-semibold text-sm border border-white/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>New Template</span>
            </Link>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Card Templates</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">
                {loading ? "..." : data?.stats.totalTemplates ?? 0}
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Customers</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">
                {loading ? "..." : data?.stats.totalCustomers ?? 0}
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Generated Cards</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">
                {loading ? "..." : data?.stats.totalGeneratedCards ?? 0}
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending Orders</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">
                {loading ? "..." : data?.stats.pendingOrders ?? 0}
              </p>
            </div>
          </div>
        </div>

        {/* Recent Generated PDFs Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-slate-900">Recently Generated Personalized PDFs</h2>
                {data?.stats?.totalGeneratedCards !== undefined && (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    Total: {data.stats.totalGeneratedCards}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                All outputs preserve original vector artwork and embedding with decodable QR codes.
              </p>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              {data?.stats?.totalGeneratedCards && data.stats.totalGeneratedCards > 5 && (
                <button
                  onClick={toggleShowAll}
                  disabled={loadingAllCards}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
                >
                  {loadingAllCards
                    ? "Loading..."
                    : showAllCards
                    ? "Show Recent (5)"
                    : `Show All (${data.stats.totalGeneratedCards})`}
                </button>
              )}
              <Link
                href="/cards"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition"
              >
                <span>View Full History ({data?.stats?.totalGeneratedCards ?? 0})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-sm">Loading activity...</div>
            ) : !data?.recentCards || data.recentCards.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No cards generated yet. Click &quot;Create Card&quot; to personalize your first business card!
              </div>
            ) : (
              data.recentCards.map((card) => (
                <div
                  key={card.id}
                  className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">
                        {card.order?.customer?.name || "Unknown Customer"}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Verified PDF
                      </span>
                      {card.createdAt && (
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(card.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span>{card.order?.customer?.designation || "—"}</span>
                      <span>•</span>
                      <span className="font-mono text-slate-600">
                        {card.order?.template?.name || "Default Template"}
                      </span>
                      {card.order?.orderReference && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-slate-600">
                            {card.order.orderReference}
                          </span>
                        </>
                      )}
                      {card.order?.customer?.portfolioUrl && (
                        <>
                          <span>•</span>
                          <span className="text-blue-600 font-mono truncate max-w-xs">
                            {card.order.customer.portfolioUrl}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href={`/api/cards/export/${card.id}?type=combined`}
                      className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download PDF (Front &amp; Back)</span>
                    </a>
                    <a
                      href={`/api/cards/export/${card.id}?type=front`}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-1"
                    >
                      <span>Front</span>
                    </a>
                    <a
                      href={`/api/cards/export/${card.id}?type=back`}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-1"
                    >
                      <span>Back</span>
                    </a>
                  </div>
                </div>
              ))
            )}
            {data?.stats?.totalGeneratedCards &&
              !showAllCards &&
              data.stats.totalGeneratedCards > (data.recentCards?.length || 0) && (
                <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
                  <span>
                    Showing latest {data.recentCards.length} of {data.stats.totalGeneratedCards} generated cards history
                  </span>
                  <button
                    onClick={toggleShowAll}
                    disabled={loadingAllCards}
                    className="font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <span>Expand to view all {data.stats.totalGeneratedCards} records here</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
          </div>
        </div>

        {/* Quality Architecture Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Zero Rasterization</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Original master PDFs remain 100% immutable. Vector artwork and backgrounds are untouched and copied page-by-page.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Point-Accurate Alignment</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              All coordinates are stored and rendered strictly in PDF points (72 pt/in) with automatic bottom-left translation.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Automated QR Verification</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              QR codes are generated at 1024px+ resolution and verified with automated decoding before allowing export.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
