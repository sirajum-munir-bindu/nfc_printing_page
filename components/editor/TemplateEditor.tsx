"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Save,
  RotateCcw,
  RotateCw,
  Eye,
  Sliders,
  Type,
  QrCode,
  Check,
  AlertTriangle,
  Move,
  Maximize2,
  ZoomIn,
  ZoomOut,
  HelpCircle,
} from "lucide-react";
import { pointsToMm, mmToPoints } from "@/lib/pdf/coordinate";

export interface EditorElement {
  id?: string;
  type: "NAME" | "DESIGNATION" | "QR_CODE";
  side: "FRONT" | "BACK";
  x: number; // PDF points from top-left
  y: number; // PDF points from top-left
  width: number; // PDF points
  height: number; // PDF points
  fontFamily: string;
  fontSize: number;
  color: string;
  alignment: "left" | "center" | "right";
  enabled: boolean;
}

interface TemplateEditorProps {
  templateId: string;
  templateName: string;
  frontPdfKey: string;
  backPdfKey: string;
  frontPageIndex: number;
  backPageIndex: number;
  pageWidth: number;
  pageHeight: number;
  initialElements: EditorElement[];
  onSaveSuccess?: () => void;
}

export default function TemplateEditor({
  templateId,
  templateName,
  frontPdfKey,
  backPdfKey,
  frontPageIndex,
  backPageIndex,
  pageWidth,
  pageHeight,
  initialElements,
  onSaveSuccess,
}: TemplateEditorProps) {
  const [currentSide, setCurrentSide] = useState<"FRONT" | "BACK">("FRONT");
  const [elements, setElements] = useState<EditorElement[]>(() => {
    // If elements are missing any default items, ensure NAME, DESIGNATION, and QR_CODE exist
    const hasName = initialElements.some((e) => e.type === "NAME");
    const hasDesig = initialElements.some((e) => e.type === "DESIGNATION");
    const hasQr = initialElements.some((e) => e.type === "QR_CODE");

    const list = [...initialElements];
    if (!hasName) {
      list.push({
        type: "NAME",
        side: "FRONT",
        x: 20,
        y: 40,
        width: 150,
        height: 22,
        fontFamily: "Helvetica-Bold",
        fontSize: 14,
        color: "#0f172a",
        alignment: "left",
        enabled: true,
      });
    }
    if (!hasDesig) {
      list.push({
        type: "DESIGNATION",
        side: "FRONT",
        x: 20,
        y: 66,
        width: 150,
        height: 16,
        fontFamily: "Helvetica",
        fontSize: 10,
        color: "#2563eb",
        alignment: "left",
        enabled: true,
      });
    }
    if (!hasQr) {
      list.push({
        type: "QR_CODE",
        side: "BACK",
        x: 160,
        y: 35,
        width: 70,
        height: 70,
        fontFamily: "Helvetica",
        fontSize: 12,
        color: "#000000",
        alignment: "center",
        enabled: true,
      });
    }
    return list;
  });

  // History for Undo / Redo
  const [history, setHistory] = useState<EditorElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Selected element for inspector
  const [selectedType, setSelectedType] = useState<"NAME" | "DESIGNATION" | "QR_CODE">("NAME");

  // Visual settings
  const [zoom, setZoom] = useState<number>(2.5); // 2.5x scale so 252x144 pt renders sharply at ~630x360 px
  const [showGuides, setShowGuides] = useState<boolean>(true);
  const [bleedPt, setBleedPt] = useState<number>(9); // 0.125 inch = 9 pt
  const [safeMarginPt, setSafeMarginPt] = useState<number>(9);

  // PDF.js background rendering state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pdfRendered, setPdfRendered] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Dragging & Resizing state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState<{ mouseX: number; mouseY: number; width: number; height: number }>({
    mouseX: 0,
    mouseY: 0,
    width: 0,
    height: 0,
  });

  const recordHistory = useCallback((newElements: EditorElement[]) => {
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIndex + 1);
      return [...sliced, JSON.parse(JSON.stringify(newElements))];
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  // Initial history push
  useEffect(() => {
    if (history.length === 0) {
      setHistory([JSON.parse(JSON.stringify(elements))]);
      setHistoryIndex(0);
    }
  }, [elements, history.length]);

  const undo = () => {
    if (historyIndex > 0) {
      const nextIdx = historyIndex - 1;
      setHistoryIndex(nextIdx);
      setElements(JSON.parse(JSON.stringify(history[nextIdx])));
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      setElements(JSON.parse(JSON.stringify(history[nextIdx])));
    }
  };

  // Render PDF background using PDF.js onto canvas
  useEffect(() => {
    let cancelled = false;

    async function renderPdfBackground() {
      const targetKey = currentSide === "FRONT" ? frontPdfKey : backPdfKey;
      const targetPageIndex = currentSide === "FRONT" ? frontPageIndex : backPageIndex;

      try {
        // Dynamically import pdfjs-dist in the browser
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const url = `/api/files/${targetKey}`;
        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;

        if (cancelled) return;

        const page = await pdf.getPage(targetPageIndex + 1);
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Viewport scale factor
        const dpr = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: zoom * dpr });

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width / dpr}px`;
        canvas.style.height = `${viewport.height / dpr}px`;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
        if (!cancelled) setPdfRendered(true);
      } catch (err) {
        console.warn("Could not render background with PDF.js; falling back to canvas mockup grid:", err);
        setPdfRendered(false);
      }
    }

    renderPdfBackground();

    return () => {
      cancelled = true;
    };
  }, [currentSide, frontPdfKey, backPdfKey, frontPageIndex, backPageIndex, zoom]);

  // Selected element helper
  const selectedElement = elements.find((e) => e.type === selectedType) || elements[0];

  const updateSelectedElement = (partial: Partial<EditorElement>) => {
    const updated = elements.map((el) => {
      if (el.type === selectedType) {
        return { ...el, ...partial };
      }
      return el;
    });
    setElements(updated);
    recordHistory(updated);
  };

  // Mouse handlers for dragging on editor canvas
  const handleElementMouseDown = (e: React.MouseEvent, type: "NAME" | "DESIGNATION" | "QR_CODE") => {
    e.stopPropagation();
    setSelectedType(type);
    setIsDragging(true);

    const el = elements.find((item) => item.type === type);
    if (!el) return;

    setDragOffset({
      x: e.clientX - el.x * zoom,
      y: e.clientY - el.y * zoom,
    });
  };

  const handleResizeMouseDown = (e: React.MouseEvent, type: "NAME" | "DESIGNATION" | "QR_CODE") => {
    e.stopPropagation();
    setSelectedType(type);
    setIsResizing(true);

    const el = elements.find((item) => item.type === type);
    if (!el) return;

    setResizeStart({
      mouseX: e.clientX,
      mouseY: e.clientY,
      width: el.width,
      height: el.height,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && selectedElement) {
      const newX = Math.max(0, Math.min(pageWidth - selectedElement.width, (e.clientX - dragOffset.x) / zoom));
      const newY = Math.max(0, Math.min(pageHeight - selectedElement.height, (e.clientY - dragOffset.y) / zoom));

      setElements((prev) =>
        prev.map((el) =>
          el.type === selectedType
            ? { ...el, x: Math.round(newX * 10) / 10, y: Math.round(newY * 10) / 10 }
            : el
        )
      );
    } else if (isResizing && selectedElement) {
      const deltaX = (e.clientX - resizeStart.mouseX) / zoom;
      const deltaY = (e.clientY - resizeStart.mouseY) / zoom;

      const newWidth = Math.max(20, Math.min(pageWidth - selectedElement.x, resizeStart.width + deltaX));
      const newHeight = Math.max(10, Math.min(pageHeight - selectedElement.y, resizeStart.height + deltaY));

      setElements((prev) =>
        prev.map((el) =>
          el.type === selectedType
            ? {
                ...el,
                width: Math.round(newWidth * 10) / 10,
                height: Math.round(newHeight * 10) / 10,
              }
            : el
        )
      );
    }
  };

  const handleMouseUp = () => {
    if (isDragging || isResizing) {
      setIsDragging(false);
      setIsResizing(false);
      recordHistory(elements);
    }
  };

  // Save changes to database
  const handleSave = async () => {
    setSaving(true);
    setSaveStatus(null);

    try {
      const res = await fetch(`/api/templates/${templateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          elements,
          configuration: {
            bleedPt,
            safeMarginPt,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Save failed");
      }

      setSaveStatus("All positions & typography saved successfully!");
      if (onSaveSuccess) onSaveSuccess();
    } catch (err: unknown) {
      setSaveStatus(`Error saving: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  // Filter elements for current visible side
  const visibleElements = elements.filter((el) => el.side === currentSide && el.enabled);

  return (
    <div
      className="space-y-6 select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Top Bar: Side switcher, Undo/Redo, Zoom, Save */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        {/* Front / Back Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setCurrentSide("FRONT")}
            className={`px-4 py-2 rounded-md font-semibold text-xs tracking-wide transition ${
              currentSide === "FRONT"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            FRONT SIDE
          </button>
          <button
            onClick={() => setCurrentSide("BACK")}
            className={`px-4 py-2 rounded-md font-semibold text-xs tracking-wide transition ${
              currentSide === "BACK"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            BACK SIDE
          </button>
        </div>

        {/* Toolbar: Undo/Redo, Zoom, Guides */}
        <div className="flex items-center gap-2">
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            title="Undo (Ctrl+Z)"
            className="p-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            title="Redo (Ctrl+Y)"
            className="p-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <div className="h-6 w-px bg-slate-200 mx-1" />

          <button
            onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
            title="Zoom Out"
            className="p-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-medium text-slate-600 px-1">
            {Math.round((zoom / 2.5) * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(5, z + 0.5))}
            title="Zoom In"
            className="p-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="h-6 w-px bg-slate-200 mx-1" />

          <button
            onClick={() => setShowGuides(!showGuides)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
              showGuides
                ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Guides {showGuides ? "ON" : "OFF"}
          </button>
        </div>

        {/* Save button */}
        <div className="flex items-center gap-3">
          {saveStatus && (
            <span
              className={`text-xs font-medium ${
                saveStatus.includes("Error") ? "text-red-600" : "text-green-600"
              }`}
            >
              {saveStatus}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Saving..." : "Save Template"}</span>
          </button>
        </div>
      </div>

      {/* Main Workspace: Canvas on the Left, Property Inspector on the Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Canvas Display Viewport */}
        <div className="lg:col-span-8 bg-slate-200/80 p-8 rounded-2xl border border-slate-300 flex flex-col items-center justify-center min-h-[480px] overflow-auto shadow-inner relative">
          <div
            className="relative bg-white shadow-2xl rounded-sm transition-all"
            style={{
              width: `${pageWidth * zoom}px`,
              height: `${pageHeight * zoom}px`,
            }}
          >
            {/* Background PDF.js Canvas */}
            <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

            {/* Fallback pattern if PDF.js is still rendering */}
            {!pdfRendered && (
              <div className="absolute inset-0 bg-slate-100 flex items-center justify-center border border-dashed border-slate-300">
                <span className="text-xs text-slate-400 font-mono">
                  Original Master PDF ({pageWidth} x {pageHeight} pt)
                </span>
              </div>
            )}

            {/* Bleed and Safe Margin Guides */}
            {showGuides && (
              <>
                {/* Safe margin boundary */}
                <div
                  className="absolute pointer-events-none border border-dashed border-emerald-500/70"
                  style={{
                    left: `${safeMarginPt * zoom}px`,
                    top: `${safeMarginPt * zoom}px`,
                    right: `${safeMarginPt * zoom}px`,
                    bottom: `${safeMarginPt * zoom}px`,
                  }}
                >
                  <span className="absolute top-1 left-1 text-[9px] font-mono text-emerald-600/80 uppercase font-semibold">
                    Safe Margin ({pointsToMm(safeMarginPt)} mm)
                  </span>
                </div>

                {/* Bleed line */}
                {bleedPt > 0 && (
                  <div
                    className="absolute pointer-events-none border border-dashed border-rose-500/60"
                    style={{
                      left: `-${bleedPt * zoom * 0.2}px`,
                      top: `-${bleedPt * zoom * 0.2}px`,
                      right: `-${bleedPt * zoom * 0.2}px`,
                      bottom: `-${bleedPt * zoom * 0.2}px`,
                    }}
                  />
                )}
              </>
            )}

            {/* Overlay Interactive Elements */}
            {visibleElements.map((el) => {
              const isSelected = el.type === selectedType;
              const leftPx = el.x * zoom;
              const topPx = el.y * zoom;
              const widthPx = el.width * zoom;
              const heightPx = el.height * zoom;

              return (
                <div
                  key={el.type}
                  onMouseDown={(e) => handleElementMouseDown(e, el.type)}
                  className={`absolute group cursor-move transition-shadow rounded-sm ${
                    isSelected
                      ? "ring-2 ring-blue-600 bg-blue-50/20 shadow-md"
                      : "border border-blue-400/80 bg-white/40 hover:border-blue-600"
                  }`}
                  style={{
                    left: `${leftPx}px`,
                    top: `${topPx}px`,
                    width: `${widthPx}px`,
                    height: `${heightPx}px`,
                  }}
                >
                  {/* Element Content Mockup */}
                  <div className="w-full h-full p-1 flex items-center overflow-hidden pointer-events-none">
                    {el.type === "NAME" && (
                      <span
                        style={{
                          fontFamily: el.fontFamily,
                          fontSize: `${el.fontSize * (zoom / 2.5)}px`,
                          color: el.color,
                          textAlign: el.alignment,
                          width: "100%",
                          fontWeight: el.fontFamily.includes("Bold") ? "bold" : "normal",
                        }}
                        className="truncate"
                      >
                        Alexander Wright
                      </span>
                    )}
                    {el.type === "DESIGNATION" && (
                      <span
                        style={{
                          fontFamily: el.fontFamily,
                          fontSize: `${el.fontSize * (zoom / 2.5)}px`,
                          color: el.color,
                          textAlign: el.alignment,
                          width: "100%",
                          fontWeight: el.fontFamily.includes("Bold") ? "bold" : "normal",
                        }}
                        className="truncate"
                      >
                        Chief Technology Officer
                      </span>
                    )}
                    {el.type === "QR_CODE" && (
                      <div className="w-full h-full flex items-center justify-center bg-white border border-slate-300 rounded shadow-xs">
                        <QrCode className="w-4/5 h-4/5 text-slate-900" />
                      </div>
                    )}
                  </div>

                  {/* Element label pill */}
                  <div
                    className={`absolute -top-5 left-0 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider flex items-center gap-1 ${
                      isSelected
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-800 text-slate-200 opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    <span>{el.type.replace("_", " ")}</span>
                    <span className="text-[9px] opacity-75">
                      ({el.x.toFixed(0)},{el.y.toFixed(0)})
                    </span>
                  </div>

                  {/* Corner Resize Handle */}
                  {isSelected && (
                    <div
                      onMouseDown={(e) => handleResizeMouseDown(e, el.type)}
                      className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-blue-600 border-2 border-white rounded-full cursor-se-resize shadow-md"
                      title="Drag to resize"
                    />
                  )}
                </div>
              );
            })}
          </div>

          <p className="mt-4 text-xs text-slate-500 font-mono text-center">
            {currentSide} Side • Card Dimensions: {pageWidth} x {pageHeight} pt (
            {pointsToMm(pageWidth)} x {pointsToMm(pageHeight)} mm)
          </p>
        </div>

        {/* Right Panel: Property Inspector */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600" />
              <span>Element Inspector</span>
            </h3>

            {/* Element Selector Tabs */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
              {(["NAME", "DESIGNATION", "QR_CODE"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold tracking-wide uppercase transition ${
                    selectedType === type
                      ? "bg-white text-blue-600 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {type === "QR_CODE" ? "QR" : type.slice(0, 4)}
                </button>
              ))}
            </div>
          </div>

          {selectedElement && (
            <div className="space-y-5">
              {/* Placement Side & Active Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Card Side
                  </label>
                  <select
                    value={selectedElement.side}
                    onChange={(e) =>
                      updateSelectedElement({ side: e.target.value as "FRONT" | "BACK" })
                    }
                    className="w-full text-xs font-medium border border-slate-200 rounded-lg p-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="FRONT">FRONT SIDE</option>
                    <option value="BACK">BACK SIDE</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Element Status
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      updateSelectedElement({ enabled: !selectedElement.enabled })
                    }
                    className={`w-full text-xs font-semibold py-2 px-3 rounded-lg border transition ${
                      selectedElement.enabled
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : "bg-slate-100 border-slate-200 text-slate-500"
                    }`}
                  >
                    {selectedElement.enabled ? "✓ Enabled" : "✕ Disabled"}
                  </button>
                </div>
              </div>

              {/* Exact Coordinate Inputs */}
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2">
                  Position & Size (PDF Points)
                </label>
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div>
                    <label className="text-[11px] font-medium text-slate-500 flex justify-between">
                      <span>X (Left)</span>
                      <span className="font-mono text-slate-400">{pointsToMm(selectedElement.x)} mm</span>
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={selectedElement.x}
                      onChange={(e) =>
                        updateSelectedElement({ x: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full mt-1 font-mono text-xs p-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-500 flex justify-between">
                      <span>Y (Top)</span>
                      <span className="font-mono text-slate-400">{pointsToMm(selectedElement.y)} mm</span>
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={selectedElement.y}
                      onChange={(e) =>
                        updateSelectedElement({ y: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full mt-1 font-mono text-xs p-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-500 flex justify-between">
                      <span>Width</span>
                      <span className="font-mono text-slate-400">{pointsToMm(selectedElement.width)} mm</span>
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={selectedElement.width}
                      onChange={(e) =>
                        updateSelectedElement({ width: parseFloat(e.target.value) || 10 })
                      }
                      className="w-full mt-1 font-mono text-xs p-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-500 flex justify-between">
                      <span>Height</span>
                      <span className="font-mono text-slate-400">{pointsToMm(selectedElement.height)} mm</span>
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={selectedElement.height}
                      onChange={(e) =>
                        updateSelectedElement({ height: parseFloat(e.target.value) || 10 })
                      }
                      className="w-full mt-1 font-mono text-xs p-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Typography controls (for Name & Designation) */}
              {selectedElement.type !== "QR_CODE" && (
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    Typography & Appearance
                  </label>

                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">
                      Font Family
                    </label>
                    <select
                      value={selectedElement.fontFamily}
                      onChange={(e) => updateSelectedElement({ fontFamily: e.target.value })}
                      className="w-full text-xs font-medium border border-slate-200 rounded-lg p-2 bg-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Helvetica">Helvetica (Standard Sans)</option>
                      <option value="Helvetica-Bold">Helvetica Bold</option>
                      <option value="Times-Roman">Times New Roman (Serif)</option>
                      <option value="Courier">Courier (Monospace)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-slate-600 block mb-1">
                        Font Size (pt)
                      </label>
                      <input
                        type="number"
                        min="6"
                        max="72"
                        value={selectedElement.fontSize}
                        onChange={(e) =>
                          updateSelectedElement({ fontSize: parseInt(e.target.value, 10) || 12 })
                        }
                        className="w-full font-mono text-xs p-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-slate-600 block mb-1">
                        Text Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selectedElement.color || "#000000"}
                          onChange={(e) => updateSelectedElement({ color: e.target.value })}
                          className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0.5"
                        />
                        <input
                          type="text"
                          value={selectedElement.color || "#000000"}
                          onChange={(e) => updateSelectedElement({ color: e.target.value })}
                          className="w-full font-mono text-xs p-2 uppercase bg-white border border-slate-200 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">
                      Text Alignment
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["left", "center", "right"] as const).map((align) => (
                        <button
                          key={align}
                          type="button"
                          onClick={() => updateSelectedElement({ alignment: align })}
                          className={`py-1.5 text-xs font-semibold capitalize rounded-lg border transition ${
                            selectedElement.alignment === align
                              ? "bg-blue-50 border-blue-300 text-blue-700"
                              : "border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {align}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* QR Code Guidelines */}
              {selectedElement.type === "QR_CODE" && (
                <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-100 text-xs text-blue-900 space-y-2">
                  <p className="font-semibold flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-blue-600" />
                    <span>Print Quality Recommendation</span>
                  </p>
                  <p className="text-blue-800 text-[11px] leading-relaxed">
                    A minimum size of <strong>54 pt (19 mm)</strong> ensures 100% scan reliability across all mobile devices when printed on PVC or metallic NFC business cards.
                  </p>
                  {selectedElement.width < 54 && (
                    <p className="text-amber-800 font-medium text-[11px] flex items-center gap-1 mt-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      Current size ({pointsToMm(selectedElement.width)} mm) is below 19mm.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
