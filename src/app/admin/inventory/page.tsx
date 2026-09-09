"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { fetchInventory, addProduct, updateProduct, removeProduct, Product } from "@/lib/store";
import { 
  Package, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  AlertTriangle, 
  DollarSign, 
  Boxes,
  X,
  Barcode,
  CalendarDays
} from "lucide-react";

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    purchaseRate: "",
    price: "",
    mrp: "",
    stock: "",
    category: "Beverages",
    barcode: "",
    unit: "PCS",
    taxPercent: "5",
    hsnCode: "",
    rackLocation: "A-01",
    expiryDate: "",
    batchNo: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  const loadProducts = async () => {
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

  const categories = ["All", "Beverages", "Bakery", "Food", "Merchandise", "Snacks"];

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        p.barcode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (p.rackLocation && p.rackLocation.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchCat = selectedCategory === "All" || p.category === selectedCategory;
    return matchSearch && matchCat;
  });

  // Analytics Metrics
  const totalStockCount = products.reduce((acc, p) => acc + (p.stock || 0), 0);
  const totalInventoryValuation = products.reduce((acc, p) => acc + (p.price * (p.stock || 0)), 0);
  const lowStockCount = products.filter((p) => p.stock <= 5).length;

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      name: "",
      purchaseRate: "",
      price: "",
      mrp: "",
      stock: "50",
      category: "Beverages",
      barcode: "POS-" + Math.floor(1000 + Math.random() * 9000),
      unit: "PCS",
      taxPercent: "5",
      hsnCode: "",
      rackLocation: "A-01",
      expiryDate: "",
      batchNo: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingId(p.id);
    setFormData({
      name: p.name,
      purchaseRate: p.purchaseRate !== undefined ? p.purchaseRate.toString() : "",
      price: p.price.toString(),
      mrp: p.mrp ? p.mrp.toString() : p.price.toString(),
      stock: p.stock.toString(),
      category: p.category,
      barcode: p.barcode || "",
      unit: p.unit || "PCS",
      taxPercent: p.taxPercent !== undefined ? p.taxPercent.toString() : "5",
      hsnCode: p.hsnCode || "",
      rackLocation: p.rackLocation || "A-01",
      expiryDate: p.expiryDate || "",
      batchNo: p.batchNo || "",
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.price) return;

    setIsSaving(true);
    try {
      const priceNum = parseFloat(formData.price) || 0;
      const mrpNum = parseFloat(formData.mrp) || priceNum;
      const stockNum = parseInt(formData.stock) || 0;
      const taxNum = parseFloat(formData.taxPercent) || 0;

      const payload: Partial<Product> = {
        name: formData.name.trim(),
        purchaseRate: formData.purchaseRate ? parseFloat(formData.purchaseRate) : undefined,
        price: priceNum,
        mrp: mrpNum,
        stock: stockNum,
        category: formData.category,
        barcode: formData.barcode.trim() || "POS-" + Math.floor(1000 + Math.random() * 9000),
        unit: formData.unit || "PCS",
        taxPercent: taxNum,
        hsnCode: formData.hsnCode.trim(),
        rackLocation: formData.rackLocation.trim() || "A-01",
        expiryDate: formData.expiryDate || undefined,
        batchNo: formData.batchNo.trim() || undefined,
      };

      if (editingId) {
        await updateProduct(editingId, payload);
      } else {
        await addProduct(payload as Omit<Product, "id">);
      }

      setIsModalOpen(false);
      await loadProducts();
    } catch {
      alert("Failed to save product.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickStock = async (id: string, delta: number) => {
    const prod = products.find((p) => p.id === id);
    if (!prod) return;
    const newStock = Math.max(0, prod.stock + delta);
    await updateProduct(id, { stock: newStock });
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, stock: newStock } : p)));
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}" from the inventory vault?`)) {
      await removeProduct(id);
      await loadProducts();
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-mono uppercase">Total SKUs</div>
            <div className="text-xl font-bold text-slate-100">{products.length} Products</div>
          </div>
        </div>

        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-mono uppercase">Total Units</div>
            <div className="text-xl font-bold text-slate-100">{totalStockCount} in Stock</div>
          </div>
        </div>

        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-mono uppercase">Inventory Value</div>
            <div className="text-xl font-bold text-slate-100 font-mono">₹{totalInventoryValuation.toFixed(2)}</div>
          </div>
        </div>

        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${lowStockCount > 0 ? "bg-amber-500/10 border border-amber-500/20 text-amber-400" : "bg-slate-800 text-slate-400"}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-mono uppercase">Low Stock Alert</div>
            <div className={`text-xl font-bold ${lowStockCount > 0 ? "text-amber-400" : "text-slate-100"}`}>
              {lowStockCount} Items Low
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md">
        {/* Actions Bar */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Inventory Management</h2>
            <p className="text-xs text-slate-400">Add, edit, adjust stock, and manage your POS catalog</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono w-48 sm:w-64"
              />
            </div>

            <Link
              href="/admin/products"
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 font-bold rounded-xl text-xs flex items-center gap-1.5 transition"
            >
              <CalendarDays className="w-4 h-4" />
              Date & Expiry Filter
            </Link>

            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </button>
          </div>
        </div>

        {/* Category Filters */}
        <div className="px-6 py-2 bg-slate-950/40 border-b border-slate-800 flex items-center gap-2 overflow-x-auto">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCategory(c)}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition ${
                selectedCategory === c
                  ? "bg-slate-800 text-cyan-400 font-bold border border-cyan-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50 text-[11px] text-slate-400 uppercase">
                <th className="p-4 font-sans">Product Info</th>
                <th className="p-4">Category</th>
                <th className="p-4">Rack Loc</th>
                <th className="p-4 text-right">MRP</th>
                <th className="p-4 text-right">Selling Rate</th>
                <th className="p-4 text-center">Tax %</th>
                <th className="p-4 text-center">Stock</th>
                <th className="p-4 text-center">Quick Adjust</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500 font-mono">
                    Loading inventory from database vault...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    No products found. Click &quot;Add Product&quot; to populate your inventory.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const isLow = item.stock <= 5;
                  const isOut = item.stock <= 0;

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-4 font-sans">
                        <div className="font-semibold text-slate-100">{item.name}</div>
                        <div className="text-[11px] font-mono text-slate-500 flex items-center gap-2 mt-0.5">
                          {item.barcode && (
                            <span className="flex items-center gap-1 text-cyan-400">
                              <Barcode className="w-3 h-3" />
                              {item.barcode}
                            </span>
                          )}
                          {item.hsnCode && <span>HSN: {item.hsnCode}</span>}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-[11px] bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700">
                          {item.category}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400 text-xs">
                        {item.rackLocation || "A-01"}
                      </td>
                      <td className="p-4 text-right text-slate-400">
                        ₹{(item.mrp || item.price).toFixed(2)}
                      </td>
                      <td className="p-4 text-right font-bold text-emerald-400 text-sm">
                        ₹{item.price.toFixed(2)}
                      </td>
                      <td className="p-4 text-center text-slate-300">
                        {item.taxPercent ?? 5}%
                      </td>
                      <td className="p-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <span className={`inline-block w-2 h-2 rounded-full ${isOut ? "bg-red-500" : isLow ? "bg-amber-400" : "bg-emerald-400"}`} />
                          <span className="font-bold text-slate-200">{item.stock} {item.unit || "PCS"}</span>
                          {isOut && <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-1 py-0.2 rounded">OUT</span>}
                          {!isOut && isLow && <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1 py-0.2 rounded">LOW</span>}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleQuickStock(item.id, -1)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition"
                            title="Decrease Stock"
                          >
                            -1
                          </button>
                          <button
                            onClick={() => handleQuickStock(item.id, 1)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition"
                            title="Increase Stock"
                          >
                            +1
                          </button>
                          <button
                            onClick={() => handleQuickStock(item.id, 10)}
                            className="px-2 py-1 bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-300 rounded text-xs transition"
                            title="Add 10 Units"
                          >
                            +10
                          </button>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 transition"
                            title="Edit Item"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.name)}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
                            title="Delete Item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Package className="w-4 h-4 text-cyan-400" />
                {editingId ? "Edit Product Details" : "Register New Product (GoFrugal SKU)"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 font-mono text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Product Description / Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Colombian Roast Coffee 250g"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-sans text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Purchase Rate (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Optional cost price"
                    value={formData.purchaseRate}
                    onChange={(e) => setFormData({ ...formData, purchaseRate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-amber-400 focus:outline-none focus:border-cyan-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Selling Rate (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="199.00"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-bold text-emerald-400 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">MRP (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="220.00"
                    value={formData.mrp}
                    onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Stock Units *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="50"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Unit (UOM)</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="PCS">PCS</option>
                    <option value="BOX">BOX</option>
                    <option value="PKT">PKT</option>
                    <option value="BOT">BOT</option>
                    <option value="LTR">LTR</option>
                    <option value="KG">KG</option>
                    <option value="GM">GM</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">GST Tax Rate</label>
                  <select
                    value={formData.taxPercent}
                    onChange={(e) => setFormData({ ...formData, taxPercent: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="0">0% (Nil)</option>
                    <option value="5">5% (GST)</option>
                    <option value="12">12% (GST)</option>
                    <option value="18">18% (GST)</option>
                    <option value="28">28% (GST)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Beverages">Beverages</option>
                    <option value="Bakery">Bakery</option>
                    <option value="Food">Food</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Merchandise">Merchandise</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Barcode / SKU</label>
                  <input
                    type="text"
                    placeholder="1001"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-cyan-400 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Rack / Shelf Location</label>
                  <input
                    type="text"
                    placeholder="A-01"
                    value={formData.rackLocation}
                    onChange={(e) => setFormData({ ...formData, rackLocation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">HSN Code</label>
                  <input
                    type="text"
                    placeholder="0901"
                    value={formData.hsnCode}
                    onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-mono transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs font-mono flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : editingId ? "Update Product" : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
