"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import TemplateEditor from "@/components/editor/TemplateEditor";
import { ArrowLeft, Sliders, AlertCircle, CreditCard } from "lucide-react";

function TemplateEditorContent() {
  const params = useParams();
  const id = params?.id as string;

  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/templates/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Template not found");
        return res.json();
      })
      .then((data) => {
        setTemplate(data.template);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load template");
        setLoading(false);
      });
  }, [id]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/templates"
              className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Sliders className="w-5 h-5 text-blue-600" />
                <span>{template ? template.name : "Position Editor"}</span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Visual coordinate editor • Drag, resize, and configure variable elements.
              </p>
            </div>
          </div>

          {template && (
            <Link
              href={`/cards/create?templateId=${template.id}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Personalize Card With This Template</span>
            </Link>
          )}
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="p-16 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">
            Loading template and master PDFs...
          </div>
        ) : template ? (
          <TemplateEditor
            templateId={template.id}
            templateName={template.name}
            frontPdfKey={template.frontPdfStorageKey}
            backPdfKey={template.backPdfStorageKey}
            frontPageIndex={template.frontPageIndex}
            backPageIndex={template.backPageIndex}
            pageWidth={template.frontPageWidth}
            pageHeight={template.frontPageHeight}
            initialElements={template.elements || []}
          />
        ) : null}
      </div>
    </AppLayout>
  );
}

export default function TemplateEditorPage() {
  return (
    <Suspense
      fallback={
        <div className="p-16 text-center text-slate-400 text-sm">
          Loading editor...
        </div>
      }
    >
      <TemplateEditorContent />
    </Suspense>
  );
}
