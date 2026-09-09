"use client";
import React, { useEffect, useState, useMemo } from "react";
import { fetchInventory, updateProduct, Product } from "@/lib/store";
import { 
  Calendar, 
  CalendarDays, 
  Search, 
  Filter, 
  AlertTriangle, 
  Clock, 
  X, 
  Edit3, 
  Save, 
  RefreshCw,
  AlertCircle
} from "lucide-react";

type DatePreset = "all" | "today" | "this_month" | "next_month" | "expired" | "custom_date" | "custom_range";
type FilterDimension = "expiry" | "created";

export default function ProductDateFilterPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Date Filtering Controls
  const [filterDimension, setFilterDimension] = useState<FilterDimension>("expiry");
  const [datePreset, setDatePreset] = useState<DatePreset>("this_month");
  const [customDate, setCustomDate] = useState<string>("");
  const [customRangeStart, setCustomRangeStart] = useState<string>("");
  const [customRangeEnd, setCustomRangeEnd] = useState<string>("");

  // Edit Expiry / Product Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editFormData, setEditFormData] = useState({
    expiryDate: "",
    batchNo: "",
    stock: "",
    price: "",
    purchaseRate: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const data = await fetchInventory();
    setProducts(data);
    setLoading(false);
  };

  useEffect(() => {
    let isMounted = true;
    fetchInventory().then((data) => {
      if (isMounted) {
        setProducts(data);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // System Date Anchors
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed
  const todayStr = now.toISOString().split("T")[0];

  // Helper for Year-Month strings
  const thisMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
  const nextMonthDate = new Date(currentYear, currentMonth + 1, 1);
  const nextMonthStr = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, "0")}`;

  const thisMonthName = now.toLocaleString("default", { month: "long" });
  const nextMonthName = nextMonthDate.toLocaleString("default", { month: "long" });

  // Get Target Date string for a product
  const getProductDate = (p: Product): string => {
    if (filterDimension === "expiry") {
      return p.expiryDate || "";
    } else {
      return p.createdAt ? new Date(p.createdAt).toISOString().split("T")[0] : "";
    }
  };

  // Top Metric Counts (Expiry based)
  const expiringTodayCount = useMemo(() => {
    return products.filter((p) => p.expiryDate === todayStr).length;
  }, [products, todayStr]);

  const expiringThisMonthCount = useMemo(() => {
    return products.filter((p) => p.expiryDate && p.expiryDate.startsWith(thisMonthStr)).length;
  }, [products, thisMonthStr]);

  const expiringNextMonthCount = useMemo(() => {
    return products.filter((p) => p.expiryDate && p.expiryDate.startsWith(nextMonthStr)).length;
  }, [products, nextMonthStr]);

  const expiredCount = useMemo(() => {
    return products.filter((p) => p.expiryDate && p.expiryDate < todayStr).length;
  }, [products, todayStr]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    return ["All", ...Array.from(set)];
  }, [products]);

  // Main Filtered Products List
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // 1. Text Search
      const q = searchQuery.toLowerCase();
      const matchSearch = !q || 
        p.name.toLowerCase().includes(q) || 
        p.barcode?.toLowerCase().includes(q) ||
        (p.batchNo && p.batchNo.toLowerCase().includes(q));

      if (!matchSearch) return false;

      // 2. Category Filter
      if (selectedCategory !== "All" && p.category !== selectedCategory) {
        return false;
      }

      // 3. Date Preset & Custom Date Filter
      const pDate = getProductDate(p);

      if (datePreset === "all") {
        return true;
      }

      if (!pDate) {
        // Product has no date set
        return false;
      }

      if (datePreset === "today") {
        return pDate === todayStr;
      }

      if (datePreset === "this_month") {
        return pDate.startsWith(thisMonthStr);
      }

      if (datePreset === "next_month") {
        return pDate.startsWith(nextMonthStr);
      }

      if (datePreset === "expired") {
        return pDate < todayStr;
      }

      if (datePreset === "custom_date") {
        if (!customDate) return true;
        return pDate === customDate;
      }

      if (datePreset === "custom_range") {
        if (customRangeStart && pDate < customRangeStart) return false;
        if (customRangeEnd && pDate > customRangeEnd) return false;
        return true;
      }

      return true;
    });
  }, [
    products, 
    searchQuery, 
    selectedCategory, 
    datePreset, 
    filterDimension, 
    customDate, 
    customRangeStart, 
    customRangeEnd, 
    todayStr, 
    thisMonthStr, 
    nextMonthStr
  ]);

  // Financial totals of currently filtered products
  const filteredStockTotal = filteredProducts.reduce((sum, p) => sum + (p.stock || 0), 0);
  const filteredValuation = filteredProducts.reduce((sum, p) => sum + (p.price * (p.stock || 0)), 0);
  const filteredProfitPotential = filteredProducts.reduce((sum, p) => {
    const cost = p.purchaseRate ?? 0;
    return sum + ((p.price - cost) * (p.stock || 0));
  }, 0);

  // Expiry Status Badge Helper
  const getExpiryStatusBadge = (expiryDate?: string) => {
    if (!expiryDate) {
      return (
        <span className="text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full">
          No Expiry Date
        </span>
      );
    }

    if (expiryDate < todayStr) {
      return (
        <span className="text-[10px] font-mono bg-red-500/15 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          EXPIRED
        </span>
      );
    }

    if (expiryDate === todayStr) {
      return (
        <span className="text-[10px] font-mono bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold animate-pulse flex items-center gap-1">
          <Clock className="w-3 h-3" />
          EXPIRING TODAY
        </span>
      );
    }

    if (expiryDate.startsWith(thisMonthStr)) {
      return (
        <span className="text-[10px] font-mono bg-orange-500/15 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-full font-semibold">
          This Month ({expiryDate})
        </span>
      );
    }

    if (expiryDate.startsWith(nextMonthStr)) {
      return (
        <span className="text-[10px] font-mono bg-blue-500/15 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-semibold">
          Next Month ({expiryDate})
        </span>
      );
    }

    return (
      <span className="text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
        Fresh ({expiryDate})
      </span>
    );
  };

  // Open Edit Modal
  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setEditFormData({
      expiryDate: product.expiryDate || "",
      batchNo: product.batchNo || "",
      stock: product.stock.toString(),
      price: product.price.toString(),
      purchaseRate: product.purchaseRate !== undefined ? product.purchaseRate.toString() : "",
    });
  };

  // Save Modal Form
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    setIsSaving(true);
    try {
      const updates: Partial<Product> = {
        expiryDate: editFormData.expiryDate || undefined,
        batchNo: editFormData.batchNo.trim() || undefined,
        stock: parseInt(editFormData.stock) || 0,
        price: parseFloat(editFormData.price) || editingProduct.price,
        purchaseRate: editFormData.purchaseRate ? parseFloat(editFormData.purchaseRate) : undefined,
      };

      await updateProduct(editingProduct.id, updates);
      await loadData();
      setEditingProduct(null);
    } catch {
      alert("Failed to update product date.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 select-none font-sans text-slate-100">
      
      {/* 1. TOP HEADER & KPI METRICS */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-slate-100 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-cyan-400" />
              Product Date & Expiry Lifecycle Filter
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              Filter products by Today, This Month, Next Month, and custom dates
            </p>
          </div>

          {/* Dimension Selector */}
          <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-mono">
            <span className="text-slate-500 text-[11px] px-2 font-medium">FILTER BY:</span>
            <button
              type="button"
              onClick={() => setFilterDimension("expiry")}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                filterDimension === "expiry"
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Expiry Date
            </button>
            <button
              type="button"
              onClick={() => setFilterDimension("created")}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                filterDimension === "created"
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Date Added / Inward
            </button>
          </div>
        </div>

        {/* 4 KPI Banner Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          {/* Card 1: Expiring Today */}
          <div 
            onClick={() => setDatePreset("today")}
            className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 backdrop-blur-md shadow-sm ${
              datePreset === "today" 
                ? "bg-amber-500/15 border-amber-500 shadow-amber-500/10 scale-[1.02]" 
                : "bg-slate-900/90 border-slate-800 hover:border-amber-500/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase text-amber-400 font-bold">Expiring Today</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-amber-400 mt-2">
              {expiringTodayCount}
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
              Target Date: {todayStr}
            </div>
          </div>

          {/* Card 2: Expiring This Month */}
          <div 
            onClick={() => setDatePreset("this_month")}
            className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 backdrop-blur-md shadow-sm ${
              datePreset === "this_month" 
                ? "bg-cyan-500/15 border-cyan-500 shadow-cyan-500/10 scale-[1.02]" 
                : "bg-slate-900/90 border-slate-800 hover:border-cyan-500/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase text-cyan-400 font-bold">This Month ({thisMonthName})</span>
              <Calendar className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-cyan-400 mt-2">
              {expiringThisMonthCount}
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
              Period: {thisMonthStr}-01 to 30
            </div>
          </div>

          {/* Card 3: Expiring Next Month */}
          <div 
            onClick={() => setDatePreset("next_month")}
            className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 backdrop-blur-md shadow-sm ${
              datePreset === "next_month" 
                ? "bg-blue-500/15 border-blue-500 shadow-blue-500/10 scale-[1.02]" 
                : "bg-slate-900/90 border-slate-800 hover:border-blue-500/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase text-blue-400 font-bold">Next Month ({nextMonthName})</span>
              <CalendarDays className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-blue-400 mt-2">
              {expiringNextMonthCount}
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
              Period: {nextMonthStr}-01 to 31
            </div>
          </div>

          {/* Card 4: Already Expired */}
          <div 
            onClick={() => setDatePreset("expired")}
            className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 backdrop-blur-md shadow-sm ${
              datePreset === "expired" 
                ? "bg-red-500/15 border-red-500 shadow-red-500/10 scale-[1.02]" 
                : "bg-slate-900/90 border-slate-800 hover:border-red-500/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase text-red-400 font-bold">Already Expired</span>
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-red-400 mt-2">
              {expiredCount}
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
              Past Due (Immediate Action)
            </div>
          </div>
        </div>
      </div>

      {/* 2. FILTER CONTROLS & DATE SELECTOR BAR */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4 backdrop-blur-md">
        
        {/* Quick Date Presets Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono text-slate-400 flex items-center gap-1 font-semibold mr-1">
              <Filter className="w-3.5 h-3.5 text-cyan-400" />
              DATE PRESETS:
            </span>

            {[
              { id: "all" as const, label: "All Products" },
              { id: "today" as const, label: "Today" },
              { id: "this_month" as const, label: `This Month (${thisMonthName})` },
              { id: "next_month" as const, label: `Next Month (${nextMonthName})` },
              { id: "expired" as const, label: "Expired" },
            ].map((preset) => {
              const isSelected = datePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setDatePreset(preset.id);
                    setCustomDate("");
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition ${
                    isSelected
                      ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                      : "bg-slate-950 text-slate-300 border border-slate-800 hover:bg-slate-800"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={loadData}
            className="text-xs font-mono text-slate-400 hover:text-cyan-400 flex items-center gap-1.5 transition"
            title="Refresh database records"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {/* Custom Exact Date ("also by date") & Date Range Picker */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
            {/* Filter by Exact Date */}
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 font-semibold uppercase text-[10px]">Filter by Specific Date:</span>
              <input
                type="date"
                value={customDate}
                onChange={(e) => {
                  setCustomDate(e.target.value);
                  if (e.target.value) {
                    setDatePreset("custom_date");
                  }
                }}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-100 focus:outline-none focus:border-cyan-500"
              />
              {customDate && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomDate("");
                    setDatePreset("all");
                  }}
                  className="text-slate-500 hover:text-slate-300 p-0.5"
                  title="Clear specific date"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter by Date Range */}
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 font-semibold uppercase text-[10px]">Range:</span>
              <input
                type="date"
                placeholder="From"
                value={customRangeStart}
                onChange={(e) => {
                  setCustomRangeStart(e.target.value);
                  if (e.target.value || customRangeEnd) {
                    setDatePreset("custom_range");
                  }
                }}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-100 focus:outline-none focus:border-cyan-500 text-[11px]"
              />
              <span className="text-slate-600">to</span>
              <input
                type="date"
                placeholder="To"
                value={customRangeEnd}
                onChange={(e) => {
                  setCustomRangeEnd(e.target.value);
                  if (e.target.value || customRangeStart) {
                    setDatePreset("custom_range");
                  }
                }}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-100 focus:outline-none focus:border-cyan-500 text-[11px]"
              />
              {(customRangeStart || customRangeEnd) && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomRangeStart("");
                    setCustomRangeEnd("");
                    setDatePreset("all");
                  }}
                  className="text-slate-500 hover:text-slate-300 p-0.5"
                  title="Clear date range"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Active Filter Notice */}
          <div className="text-[11px] font-mono text-cyan-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            Showing: <span className="font-bold uppercase text-slate-200">{datePreset.replace("_", " ")}</span>
            {customDate && <span className="text-amber-400 font-bold">({customDate})</span>}
          </div>
        </div>

        {/* Text Search & Category Tabs */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedCategory(c)}
                className={`px-3 py-1 rounded-lg text-xs font-mono transition ${
                  selectedCategory === c
                    ? "bg-slate-800 text-cyan-400 border border-cyan-500/30 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search product name or barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono w-full sm:w-64"
            />
          </div>
        </div>
      </div>

      {/* 3. FILTERED PRODUCTS TABLE & CARDS */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md">
        
        {/* Table Sub-header with Financial Summary */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-200">
              Matched Products: <span className="text-cyan-400">{filteredProducts.length}</span>
            </span>
            <span className="text-slate-700">|</span>
            <span className="text-slate-400">
              Units: <span className="font-bold text-slate-200">{filteredStockTotal}</span>
            </span>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-slate-400">
              <span>Stock Valuation: </span>
              <span className="font-bold text-slate-100">₹{filteredValuation.toFixed(2)}</span>
            </div>
            <div className="text-slate-400">
              <span>Profit Potential: </span>
              <span className="font-bold text-emerald-400">₹{filteredProfitPotential.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-[11px] text-slate-400 uppercase tracking-wider">
                <th className="p-3.5 font-sans">Product Name & Barcode</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5 text-right text-amber-400">Pur Rate</th>
                <th className="p-3.5 text-right text-slate-200">Selling Rate</th>
                <th className="p-3.5 text-right text-emerald-400">Profit / Unit</th>
                <th className="p-3.5 text-center">Stock</th>
                <th className="p-3.5 text-center">Expiry Date / Status</th>
                <th className="p-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-500 font-mono">
                    Filtering catalog by date parameters...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <CalendarDays className="w-10 h-10 text-slate-600 mb-2 stroke-1" />
                      <p className="font-semibold text-slate-400">No products match the selected date criteria</p>
                      <p className="text-xs text-slate-600 mt-1">
                        Try switching presets (e.g. &quot;All Products&quot;) or picking a different date.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const purRate = product.purchaseRate ?? 0;
                  const sellingRate = product.price;
                  const profitUnit = sellingRate - purRate;
                  const marginPct = sellingRate > 0 ? ((profitUnit / sellingRate) * 100).toFixed(1) : "0";

                  return (
                    <tr key={product.id} className="hover:bg-slate-800/40 transition">
                      
                      {/* Product Name & Barcode */}
                      <td className="p-3.5 font-sans">
                        <div className="font-semibold text-slate-100 text-sm flex items-center gap-2">
                          <span>{product.name}</span>
                          {product.batchNo && (
                            <span className="text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700 px-1.5 py-0.2 rounded">
                              {product.batchNo}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-cyan-400 mt-0.5 flex items-center gap-2">
                          <span>Barcode: {product.barcode}</span>
                          <span className="text-slate-600">•</span>
                          <span className="text-slate-500">Rack: {product.rackLocation || "A-01"}</span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="p-3.5 font-mono text-slate-300">
                        <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 text-[11px]">
                          {product.category}
                        </span>
                      </td>

                      {/* Pur Rate */}
                      <td className="p-3.5 text-right font-bold text-amber-400">
                        ₹{purRate.toFixed(2)}
                      </td>

                      {/* Selling Rate */}
                      <td className="p-3.5 text-right font-bold text-slate-100">
                        ₹{sellingRate.toFixed(2)}
                      </td>

                      {/* Profit / Unit */}
                      <td className="p-3.5 text-right font-black text-emerald-400">
                        ₹{profitUnit.toFixed(2)}
                        <span className="text-[10px] text-emerald-500/80 font-normal ml-1">
                          ({marginPct}%)
                        </span>
                      </td>

                      {/* Stock Level */}
                      <td className="p-3.5 text-center">
                        <span className={`font-bold ${product.stock <= 5 ? "text-amber-400" : "text-slate-200"}`}>
                          {product.stock} {product.unit || "PCS"}
                        </span>
                      </td>

                      {/* Expiry Date & Status Badge */}
                      <td className="p-3.5 text-center">
                        <div className="flex flex-col items-center justify-center gap-1">
                          {getExpiryStatusBadge(product.expiryDate)}
                          {product.expiryDate && (
                            <span className="text-[10px] font-mono text-slate-500">
                              {product.expiryDate}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Action / Edit Expiry */}
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(product)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 border border-slate-700 rounded-lg text-xs font-mono inline-flex items-center gap-1 transition"
                          title="Edit Expiry Date & Details"
                        >
                          <Edit3 className="w-3 h-3" />
                          Edit Date
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

      {/* 4. EDIT PRODUCT / EXPIRY DATE MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-cyan-400" />
                Update Lifecycle & Expiry Date
              </h3>
              <button onClick={() => setEditingProduct(null)} className="text-slate-500 hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <div className="text-xs font-bold font-sans text-slate-200">{editingProduct.name}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Barcode: {editingProduct.barcode}</div>
              </div>

              {/* Expiry Date Input */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <label className="text-cyan-400 block font-bold uppercase text-[10px] tracking-wider">
                  Expiry Date (Best Before / Shelf Life) *
                </label>
                <input
                  type="date"
                  value={editFormData.expiryDate}
                  onChange={(e) => setEditFormData({ ...editFormData, expiryDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                />
                
                {/* Fast Expiry Shortcuts */}
                <div className="flex gap-1.5 text-[10px] text-slate-400 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditFormData({ ...editFormData, expiryDate: todayStr })}
                    className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-amber-400"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date(now.getFullYear(), now.getMonth() + 1, 0); // End of this month
                      setEditFormData({ ...editFormData, expiryDate: d.toISOString().split("T")[0] });
                    }}
                    className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-cyan-400"
                  >
                    End of This Month
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date(now.getFullYear(), now.getMonth() + 2, 0); // End of next month
                      setEditFormData({ ...editFormData, expiryDate: d.toISOString().split("T")[0] });
                    }}
                    className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-blue-400"
                  >
                    Next Month
                  </button>
                </div>
              </div>

              {/* Batch / Lot Number */}
              <div>
                <label className="text-slate-400 block mb-1">Batch / Lot Number:</label>
                <input
                  type="text"
                  placeholder="e.g. LOT-2604"
                  value={editFormData.batchNo}
                  onChange={(e) => setEditFormData({ ...editFormData, batchNo: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Pur Rate & Selling Rate */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Pur Rate (₹):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editFormData.purchaseRate}
                    onChange={(e) => setEditFormData({ ...editFormData, purchaseRate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Selling Rate (₹):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editFormData.price}
                    onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100"
                  />
                </div>
              </div>

              {/* Stock */}
              <div>
                <label className="text-slate-400 block mb-1">Current Stock:</label>
                <input
                  type="number"
                  value={editFormData.stock}
                  onChange={(e) => setEditFormData({ ...editFormData, stock: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
