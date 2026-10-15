"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import {
  CreditCard,
  QrCode,
  Sparkles,
  Download,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Eye,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Layers,
  FileArchive,
} from "lucide-react";
import QRCode from "qrcode";
import jsQR from "jsqr";

interface TemplateOption {
  id: string;
  name: string;
  frontPageWidth: number;
  frontPageHeight: number;
  elements: Array<{ type: string; side: string }>;
}

interface CustomerOption {
  id: string;
  name: string;
  designation: string;
  portfolioUrl: string;
  email: string | null;
}

import { Suspense } from "react";

function CreateCardForm() {
  const searchParams = useSearchParams();
  const preselectedTemplateId = searchParams?.get("templateId") || "";
  const preselectedCustomerId = searchParams?.get("customerId") || "";

  // Data sources
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Form inputs
  const [selectedTemplateId, setSelectedTemplateId] = useState(preselectedTemplateId);
  const [selectedCustomerId, setSelectedCustomerId] = useState(preselectedCustomerId);

  const [customerName, setCustomerName] = useState("");
  const [designation, setDesignation] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("https://");
  const [email, setEmail] = useState("");
  const [orderReference, setOrderReference] = useState("");
  const [notes, setNotes] = useState("");

  // Live QR state
  const [liveQrDataUrl, setLiveQrDataUrl] = useState<string | null>(null);
  const [qrDecodedText, setQrDecodedText] = useState<string | null>(null);
  const [qrTestStatus, setQrTestStatus] = useState<"untested" | "passed" | "failed">("untested");

  // Dual-side preview state
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [frontPreviewBase64, setFrontPreviewBase64] = useState<string | null>(null);
  const [backPreviewBase64, setBackPreviewBase64] = useState<string | null>(null);

  // Generation & Export result state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationResult, setGenerationResult] = useState<any>(null);

  // Load initial templates and customers
  useEffect(() => {
    Promise.all([
      fetch("/api/templates").then((r) => r.json()),
      fetch("/api/customers").then((r) => r.json()),
    ])
      .then(([tplData, custData]) => {
        const tpls = tplData.templates || [];
        const custs = custData.customers || [];
        setTemplates(tpls);
        setCustomers(custs);

        if (!selectedTemplateId && tpls.length > 0) {
          setSelectedTemplateId(tpls[0].id);
        }

        if (preselectedCustomerId) {
          const match = custs.find((c: any) => c.id === preselectedCustomerId);
          if (match) {
            setCustomerName(match.name);
            setDesignation(match.designation);
            setPortfolioUrl(match.portfolioUrl);
            setEmail(match.email || "");
          }
        }
        setLoadingInitial(false);
      })
      .catch((err) => {
        console.error("Initialization error:", err);
        setLoadingInitial(false);
      });
  }, [preselectedCustomerId, selectedTemplateId]);

  // Handle existing customer dropdown change
  const handleCustomerSelect = (id: string) => {
    setSelectedCustomerId(id);
    if (!id) return;
    const match = customers.find((c) => c.id === id);
    if (match) {
      setCustomerName(match.name);
      setDesignation(match.designation);
      setPortfolioUrl(match.portfolioUrl);
      setEmail(match.email || "");
    }
  };

  // Live QR Code Generation & Verification
  useEffect(() => {
    let active = true;

    async function updateQr() {
      if (!portfolioUrl || !portfolioUrl.startsWith("http")) {
        setLiveQrDataUrl(null);
        setQrDecodedText(null);
        setQrTestStatus("untested");
        return;
      }

      try {
        const dataUrl = await QRCode.toDataURL(portfolioUrl.trim(), {
          width: 500,
          margin: 2,
          errorCorrectionLevel: "M",
          color: { dark: "#000000", light: "#ffffff" },
        });

        if (!active) return;
        setLiveQrDataUrl(dataUrl);

        // Immediate automated decodability test
        const qrRaw = QRCode.create(portfolioUrl.trim(), { errorCorrectionLevel: "M" });
        const modules = qrRaw.modules;
        const size = modules.size;
        const scale = 4;
        const canvasSize = size * scale;
        const rgba = new Uint8ClampedArray(canvasSize * canvasSize * 4);

        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            const isDark = modules.get(r, c);
            for (let py = 0; py < scale; py++) {
              for (let px = 0; px < scale; px++) {
                const idx = ((r * scale + py) * canvasSize + (c * scale + px)) * 4;
                const val = isDark ? 0 : 255;
                rgba[idx] = val;
                rgba[idx + 1] = val;
                rgba[idx + 2] = val;
                rgba[idx + 3] = 255;
              }
            }
          }
        }

        const decoded = jsQR(rgba, canvasSize, canvasSize);
        if (decoded && decoded.data === portfolioUrl.trim()) {
          setQrDecodedText(decoded.data);
          setQrTestStatus("passed");
        } else {
          setQrTestStatus("failed");
        }
      } catch {
        setLiveQrDataUrl(null);
        setQrTestStatus("failed");
      }
    }

    updateQr();
    return () => {
      active = false;
    };
  }, [portfolioUrl]);

  // Generate live preview of Front and Back sides
  const handleGeneratePreview = async () => {
    if (!selectedTemplateId || !customerName || !portfolioUrl) {
      setError("Please select a template and enter customer name and portfolio URL first.");
      return;
    }

    setGeneratingPreview(true);
    setError(null);

    try {
      const res = await fetch("/api/cards/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          customer: {
            name: customerName,
            designation,
            portfolioUrl,
            email,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Preview generation failed");
      }

      setFrontPreviewBase64(data.frontPdfBase64);
      setBackPreviewBase64(data.backPdfBase64);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Preview error");
    } finally {
      setGeneratingPreview(false);
    }
  };

  // Submit and export final personalized PDFs
  const handlePersonalizeAndExport = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/cards/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          customerId: selectedCustomerId || undefined,
          customerData: !selectedCustomerId
            ? {
                name: customerName,
                designation,
                portfolioUrl,
                email,
              }
            : undefined,
          orderReference: orderReference || `ORD-${Date.now().toString().slice(-6)}`,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Personalization failed");
      }

      setGenerationResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Card generation error");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-blue-600" />
            <span>Create Personalized Card</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Personalize master NFC business card templates with customer name, title, and verified QR code.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Modal / Banner when Generation is Complete */}
        {generationResult && (
          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-3xl p-8 space-y-6 shadow-lg animate-in fade-in">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Card Generated &amp; Verified Lossless</span>
                </div>
                <h2 className="text-2xl font-black text-emerald-950 mt-2">
                  Ready for Professional Card Printing
                </h2>
                <p className="text-sm text-emerald-800">
                  Order Ref: <strong>{generationResult.order.orderReference}</strong> • Master vector artwork preserved without full-page rasterization.
                </p>
              </div>

              <button
                onClick={() => setGenerationResult(null)}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline"
              >
                Create Another Card
              </button>
            </div>

            {/* Quality Report Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/70 p-4 rounded-2xl border border-emerald-200 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Dimensions</span>
                <span className="font-mono font-bold text-slate-900">
                  {selectedTemplate?.frontPageWidth} x {selectedTemplate?.frontPageHeight} pt (Exact)
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Master Immutability</span>
                <span className="font-semibold text-emerald-700">✓ Unchanged</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">QR Validation</span>
                <span className="font-semibold text-emerald-700">✓ Decodable URL</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Vector Typography</span>
                <span className="font-semibold text-emerald-700">✓ Embedded</span>
              </div>
            </div>

            {/* Direct Download Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href={generationResult.downloads.combinedUrl}
                className="flex items-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-sm shadow-md transition"
              >
                <Download className="w-4 h-4" />
                <span>Download Combined PDF (Front &amp; Back Together)</span>
              </a>

              <a
                href={generationResult.downloads.frontUrl}
                className="flex items-center gap-2 px-4 py-3 bg-white hover:bg-slate-50 text-slate-800 rounded-xl font-semibold text-xs border border-emerald-300 shadow-xs transition"
              >
                <span>Front Side Only</span>
              </a>

              <a
                href={generationResult.downloads.backUrl}
                className="flex items-center gap-2 px-4 py-3 bg-white hover:bg-slate-50 text-slate-800 rounded-xl font-semibold text-xs border border-emerald-300 shadow-xs transition"
              >
                <span>Back Side Only</span>
              </a>
            </div>
          </div>
        )}

        <form onSubmit={handlePersonalizeAndExport} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Form Controls */}
          <div className="lg:col-span-7 space-y-6">
            {/* Template Selection */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>1. Select Card Template</span>
              </h2>

              <div>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name} ({tpl.frontPageWidth} x {tpl.frontPageHeight} pt)
                    </option>
                  ))}
                </select>

                {selectedTemplate && (
                  <p className="mt-2 text-xs text-slate-500">
                    Configured for: {selectedTemplate.elements.map((e) => `${e.side}: ${e.type}`).join(" • ")}
                  </p>
                )}
              </div>
            </div>

            {/* Customer Details */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900">2. Customer Information</h2>
                {customers.length > 0 && (
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => handleCustomerSelect(e.target.value)}
                    className="text-xs p-1.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-medium"
                  >
                    <option value="">-- Choose Existing Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.designation})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alexander Wright"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      setSelectedCustomerId("");
                    }}
                    className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Designation / Job Title (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Chief Technology Officer (leave blank if none)"
                    value={designation}
                    onChange={(e) => {
                      setDesignation(e.target.value);
                      setSelectedCustomerId("");
                    }}
                    className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Portfolio / Target URL * (Generates QR Code)
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://alexanderwright.dev"
                    value={portfolioUrl}
                    onChange={(e) => {
                      setPortfolioUrl(e.target.value);
                      setSelectedCustomerId("");
                    }}
                    className="w-full text-sm p-3 font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Email (Optional)
                    </label>
                    <input
                      type="email"
                      placeholder="alex@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Order Reference (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ORD-2026-089"
                      value={orderReference}
                      onChange={(e) => setOrderReference(e.target.value)}
                      className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Order Notes / Printing Instructions
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Supplier: 50 cards, matte PVC, round corners"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleGeneratePreview}
                disabled={generatingPreview || !customerName}
                className="flex items-center gap-2 px-5 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-xl font-bold text-sm shadow-xs transition disabled:opacity-50"
              >
                <Eye className="w-4 h-4 text-blue-600" />
                <span>{generatingPreview ? "Generating Live Preview..." : "Preview Both Sides"}</span>
              </button>

              <button
                type="submit"
                disabled={submitting || !customerName || !portfolioUrl}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-sm shadow-md transition disabled:opacity-50"
              >
                <CreditCard className="w-4 h-4" />
                <span>{submitting ? "Personalizing & Validating..." : "Generate & Export Card"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Column: Live QR Inspector & Live Previews */}
          <div className="lg:col-span-5 space-y-6">
            {/* Live QR Code Verification Box */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-blue-600" />
                  <span>Real-Time QR Verification</span>
                </h3>
                {qrTestStatus === "passed" && (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Decodable
                  </span>
                )}
              </div>

              <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                {liveQrDataUrl ? (
                  <div className="space-y-3 text-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={liveQrDataUrl}
                      alt="Personalized QR Code"
                      className="w-44 h-44 mx-auto rounded-lg shadow-sm border border-slate-200 bg-white p-2"
                    />
                    <div className="text-xs text-slate-600 max-w-xs break-all font-mono">
                      <p className="font-semibold text-slate-900">Encoded Target:</p>
                      <p className="text-[11px] text-blue-600">{portfolioUrl}</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-44 flex items-center justify-center text-xs text-slate-400">
                    Enter a valid portfolio URL to generate QR code
                  </div>
                )}
              </div>
            </div>

            {/* Live Personalized PDF Previews */}
            {(frontPreviewBase64 || backPreviewBase64) && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-600" />
                  <span>Live Render Preview</span>
                </h3>

                <div className="space-y-4">
                  {frontPreviewBase64 && (
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-slate-600">Front Side Preview</span>
                      <iframe
                        src={`data:application/pdf;base64,${frontPreviewBase64}#toolbar=0&navpanes=0`}
                        className="w-full h-44 rounded-lg border border-slate-200 bg-slate-100"
                        title="Front Preview"
                      />
                    </div>
                  )}

                  {backPreviewBase64 && (
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-slate-600">Back Side Preview</span>
                      <iframe
                        src={`data:application/pdf;base64,${backPreviewBase64}#toolbar=0&navpanes=0`}
                        className="w-full h-44 rounded-lg border border-slate-200 bg-slate-100"
                        title="Back Preview"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </AppLayout>
  );
}

export default function CreateCardPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-slate-400 text-sm">
          Loading card personalization studio...
        </div>
      }
    >
      <CreateCardForm />
    </Suspense>
  );
}
