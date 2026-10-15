"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import {
  FileCheck2,
  Download,
  Eye,
  CheckCircle2,
  FileArchive,
  Layers,
  History,
  X,
  CreditCard,
  Plus,
} from "lucide-react";

interface GeneratedCardItem {
  id: string;
  frontPdfStorageKey: string;
  backPdfStorageKey: string;
  combinedPdfStorageKey: string | null;
  configurationSnapshot: any;
  createdAt: string;
  order: {
    id: string;
    orderReference: string;
    status: string;
    customer: {
      id: string;
      name: string;
      designation: string;
      portfolioUrl: string;
    };
    template: {
      id: string;
      name: string;
    };
  };
}

export default function GeneratedCardsPage() {
  const [cards, setCards] = useState<GeneratedCardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSnapshot, setSelectedSnapshot] = useState<any | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);

  const loadCards = () => {
    setLoading(true);
    fetch("/api/dashboard/stats")
      .then((res) => res.json())
      .then((data) => {
        setCards(data.recentCards || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load cards:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadCards();
  }, []);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <FileCheck2 className="w-6 h-6 text-blue-600" />
              <span>Generated Personalized PDFs</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Production print-ready PDFs with immutable configuration snapshots and zero rasterization.
            </p>
          </div>

          <Link
            href="/cards/create"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Personalize New Card</span>
          </Link>
        </div>

        {/* Cards Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm">Loading generated cards history...</div>
          ) : cards.length === 0 ? (
            <div className="p-12 text-center bg-white space-y-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">No Generated PDFs Yet</h3>
                <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
                  Personalize your first card to generate print-ready vector PDFs and ZIP bundles.
                </p>
              </div>
              <Link
                href="/cards/create"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold"
              >
                <CreditCard className="w-4 h-4" />
                <span>Create Personalized Card</span>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                    <th className="py-3 px-6">Customer &amp; Role</th>
                    <th className="py-3 px-6">Template</th>
                    <th className="py-3 px-6">Order Ref</th>
                    <th className="py-3 px-6">Quality Status</th>
                    <th className="py-3 px-6 text-right">Download &amp; Export</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cards.map((card) => (
                    <tr key={card.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900">{card.order.customer.name}</div>
                        <div className="text-xs text-slate-500">{card.order.customer.designation}</div>
                        <div className="text-[11px] font-mono text-blue-600 truncate max-w-xs mt-0.5">
                          {card.order.customer.portfolioUrl}
                        </div>
                      </td>

                      <td className="py-4 px-6 font-medium text-slate-700">
                        {card.order.template.name}
                      </td>

                      <td className="py-4 px-6">
                        <span className="font-mono text-xs font-semibold px-2 py-1 bg-slate-100 text-slate-800 rounded">
                          {card.order.orderReference}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Passed All Checks
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          <button
                            onClick={() =>
                              setPreviewPdfUrl(`/api/files/${card.combinedPdfStorageKey || card.frontPdfStorageKey}`)
                            }
                            title="Print Preview"
                            className="p-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Primary Download: Both Front and Back in a single combined PDF */}
                          <a
                            href={`/api/cards/export/${card.id}?type=combined`}
                            title="Download Combined PDF (Front and Back Together)"
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download PDF (Front &amp; Back)</span>
                          </a>

                          <div className="inline-flex rounded-lg border border-slate-200 bg-white shadow-2xs">
                            <a
                              href={`/api/cards/export/${card.id}?type=front`}
                              title="Download Only Front Side"
                              className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-l-lg border-r border-slate-200 transition"
                            >
                              Front
                            </a>
                            <a
                              href={`/api/cards/export/${card.id}?type=back`}
                              title="Download Only Back Side"
                              className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-r-lg transition"
                            >
                              Back
                            </a>
                          </div>

                          <button
                            onClick={() => setSelectedSnapshot(card.configurationSnapshot)}
                            title="Inspect Immutable Snapshot"
                            className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                          >
                            <History className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal: Immutable Versioned Configuration Snapshot Viewer */}
        {selectedSnapshot && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-base text-slate-900">
                    Immutable Generation Configuration Snapshot
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedSnapshot(null)}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="text-xs text-slate-600 leading-relaxed space-y-2">
                <p>
                  This record locks the exact physical coordinates, typography, and customer parameters used when this card was personalized. Future edits to the master template will never alter this historical record.
                </p>
              </div>

              <div className="flex-1 overflow-auto bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs">
                <pre>{JSON.stringify(selectedSnapshot, null, 2)}</pre>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  onClick={() => setSelectedSnapshot(null)}
                  className="px-5 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold"
                >
                  Close Snapshot
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Interactive PDF Print Preview */}
        {previewPdfUrl && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 h-[85vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-base text-slate-900">Print Preview (Original Physical Scale)</h3>
                </div>
                <button
                  onClick={() => setPreviewPdfUrl(null)}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                <iframe src={previewPdfUrl} className="w-full h-full" title="PDF Print Preview" />
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-xs text-slate-500">
                  Ready for direct commercial printing or digital card distribution.
                </span>
                <button
                  onClick={() => setPreviewPdfUrl(null)}
                  className="px-5 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-xs font-semibold"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
