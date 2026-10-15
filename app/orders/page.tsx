"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import {
  ShoppingBag,
  CheckCircle,
  Clock,
  AlertCircle,
  CreditCard,
  Download,
  Filter,
} from "lucide-react";

interface OrderItem {
  id: string;
  orderReference: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED";
  notes: string | null;
  createdAt: string;
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
  generatedCards: Array<{
    id: string;
    frontPdfStorageKey: string;
    backPdfStorageKey: string;
    combinedPdfStorageKey: string | null;
  }>;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  const loadOrders = () => {
    setLoading(true);
    fetch("/api/orders")
      .then((res) => res.json())
      .then((data) => {
        setOrders(data.orders || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load orders:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: newStatus }),
      });
      if (res.ok) {
        loadOrders();
      }
    } catch (err) {
      console.error("Status update error:", err);
    }
  };

  const filtered = orders.filter((o) =>
    filterStatus === "ALL" ? true : o.status === filterStatus
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-blue-600" />
              <span>Card Orders &amp; Fulfillment</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Track print batches, customer personalization orders, and production statuses.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
            <Filter className="w-4 h-4 text-slate-400 ml-2" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs font-semibold p-1.5 bg-transparent border-none text-slate-700 outline-none"
            >
              <option value="ALL">All Statuses ({orders.length})</option>
              <option value="PENDING">Pending</option>
              <option value="PROCESSING">Processing</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm">Loading orders...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              No orders found for the selected filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                    <th className="py-3 px-6">Order Ref</th>
                    <th className="py-3 px-6">Customer</th>
                    <th className="py-3 px-6">Template</th>
                    <th className="py-3 px-6">Date</th>
                    <th className="py-3 px-6">Status</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((order) => {
                    const card = order.generatedCards?.[0];
                    return (
                      <tr key={order.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-4 px-6">
                          <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded">
                            {order.orderReference}
                          </span>
                          {order.notes && (
                            <p className="text-[11px] text-slate-500 mt-1 truncate max-w-xs">{order.notes}</p>
                          )}
                        </td>

                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-900">{order.customer.name}</div>
                          <div className="text-xs text-slate-500">{order.customer.designation}</div>
                        </td>

                        <td className="py-4 px-6 font-medium text-slate-700">
                          {order.template.name}
                        </td>

                        <td className="py-4 px-6 text-xs text-slate-500 font-mono">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </td>

                        <td className="py-4 px-6">
                          <select
                            value={order.status}
                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                            className={`text-xs font-bold py-1 px-2.5 rounded-full border outline-none cursor-pointer ${
                              order.status === "COMPLETED"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : order.status === "PROCESSING"
                                ? "bg-blue-50 text-blue-800 border-blue-200"
                                : order.status === "PENDING"
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            <option value="PENDING">PENDING</option>
                            <option value="PROCESSING">PROCESSING</option>
                            <option value="COMPLETED">COMPLETED</option>
                            <option value="CANCELLED">CANCELLED</option>
                          </select>
                        </td>

                        <td className="py-4 px-6 text-right">
                          {card ? (
                            <a
                              href={`/api/cards/export/${card.id}?type=combined`}
                              title="Download Combined PDF (Front and Back Together)"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download PDF</span>
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400">No PDF</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
