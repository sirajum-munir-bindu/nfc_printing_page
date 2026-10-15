"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import {
  Layers,
  Plus,
  Sliders,
  Trash2,
  CreditCard,
  FileText,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { pointsToMm } from "@/lib/pdf/coordinate";

interface Template {
  id: string;
  name: string;
  description: string | null;
  frontPageWidth: number;
  frontPageHeight: number;
  backPageWidth: number;
  backPageHeight: number;
  frontPdfStorageKey: string;
  backPdfStorageKey: string;
  elements: Array<{ id: string; type: string; side: string }>;
  _count?: { orders: number };
  createdAt: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTemplates = () => {
    setLoading(true);
    fetch("/api/templates")
      .then((res) => res.json())
      .then((data) => {
        setTemplates(data.templates || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load templates");
        setLoading(false);
      });
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete template "${name}"?`)) return;

    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to delete template");
        return;
      }
      loadTemplates();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error deleting template");
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Layers className="w-6 h-6 text-blue-600" />
              <span>Card Templates</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Upload master supplier PDFs and configure reusable placement coordinates.
            </p>
          </div>

          <Link
            href="/templates/create"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Template</span>
          </Link>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">
            Loading templates...
          </div>
        ) : templates.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">No Templates Found</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
                Upload your supplier&apos;s blank Front and Back PDFs to create your first template.
              </p>
            </div>
            <Link
              href="/templates/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>Create Template</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition flex flex-col justify-between overflow-hidden"
              >
                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-base text-slate-900 line-clamp-1">{tpl.name}</h3>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                        {tpl.description || "No description provided"}
                      </p>
                    </div>
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {tpl.elements?.length || 0} Elements
                    </span>
                  </div>

                  {/* Physical Dimensions */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span className="font-medium">Page Size:</span>
                      <span className="font-mono font-semibold text-slate-900">
                        {tpl.frontPageWidth} x {tpl.frontPageHeight} pt
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>Metric:</span>
                      <span className="font-mono">
                        {pointsToMm(tpl.frontPageWidth)} x {pointsToMm(tpl.frontPageHeight)} mm
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>Usage:</span>
                      <span>{tpl._count?.orders ?? 0} Card Orders</span>
                    </div>
                  </div>

                  {/* Element placement preview chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {tpl.elements?.map((el) => (
                      <span
                        key={el.id}
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          el.side === "FRONT"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                        }`}
                      >
                        {el.side}: {el.type}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Link
                    href={`/templates/${tpl.id}/editor`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 shadow-2xs transition"
                  >
                    <Sliders className="w-3.5 h-3.5 text-blue-600" />
                    <span>Coordinate Editor</span>
                  </Link>

                  <Link
                    href={`/cards/create?templateId=${tpl.id}`}
                    title="Personalize Card"
                    className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-2xs transition"
                  >
                    <CreditCard className="w-4 h-4" />
                  </Link>

                  <button
                    onClick={() => handleDelete(tpl.id, tpl.name)}
                    title="Delete Template"
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
