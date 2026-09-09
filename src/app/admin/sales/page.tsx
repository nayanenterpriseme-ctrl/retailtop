"use client";
import React, { useEffect, useState, useMemo } from "react";
import { fetchSales, fetchInventory, Sale, Product } from "@/lib/store";
import { 
  Receipt, 
  Search, 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Eye, 
  Printer, 
  X,
  Banknote,
  QrCode,
  ArrowUpRight,
  Filter,
  CheckCircle2
} from "lucide-react";

export interface DaySummary {
  dateKey: string;
  displayDate: string;
  isToday: boolean;
  orderCount: number;
  totalSales: number;
  cashAmount: number;
  upiAmount: number;
  profit: number;
  margin: number;
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDayFilter, setSelectedDayFilter] = useState<string | null>(null);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [dateFilterMode, setDateFilterMode] = useState<"all" | "today" | "yesterday" | "last7" | "last30" | "thisMonth" | "custom">("all");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");

  useEffect(() => {
    let isMounted = true;
    Promise.all([fetchSales(), fetchInventory()]).then(([salesData, inventoryData]) => {
      if (isMounted) {
        setSales(salesData);
        setProducts(inventoryData);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Helper: Cash amount received for a sale
  const getCashAmount = (sale: Sale): number => {
    const mode = sale.payment?.mode;
    if (mode === "CASH") {
      return sale.totalAmount;
    }
    if (mode === "SPLIT") {
      return Math.max(0, (sale.payment?.cashTendered || 0) - (sale.payment?.changeReturn || 0));
    }
    if (sale.payment?.cashTendered && sale.payment.cashTendered > 0 && mode !== "UPI" && mode !== "CARD") {
      return Math.max(0, sale.payment.cashTendered - (sale.payment.changeReturn || 0));
    }
    return 0;
  };

  // Helper: UPI amount received for a sale
  const getUpiAmount = (sale: Sale): number => {
    const mode = sale.payment?.mode;
    if (mode === "UPI") {
      return sale.payment?.upiAmount || sale.totalAmount;
    }
    if (mode === "SPLIT") {
      return sale.payment?.upiAmount || 0;
    }
    if (sale.payment?.upiAmount && sale.payment.upiAmount > 0) {
      return sale.payment.upiAmount;
    }
    return 0;
  };

  // Helper: Profit earned on a sale
  const getSaleProfit = (sale: Sale): number => {
    const cost = (sale.items || []).reduce((sum, item) => {
      const purRate = item.purchaseRate ?? products.find((p) => p.id === item.id)?.purchaseRate ?? (item.rate * 0.75);
      return sum + (purRate * item.quantity);
    }, 0);
    return Math.round((sale.totalAmount - cost) * 100) / 100;
  };

  // Overall Totals - Updates based on day filter OR date range filter (filtered or all-time)
  const displaySales = useMemo(() => {
    let filtered = sales;

    // First apply date range filter
    if (dateFilterMode !== "all") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const last7Start = new Date(today);
      last7Start.setDate(last7Start.getDate() - 7);
      
      const last30Start = new Date(today);
      last30Start.setDate(last30Start.getDate() - 30);
      
      const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      filtered = sales.filter((s) => {
        const saleDate = new Date(s.timestamp);
        saleDate.setHours(0, 0, 0, 0);
        
        switch (dateFilterMode) {
          case "today":
            return saleDate.getTime() === today.getTime();
          case "yesterday":
            return saleDate.getTime() === yesterday.getTime();
          case "last7":
            return saleDate >= last7Start;
          case "last30":
            return saleDate >= last30Start;
          case "thisMonth":
            return saleDate >= thisMonthStart;
          case "custom":
            if (!customDateFrom && !customDateTo) return true;
            const from = customDateFrom ? new Date(customDateFrom) : new Date(0);
            const to = customDateTo ? new Date(customDateTo) : new Date();
            from.setHours(0, 0, 0, 0);
            to.setHours(23, 59, 59, 999);
            return saleDate >= from && saleDate <= to;
          default:
            return true;
        }
      });
    }

    // Then apply single day filter if active
    if (selectedDayFilter) {
      filtered = filtered.filter((s) => {
        const d = new Date(s.timestamp);
        const key = !isNaN(d.getTime()) ? d.toISOString().split("T")[0] : "Recent";
        return key === selectedDayFilter;
      });
    }
    
    return filtered;
  }, [sales, selectedDayFilter, dateFilterMode, customDateFrom, customDateTo]);

  const allDaysTotalSales = useMemo(() => {
    return displaySales.reduce((acc, s) => acc + s.totalAmount, 0);
  }, [displaySales]);

  const allDaysTotalCash = useMemo(() => {
    return displaySales.reduce((acc, s) => acc + getCashAmount(s), 0);
  }, [displaySales]);

  const allDaysTotalUPI = useMemo(() => {
    return displaySales.reduce((acc, s) => acc + getUpiAmount(s), 0);
  }, [displaySales]);

  const allDaysTotalProfit = useMemo(() => {
    return displaySales.reduce((acc, s) => acc + getSaleProfit(s), 0);
  }, [displaySales, products]);

  const allDaysProfitMargin = allDaysTotalSales > 0 
    ? ((allDaysTotalProfit / allDaysTotalSales) * 100).toFixed(1) 
    : "0.0";

  const totalItemsSold = useMemo(() => {
    return displaySales.reduce((acc, s) => acc + s.items.reduce((sum, it) => sum + it.quantity, 0), 0);
  }, [displaySales]);

  // Day-wise Grouping ("for each day") - respects date range filter
  const daySummaries: DaySummary[] = useMemo(() => {
    const map = new Map<string, {
      salesList: Sale[];
      displayDate: string;
      isToday: boolean;
    }>();

    const todayStr = new Date().toISOString().split("T")[0];
    const yesterdayDate = new Date(Date.now() - 86400000);
    const yesterdayStr = yesterdayDate.toISOString().split("T")[0];

    // Use displaySales instead of sales to respect date range filter
    displaySales.forEach((s) => {
      const d = new Date(s.timestamp);
      const key = !isNaN(d.getTime()) ? d.toISOString().split("T")[0] : "Recent";
      
      let display = key;
      let isToday = false;
      if (key === todayStr) {
        display = "Today (" + d.toLocaleDateString("en-IN", { month: "short", day: "numeric" }) + ")";
        isToday = true;
      } else if (key === yesterdayStr) {
        display = "Yesterday (" + d.toLocaleDateString("en-IN", { month: "short", day: "numeric" }) + ")";
      } else if (!isNaN(d.getTime())) {
        display = d.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
      }

      if (!map.has(key)) {
        map.set(key, { salesList: [], displayDate: display, isToday });
      }
      map.get(key)!.salesList.push(s);
    });

    const list: DaySummary[] = [];
    map.forEach((value, dateKey) => {
      const daySales = value.salesList.reduce((acc, s) => acc + s.totalAmount, 0);
      const dayCash = value.salesList.reduce((acc, s) => acc + getCashAmount(s), 0);
      const dayUpi = value.salesList.reduce((acc, s) => acc + getUpiAmount(s), 0);
      const dayProfit = value.salesList.reduce((acc, s) => acc + getSaleProfit(s), 0);
      const dayMargin = daySales > 0 ? Math.round((dayProfit / daySales) * 1000) / 10 : 0;

      list.push({
        dateKey,
        displayDate: value.displayDate,
        isToday: value.isToday,
        orderCount: value.salesList.length,
        totalSales: Math.round(daySales * 100) / 100,
        cashAmount: Math.round(dayCash * 100) / 100,
        upiAmount: Math.round(dayUpi * 100) / 100,
        profit: Math.round(dayProfit * 100) / 100,
        margin: dayMargin,
      });
    });

    list.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
    return list;
  }, [displaySales, products]);

  // Filtered sales based on search query and optional day filter
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const matchSearch = s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.cashier.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.customer?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.items.some((i) => i.name.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchSearch) return false;

      if (selectedDayFilter) {
        const d = new Date(s.timestamp);
        const key = !isNaN(d.getTime()) ? d.toISOString().split("T")[0] : "Recent";
        return key === selectedDayFilter;
      }

      return true;
    });
  }, [sales, searchQuery, selectedDayFilter]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 select-none font-sans">
      
      {/* 1. TOP SUMMARY CARDS (All Days Total: Sales, Profit, Cash, UPI) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-black text-slate-100 uppercase tracking-tight">Sales & Revenue Intelligence</h1>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {selectedDayFilter 
                ? `Showing metrics for: ${daySummaries.find(d => d.dateKey === selectedDayFilter)?.displayDate || selectedDayFilter}`
                : dateFilterMode === "today" ? "Showing today's performance"
                : dateFilterMode === "yesterday" ? "Showing yesterday's performance"
                : dateFilterMode === "last7" ? "Last 7 days performance"
                : dateFilterMode === "last30" ? "Last 30 days performance"
                : dateFilterMode === "thisMonth" ? "This month's performance"
                : dateFilterMode === "custom" && (customDateFrom || customDateTo) 
                  ? `Custom range: ${customDateFrom || "Start"} to ${customDateTo || "End"}`
                : "Overall business performance & payment breakdown"
              }
            </p>
          </div>
          {selectedDayFilter ? (
            <span className="text-[11px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5">
              <Filter className="w-3 h-3" />
              DAY FILTER ACTIVE
            </span>
          ) : dateFilterMode !== "all" ? (
            <span className="text-[11px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5">
              <Calendar className="w-3 h-3" />
              DATE FILTER ACTIVE
            </span>
          ) : (
            <span className="text-[11px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-2.5 py-1 rounded-full font-bold">
              ALL-TIME TOTALS
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Gross Sales */}
          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center gap-4 shadow-sm backdrop-blur-md">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-mono uppercase font-semibold">
                {selectedDayFilter ? "Day Sales" : "Total Gross Sales"}
              </div>
              <div className="text-2xl font-black text-slate-100 font-mono tracking-tight">
                ₹{allDaysTotalSales.toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                {displaySales.length} orders • {totalItemsSold} units sold
              </div>
            </div>
          </div>

          {/* Card 2: Total Profit */}
          <div className="p-4 bg-slate-900/90 border border-emerald-500/30 rounded-2xl flex items-center gap-4 shadow-lg shadow-emerald-500/5 backdrop-blur-md">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] text-emerald-400 font-mono uppercase font-semibold flex items-center gap-1">
                {selectedDayFilter ? "Day Profit" : "Total Profit"}
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
                ₹{allDaysTotalProfit.toFixed(2)}
              </div>
              <div className="text-[10px] text-emerald-500/80 font-mono mt-0.5">
                {allDaysProfitMargin}% profit margin
              </div>
            </div>
          </div>

          {/* Card 3: Total Cash Amount */}
          <div className="p-4 bg-slate-900/90 border border-amber-500/30 rounded-2xl flex items-center gap-4 shadow-lg shadow-amber-500/5 backdrop-blur-md">
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] text-amber-400 font-mono uppercase font-semibold">
                {selectedDayFilter ? "Day Cash" : "Total Cash"}
              </div>
              <div className="text-2xl font-black text-amber-400 font-mono tracking-tight">
                ₹{allDaysTotalCash.toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                {allDaysTotalSales > 0 ? ((allDaysTotalCash / allDaysTotalSales) * 100).toFixed(0) : 0}% of collections
              </div>
            </div>
          </div>

          {/* Card 4: Total UPI Amount */}
          <div className="p-4 bg-slate-900/90 border border-purple-500/30 rounded-2xl flex items-center gap-4 shadow-lg shadow-purple-500/5 backdrop-blur-md">
            <div className="w-12 h-12 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] text-purple-400 font-mono uppercase font-semibold">
                {selectedDayFilter ? "Day UPI" : "Total UPI"}
              </div>
              <div className="text-2xl font-black text-purple-400 font-mono tracking-tight">
                ₹{allDaysTotalUPI.toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                {allDaysTotalSales > 0 ? ((allDaysTotalUPI / allDaysTotalSales) * 100).toFixed(0) : 0}% digital payments
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DATE RANGE FILTER SECTION */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md">
        <div className="p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                Filter Sales by Date Range
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Select a preset or choose custom date range
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Preset buttons */}
              <button
                onClick={() => { setDateFilterMode("all"); setSelectedDayFilter(null); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
                  dateFilterMode === "all"
                    ? "bg-cyan-500 text-slate-950"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                }`}
              >
                All Time
              </button>
              <button
                onClick={() => { setDateFilterMode("today"); setSelectedDayFilter(null); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
                  dateFilterMode === "today"
                    ? "bg-blue-500 text-white"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                }`}
              >
                Today
              </button>
              <button
                onClick={() => { setDateFilterMode("yesterday"); setSelectedDayFilter(null); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
                  dateFilterMode === "yesterday"
                    ? "bg-blue-500 text-white"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                }`}
              >
                Yesterday
              </button>
              <button
                onClick={() => { setDateFilterMode("last7"); setSelectedDayFilter(null); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
                  dateFilterMode === "last7"
                    ? "bg-blue-500 text-white"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                }`}
              >
                Last 7 Days
              </button>
              <button
                onClick={() => { setDateFilterMode("last30"); setSelectedDayFilter(null); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
                  dateFilterMode === "last30"
                    ? "bg-blue-500 text-white"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                }`}
              >
                Last 30 Days
              </button>
              <button
                onClick={() => { setDateFilterMode("thisMonth"); setSelectedDayFilter(null); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
                  dateFilterMode === "thisMonth"
                    ? "bg-blue-500 text-white"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                }`}
              >
                This Month
              </button>
            </div>
          </div>

          {/* Custom Date Range */}
          <div className="mt-4 pt-4 border-t border-slate-800">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
              <div className="flex-1">
                <label className="text-xs text-slate-400 font-mono mb-1.5 block">From Date</label>
                <input
                  type="date"
                  value={customDateFrom}
                  onChange={(e) => {
                    setCustomDateFrom(e.target.value);
                    setDateFilterMode("custom");
                    setSelectedDayFilter(null);
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-slate-400 font-mono mb-1.5 block">To Date</label>
                <input
                  type="date"
                  value={customDateTo}
                  onChange={(e) => {
                    setCustomDateTo(e.target.value);
                    setDateFilterMode("custom");
                    setSelectedDayFilter(null);
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                onClick={() => {
                  setCustomDateFrom("");
                  setCustomDateTo("");
                  setDateFilterMode("all");
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono transition flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                Clear Custom
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. DAILY REVENUE, CASH, UPI & PROFIT BREAKDOWN TABLE ("for each day") */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/40">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              Day-Wise Sales & Profit Breakdown
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Daily metrics for Cash amount, UPI amount, and Profit for each day
            </p>
          </div>

          {selectedDayFilter && (
            <button
              onClick={() => setSelectedDayFilter(null)}
              className="px-3 py-1 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 border border-cyan-500/30 rounded-lg text-xs font-mono flex items-center gap-1.5 transition"
            >
              <X className="w-3.5 h-3.5" />
              Clear Day Filter (Showing: {selectedDayFilter})
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] text-slate-400 uppercase tracking-wider">
                <th className="p-3.5 font-sans">Date / Day</th>
                <th className="p-3.5 text-center">Orders</th>
                <th className="p-3.5 text-right text-amber-400">Cash Amount</th>
                <th className="p-3.5 text-right text-purple-400">UPI Amount</th>
                <th className="p-3.5 text-right text-slate-200 font-semibold">Total Day Sales</th>
                <th className="p-3.5 text-right text-emerald-400 font-bold">Day Profit</th>
                <th className="p-3.5 text-center">Filter Day</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 font-mono">
                    Computing daily metrics and payment breakdowns...
                  </td>
                </tr>
              ) : daySummaries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No sales recorded yet. Complete a checkout in the POS terminal to see daily metrics.
                  </td>
                </tr>
              ) : (
                daySummaries.map((day) => {
                  const isFiltered = selectedDayFilter === day.dateKey;
                  return (
                    <tr
                      key={day.dateKey}
                      className={`transition-colors ${
                        isFiltered 
                          ? "bg-cyan-500/15 border-l-4 border-l-cyan-400 font-semibold" 
                          : "hover:bg-slate-800/50"
                      }`}
                    >
                      {/* Date */}
                      <td className="p-3.5 font-sans">
                        <div className="font-semibold text-slate-100 flex items-center gap-2">
                          <span>{day.displayDate}</span>
                          {day.isToday && (
                            <span className="text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-bold">
                              TODAY
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5">{day.dateKey}</div>
                      </td>

                      {/* Orders Count */}
                      <td className="p-3.5 text-center font-bold text-slate-300">
                        {day.orderCount}
                      </td>

                      {/* Cash Amount */}
                      <td className="p-3.5 text-right font-bold text-amber-400">
                        ₹{day.cashAmount.toFixed(2)}
                      </td>

                      {/* UPI Amount */}
                      <td className="p-3.5 text-right font-bold text-purple-400">
                        ₹{day.upiAmount.toFixed(2)}
                      </td>

                      {/* Total Day Sales */}
                      <td className="p-3.5 text-right font-black text-slate-100 text-sm">
                        ₹{day.totalSales.toFixed(2)}
                      </td>

                      {/* Day Profit */}
                      <td className="p-3.5 text-right font-black text-emerald-400 text-sm">
                        ₹{day.profit.toFixed(2)}
                        <span className="text-[10px] text-emerald-500/80 font-normal ml-1">
                          ({day.margin}%)
                        </span>
                      </td>

                      {/* Filter Action */}
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedDayFilter(isFiltered ? null : day.dateKey)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition flex items-center justify-center mx-auto gap-1 ${
                            isFiltered
                              ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                              : "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 border border-slate-700"
                          }`}
                        >
                          <Filter className="w-3 h-3" />
                          {isFiltered ? "Active" : "View Day"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Table Footer: All Total Day Summary */}
            {daySummaries.length > 0 && (
              <tfoot className="border-t-2 border-slate-700 bg-slate-950/80 text-xs font-mono font-bold">
                <tr>
                  <td className="p-3.5 uppercase tracking-wider text-slate-200">
                    ALL TOTALS ({daySummaries.length} Days)
                  </td>
                  <td className="p-3.5 text-center text-slate-100">{sales.length}</td>
                  <td className="p-3.5 text-right text-amber-400">₹{allDaysTotalCash.toFixed(2)}</td>
                  <td className="p-3.5 text-right text-purple-400">₹{allDaysTotalUPI.toFixed(2)}</td>
                  <td className="p-3.5 text-right text-slate-100 text-sm">₹{allDaysTotalSales.toFixed(2)}</td>
                  <td className="p-3.5 text-right text-emerald-400 text-sm">
                    ₹{allDaysTotalProfit.toFixed(2)}
                    <span className="text-[10px] text-emerald-500/80 font-normal ml-1">
                      ({allDaysProfitMargin}%)
                    </span>
                  </td>
                  <td className="p-3.5 text-center text-slate-500 font-normal text-[10px]">Grand Total</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* 3. TRANSACTION HISTORY TABLE */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100">Transaction Receipts & Invoices</h2>
              {selectedDayFilter && (
                <span className="text-xs font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Filtered by Day: {selectedDayFilter}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">Individual customer receipts with Cash, UPI, and Profit breakdown</p>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search bill no, customer, item..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono w-56 sm:w-72"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50 text-[11px] text-slate-400 uppercase">
                <th className="p-4">Bill No</th>
                <th className="p-4">Date & Time</th>
                <th className="p-4 font-sans">Customer</th>
                <th className="p-4 font-sans">Purchased Items</th>
                <th className="p-4">Payment Breakdown</th>
                <th className="p-4 text-right">Total Amount</th>
                <th className="p-4 text-right text-emerald-400">Sale Profit</th>
                <th className="p-4 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 font-mono">
                    Loading sales records from database vault...
                  </td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    {selectedDayFilter 
                      ? `No transactions found on ${selectedDayFilter}.`
                      : "No transactions recorded yet. Complete a checkout in the POS Terminal to see it here."}
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => {
                  const itemCount = sale.items?.reduce((s, it) => s + (it.quantity || 0), 0) || 0;
                  const formattedDate = sale.timestamp 
                    ? new Date(sale.timestamp).toLocaleString()
                    : "Recent";
                  
                  const saleCash = getCashAmount(sale);
                  const saleUpi = getUpiAmount(sale);
                  const saleProfit = getSaleProfit(sale);

                  return (
                    <tr key={sale.id} className="hover:bg-slate-800/40 transition">
                      {/* Bill No */}
                      <td className="p-4 font-bold text-cyan-400 text-xs">
                        {sale.id}
                      </td>

                      {/* Date & Time */}
                      <td className="p-4 text-slate-400 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>{formattedDate}</span>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="p-4 font-sans">
                        <div className="font-semibold text-slate-200">{sale.customer?.name || "Walk-In Customer"}</div>
                        {sale.customer?.phone && (
                          <div className="text-[11px] font-mono text-slate-400">{sale.customer.phone}</div>
                        )}
                      </td>

                      {/* Purchased Items */}
                      <td className="p-4 font-sans">
                        <div className="text-xs text-slate-200 truncate max-w-xs">
                          {sale.items?.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {itemCount} total units • Cashier: {sale.cashier?.split("@")[0]}
                        </div>
                      </td>

                      {/* Payment Breakdown (Cash / UPI) */}
                      <td className="p-4">
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-cyan-400 font-semibold inline-block">
                            {sale.payment?.mode || "CASH"}
                          </span>
                          <div className="text-[11px] font-mono space-x-2">
                            {saleCash > 0 && (
                              <span className="text-amber-400 font-bold">Cash: ₹{saleCash.toFixed(2)}</span>
                            )}
                            {saleUpi > 0 && (
                              <span className="text-purple-400 font-bold">UPI: ₹{saleUpi.toFixed(2)}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Total Amount */}
                      <td className="p-4 text-right font-black text-slate-100 text-sm">
                        ₹{sale.totalAmount.toFixed(2)}
                      </td>

                      {/* Sale Profit */}
                      <td className="p-4 text-right font-black text-emerald-400 text-sm">
                        ₹{saleProfit.toFixed(2)}
                      </td>

                      {/* Receipt View Button */}
                      <td className="p-4 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedSale(sale)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 rounded-lg text-xs font-mono inline-flex items-center gap-1 transition"
                          title="View Receipt"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. DETAILED RECEIPT MODAL WITH CASH, UPI & PROFIT */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold font-mono text-slate-200 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-cyan-400" />
                Receipt: {selectedSale.id}
              </h3>
              <button onClick={() => setSelectedSale(null)} className="text-slate-500 hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono space-y-2 mb-4">
              <div className="flex justify-between text-slate-400">
                <span>Date:</span>
                <span>{new Date(selectedSale.timestamp).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Customer:</span>
                <span className="text-slate-200 font-semibold">{selectedSale.customer?.name || "Walk-In"}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Cashier:</span>
                <span className="text-cyan-400">{selectedSale.cashier}</span>
              </div>

              {/* Items Table */}
              <div className="py-2 border-y border-slate-800 space-y-1.5">
                {selectedSale.items?.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-slate-300">
                    <span className="truncate max-w-[150px]">{it.quantity}x {it.name}</span>
                    <span>₹{(it.netAmount || (it.rate * it.quantity)).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Financial Subtotals */}
              <div className="flex justify-between text-xs text-slate-400">
                <span>Subtotal:</span>
                <span>₹{(selectedSale.subtotal || selectedSale.totalAmount).toFixed(2)}</span>
              </div>
              {selectedSale.itemDiscountTotal + selectedSale.billDiscount > 0 && (
                <div className="flex justify-between text-xs text-amber-400">
                  <span>Discount Savings:</span>
                  <span>-₹{(selectedSale.itemDiscountTotal + selectedSale.billDiscount).toFixed(2)}</span>
                </div>
              )}
              {selectedSale.taxTotal > 0 && (
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Tax (GST):</span>
                  <span>₹{selectedSale.taxTotal.toFixed(2)} (incl.)</span>
                </div>
              )}

              {/* Net Payable Grand Total */}
              <div className="flex justify-between text-sm font-black text-slate-100 pt-1 border-t border-slate-800">
                <span>Total Amount:</span>
                <span>₹{selectedSale.totalAmount.toFixed(2)}</span>
              </div>

              {/* Payment Details: Mode, Cash, UPI */}
              <div className="pt-2 border-t border-slate-800/80 space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-400">
                  <span>Payment Mode:</span>
                  <span className="font-bold text-cyan-400">{selectedSale.payment?.mode || "CASH"}</span>
                </div>
                {getCashAmount(selectedSale) > 0 && (
                  <div className="flex justify-between text-amber-400">
                    <span>Cash Received:</span>
                    <span className="font-bold">₹{getCashAmount(selectedSale).toFixed(2)}</span>
                  </div>
                )}
                {getUpiAmount(selectedSale) > 0 && (
                  <div className="flex justify-between text-purple-400">
                    <span>UPI Received:</span>
                    <span className="font-bold">₹{getUpiAmount(selectedSale).toFixed(2)}</span>
                  </div>
                )}
                {(selectedSale.payment?.changeReturn || 0) > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>Change Returned:</span>
                    <span>₹{selectedSale.payment.changeReturn.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Profit Earned on This Receipt */}
              <div className="mt-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex justify-between items-center">
                <span className="text-emerald-400 font-bold uppercase text-[10px]">Receipt Profit</span>
                <span className="text-emerald-400 font-black text-sm">
                  ₹{getSaleProfit(selectedSale).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-mono flex items-center justify-center gap-1.5 transition"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Receipt
              </button>
              <button
                type="button"
                onClick={() => setSelectedSale(null)}
                className="flex-1 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs font-mono transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

