"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import {
  Upload,
  FileCheck,
  AlertTriangle,
  ArrowRight,
  Layers,
  Sparkles,
  Info,
} from "lucide-react";
import { pointsToMm, pointsToInches } from "@/lib/pdf/coordinate";

interface UploadedPdfInfo {
  key: string;
  size: number;
  pageCount: number;
  pages: Array<{
    pageIndex: number;
    width: number;
    height: number;
    widthMm: number;
    heightMm: number;
    widthInches: number;
    heightInches: number;
    rotation: number;
    isStandardBusinessCard: boolean;
  }>;
  warnings: string[];
}

export default function CreateTemplatePage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Front PDF upload state
  const [frontUploading, setFrontUploading] = useState(false);
  const [frontPdf, setFrontPdf] = useState<UploadedPdfInfo | null>(null);
  const [frontPageIndex, setFrontPageIndex] = useState(0);

  // Back PDF upload state
  const [backUploading, setBackUploading] = useState(false);
  const [backPdf, setBackPdf] = useState<UploadedPdfInfo | null>(null);
  const [backPageIndex, setBackPageIndex] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (file: File, side: "front" | "back") => {
    setError(null);
    const isFront = side === "front";
    if (isFront) setFrontUploading(true);
    else setBackUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("side", side);

      const res = await fetch("/api/upload/pdf", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to upload ${side} PDF`);
      }

      if (isFront) {
        setFrontPdf(data);
        setFrontPageIndex(0);
      } else {
        setBackPdf(data);
        setBackPageIndex(0);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload error");
    } finally {
      if (isFront) setFrontUploading(false);
      else setBackUploading(false);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Template name is required");
      return;
    }
    if (!frontPdf || !backPdf) {
      setError("Both Front and Back PDF files must be uploaded");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const frontPage = frontPdf.pages[frontPageIndex] || frontPdf.pages[0];
      const backPage = backPdf.pages[backPageIndex] || backPdf.pages[0];

      // Default smart element coordinates tailored to standard 3.5x2 inch card
      const defaultElements = [
        {
          type: "NAME",
          side: "FRONT",
          x: Math.round(frontPage.width * 0.08),
          y: Math.round(frontPage.height * 0.38),
          width: Math.round(frontPage.width * 0.65),
          height: 22,
          fontFamily: "Helvetica-Bold",
          fontSize: 14,
          color: "#0f172a",
          alignment: "left",
          enabled: true,
        },
        {
          type: "DESIGNATION",
          side: "FRONT",
          x: Math.round(frontPage.width * 0.08),
          y: Math.round(frontPage.height * 0.55),
          width: Math.round(frontPage.width * 0.65),
          height: 16,
          fontFamily: "Helvetica",
          fontSize: 10,
          color: "#2563eb",
          alignment: "left",
          enabled: true,
        },
        {
          type: "QR_CODE",
          side: "BACK",
          x: Math.round(backPage.width * 0.65),
          y: Math.round(backPage.height * 0.25),
          width: 65,
          height: 65,
          alignment: "center",
          enabled: true,
        },
      ];

      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          frontPdfStorageKey: frontPdf.key,
          backPdfStorageKey: backPdf.key,
          frontPageIndex,
          backPageIndex,
          frontPageWidth: frontPage.width,
          frontPageHeight: frontPage.height,
          backPageWidth: backPage.width,
          backPageHeight: backPage.height,
          elements: defaultElements,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to create template");
      }

      // Redirect immediately into the visual coordinate position editor
      router.push(`/templates/${json.template.id}/editor`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Creation failed");
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-blue-600" />
            <span>Create Card Template</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Upload the master Front and Back PDFs provided by your card supplier and inspect page dimensions.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleCreateTemplate} className="space-y-6">
          {/* Metadata Section */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900">Template Details</h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Modern Matte Black NFC Business Card"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Description / Supplier Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. US Standard 3.5 x 2.0 inch, 3mm bleed, matte finish"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Dual PDF Upload Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* FRONT PDF UPLOAD */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    <span>Original Front PDF *</span>
                  </h3>
                  {frontPdf && (
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <FileCheck className="w-3.5 h-3.5" />
                      Uploaded
                    </span>
                  )}
                </div>

                <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-6 text-center transition bg-slate-50/50">
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    id="front-pdf-input"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, "front");
                    }}
                  />
                  <label htmlFor="front-pdf-input" className="cursor-pointer block space-y-2">
                    <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs font-semibold text-blue-600 hover:underline">
                      {frontUploading ? "Validating & Uploading..." : "Click to select Front PDF"}
                    </p>
                    <p className="text-[11px] text-slate-400">PDF signature verified automatically</p>
                  </label>
                </div>

                {/* Front PDF Inspection Metadata */}
                {frontPdf && frontPdf.pages.length > 0 && (
                  <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-100 text-xs space-y-2">
                    <p className="font-bold text-blue-900">Front Page Geometry:</p>
                    <div className="space-y-1 font-mono text-blue-800 text-[11px]">
                      <p>
                        Dimensions: {frontPdf.pages[frontPageIndex].width} x {frontPdf.pages[frontPageIndex].height} pt
                      </p>
                      <p>
                        Metric: {frontPdf.pages[frontPageIndex].widthMm} x {frontPdf.pages[frontPageIndex].heightMm} mm (
                        {frontPdf.pages[frontPageIndex].widthInches}&quot; x {frontPdf.pages[frontPageIndex].heightInches}&quot;)
                      </p>
                    </div>

                    {frontPdf.pageCount > 1 && (
                      <div className="pt-2">
                        <label className="block text-[11px] font-semibold text-blue-900 mb-1">
                          Select Front Page Index ({frontPdf.pageCount} pages available):
                        </label>
                        <select
                          value={frontPageIndex}
                          onChange={(e) => setFrontPageIndex(parseInt(e.target.value, 10))}
                          className="w-full text-xs p-1.5 border border-blue-200 bg-white rounded-lg"
                        >
                          {frontPdf.pages.map((p, i) => (
                            <option key={i} value={i}>
                              Page {i + 1} ({p.width} x {p.height} pt)
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {frontPdf.warnings.map((w, i) => (
                      <p key={i} className="text-amber-700 text-[11px]">
                        ⚠️ {w}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* BACK PDF UPLOAD */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                    <span>Original Back PDF *</span>
                  </h3>
                  {backPdf && (
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <FileCheck className="w-3.5 h-3.5" />
                      Uploaded
                    </span>
                  )}
                </div>

                <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-6 text-center transition bg-slate-50/50">
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    id="back-pdf-input"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, "back");
                    }}
                  />
                  <label htmlFor="back-pdf-input" className="cursor-pointer block space-y-2">
                    <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs font-semibold text-indigo-600 hover:underline">
                      {backUploading ? "Validating & Uploading..." : "Click to select Back PDF"}
                    </p>
                    <p className="text-[11px] text-slate-400">PDF signature verified automatically</p>
                  </label>
                </div>

                {/* Back PDF Inspection Metadata */}
                {backPdf && backPdf.pages.length > 0 && (
                  <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-100 text-xs space-y-2">
                    <p className="font-bold text-indigo-900">Back Page Geometry:</p>
                    <div className="space-y-1 font-mono text-indigo-800 text-[11px]">
                      <p>
                        Dimensions: {backPdf.pages[backPageIndex].width} x {backPdf.pages[backPageIndex].height} pt
                      </p>
                      <p>
                        Metric: {backPdf.pages[backPageIndex].widthMm} x {backPdf.pages[backPageIndex].heightMm} mm (
                        {backPdf.pages[backPageIndex].widthInches}&quot; x {backPdf.pages[backPageIndex].heightInches}&quot;)
                      </p>
                    </div>

                    {backPdf.pageCount > 1 && (
                      <div className="pt-2">
                        <label className="block text-[11px] font-semibold text-indigo-900 mb-1">
                          Select Back Page Index ({backPdf.pageCount} pages available):
                        </label>
                        <select
                          value={backPageIndex}
                          onChange={(e) => setBackPageIndex(parseInt(e.target.value, 10))}
                          className="w-full text-xs p-1.5 border border-indigo-200 bg-white rounded-lg"
                        >
                          {backPdf.pages.map((p, i) => (
                            <option key={i} value={i}>
                              Page {i + 1} ({p.width} x {p.height} pt)
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {backPdf.warnings.map((w, i) => (
                      <p key={i} className="text-amber-700 text-[11px]">
                        ⚠️ {w}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Submission and Transition to Editor */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="submit"
              disabled={submitting || !frontPdf || !backPdf}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md transition disabled:opacity-50"
            >
              <span>{submitting ? "Saving & Opening Editor..." : "Save & Open Position Editor"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
