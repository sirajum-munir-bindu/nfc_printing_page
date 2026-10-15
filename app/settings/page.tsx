"use client";

import React, { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import {
  Settings,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Play,
  HardDrive,
  FileCheck2,
  Lock,
  Layers,
  Sparkles,
  Info,
} from "lucide-react";

export default function SettingsPage() {
  const [runningDiagnostics, setRunningDiagnostics] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState<any | null>(null);

  const runDiagnostics = async () => {
    setRunningDiagnostics(true);
    setDiagnosticResults(null);
    try {
      const res = await fetch("/api/diagnostics", { method: "POST" });
      const data = await res.json();
      setDiagnosticResults(data);
    } catch (err) {
      console.error("Diagnostic error:", err);
    } finally {
      setRunningDiagnostics(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-600" />
            <span>Studio Settings &amp; Quality Diagnostics</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            System configuration, private storage safeguards, and automated vector fidelity verification.
          </p>
        </div>

        {/* Quality Diagnostic Test Runner */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>Automated Acceptance &amp; Quality Test Suite</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Executes end-to-end vector overlay, QR decodability, master immutability, and coordinate math checks.
              </p>
            </div>

            <button
              onClick={runDiagnostics}
              disabled={runningDiagnostics}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs transition disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{runningDiagnostics ? "Running Test Suite..." : "Run Quality Verification"}</span>
            </button>
          </div>

          {diagnosticResults && (
            <div
              className={`p-5 rounded-2xl border ${
                diagnosticResults.allPassed
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-amber-50 border-amber-200"
              } space-y-4 animate-in fade-in`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-black uppercase tracking-wider ${
                    diagnosticResults.allPassed ? "text-emerald-800" : "text-amber-800"
                  }`}
                >
                  {diagnosticResults.allPassed
                    ? "✓ All Acceptance Criteria Passed"
                    : "⚠️ Some Diagnostic Checks Failed"}
                </span>
                <span className="text-xs font-mono text-slate-500">
                  Execution Time: {diagnosticResults.totalDurationMs} ms
                </span>
              </div>

              <div className="space-y-2">
                {diagnosticResults.tests?.map((t: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 bg-white rounded-xl border border-slate-200 text-xs flex items-start justify-between gap-3 shadow-2xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        {t.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                        )}
                        <span className="font-bold text-slate-900">{t.name}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 pl-6">{t.message}</p>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">{t.durationMs}ms</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Storage Configuration */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-blue-600" />
            <span>Private Storage Architecture</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Master PDFs Directory</span>
              <p className="font-mono font-bold text-slate-900">storage/master_pdfs/</p>
              <p className="text-slate-500 text-[11px]">
                Read-only copy semantic. Master files are never overwritten.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Generated Output Directory</span>
              <p className="font-mono font-bold text-slate-900">storage/generated_pdfs/</p>
              <p className="text-slate-500 text-[11px]">
                Randomized UUID storage keys with private authorized streaming.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Upload Limit</span>
              <p className="font-mono font-bold text-slate-900">25 MB per PDF</p>
              <p className="text-slate-500 text-[11px]">
                Enforced on server with magic byte signature verification (%PDF-).
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Path Traversal Security</span>
              <p className="font-mono font-bold text-slate-900">Active Strict Filter</p>
              <p className="text-slate-500 text-[11px]">
                Enforces root boundary containment and strips directory sequences.
              </p>
            </div>
          </div>
        </div>

        {/* Quality Guidelines & Fallback Documentation */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600" />
            <span>Printing Standards &amp; Unsupported PDF Fallbacks</span>
          </h2>

          <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
            <p>
              <strong>1. Blank Area Expectation:</strong> Suppliers supply cards with blank zones intended for name, designation, and QR code placement. NFC Card Studio never assumes automated blanking with guessed white rectangles to avoid damaging artwork.
            </p>
            <p>
              <strong>2. Vector Preservation:</strong> `pdf-lib` is instructed with `updateMetadata: false` and direct page-copy semantics to prevent image resampling or rasterization.
            </p>
            <p>
              <strong>3. High-Density QR Codes:</strong> QR codes are created as minimum 1024x1024 PNG matrices embedded at configured physical sizes, guaranteeing 300+ DPI sharpness on printed NFC cards.
            </p>
            <p>
              <strong>4. Unsupported PDF Fallback:</strong> If an uploaded PDF is password-encrypted or has corrupt cross-reference streams, it is rejected at upload with a clear diagnostic error, preventing silent degradation.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
