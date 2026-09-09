"use client";
import React, { useEffect, useState } from "react";
import { 
  searchSales, 
  getSaleById, 
  validateReturn, 
  processSalesReturn,
  fetchReturns,
  Sale, 
  SalesReturn, 
  ReturnItem,
  BillItem
} from "@/lib/store";
import { 
  Search, 
  RotateCcw, 
  AlertCircle, 
  CheckCircle2, 
  X,
  Receipt,
  Calendar,
  User,
  Phone,
  Package,
  DollarSign,
  CreditCard,
  Banknote,
  QrCode,
  ArrowLeft,
  Printer,
  Eye,
  ShoppingCart
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export default function SalesReturnPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Sale[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [returnItems, setReturnItems] = useState<Map<string, number>>(new Map());
  const [refundMethod, setRefundMethod] = useState<"CASH" | "CARD" | "UPI" | "CREDIT" | "ORIGINAL_MODE">("ORIGINAL_MODE");
  const [returnReason, setReturnReason] = useState("");
  const [returnNotes, setReturnNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastReturn, setLastReturn] = useState<SalesReturn | null>(null);
  const [showReturnReceipt, setShowReturnReceipt] = useState(false);
  const [returnHistory, setReturnHistory] = useState<SalesReturn[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load return history on mount
  useEffect(() => {
    fetchReturns().then(setReturnHistory);
  }, []);

  // Search for sales
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError("Please enter a bill number, phone number, or customer name");
      return;
    }

    setSearching(true);
    setError(null);
    setSelectedSale(null);
    setReturnItems(new Map());

    try {
      const results = await searchSales(searchQuery);
      setSearchResults(results);
      
      if (results.length === 0) {
        setError("No transactions found matching your search");
      } else if (results.length === 1) {
        // Auto-select if only one result
        setSelectedSale(results[0]);
      }
    } catch (err) {
      setError("Failed to search transactions. Please try again.");
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  // Select a sale from search results
  const handleSelectSale = (sale: Sale) => {
    setSelectedSale(sale);
    setReturnItems(new Map());
    setError(null);
    setSuccess(null);
  };

  // Toggle return quantity for an item
  const handleToggleReturnItem = (item: BillItem, quantity: number) => {
    const newMap = new Map(returnItems);
    
    if (quantity <= 0) {
      newMap.delete(item.id);
    } else {
      const maxQty = item.quantity;
      newMap.set(item.id, Math.min(quantity, maxQty));
    }
    
    setReturnItems(newMap);
    setError(null);
  };

  // Calculate return totals
  const calculateReturnTotals = () => {
    if (!selectedSale) return { subtotal: 0, discount: 0, tax: 0, total: 0 };

    let subtotal = 0;
    let discount = 0;
    let tax = 0;

    selectedSale.items.forEach(item => {
      const returnQty = returnItems.get(item.id) || 0;
      if (returnQty > 0) {
        const itemSubtotal = item.rate * returnQty;
        const itemDiscount = (itemSubtotal * item.discountPercent) / 100;
        const taxableAmount = itemSubtotal - itemDiscount;
        const itemTax = (taxableAmount * item.taxPercent) / 100;

        subtotal += itemSubtotal;
        discount += itemDiscount;
        tax += itemTax;
      }
    });

    // Calculate proportional bill discount
    const originalTotal = selectedSale.subtotal - selectedSale.itemDiscountTotal;
    const returnBeforeDiscount = subtotal - discount;
    const billDiscountRatio = originalTotal > 0 ? selectedSale.billDiscount / originalTotal : 0;
    const returnBillDiscount = returnBeforeDiscount * billDiscountRatio;

    const total = Math.max(0, subtotal - discount - returnBillDiscount);

    return { 
      subtotal: Math.round(subtotal * 100) / 100, 
      discount: Math.round((discount + returnBillDiscount) * 100) / 100, 
      tax: Math.round(tax * 100) / 100, 
      total: Math.round(total * 100) / 100 
    };
  };

  // Process the return
  const handleProcessReturn = async () => {
    if (!selectedSale) {
      setError("No sale selected");
      return;
    }

    if (returnItems.size === 0) {
      setError("Please select at least one item to return");
      return;
    }

    setProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      // Build return items array
      const returnItemsArray: ReturnItem[] = [];
      
      selectedSale.items.forEach(item => {
        const returnQty = returnItems.get(item.id);
        if (returnQty && returnQty > 0) {
          const itemRate = item.rate;
          const discountAmount = (itemRate * returnQty * item.discountPercent) / 100;
          const taxableAmount = (itemRate * returnQty) - discountAmount;
          const taxAmount = (taxableAmount * item.taxPercent) / 100;
          const netAmount = itemRate * returnQty - discountAmount;

          returnItemsArray.push({
            id: item.id,
            barcode: item.barcode,
            name: item.name,
            unit: item.unit,
            originalQuantity: item.quantity,
            returnQuantity: returnQty,
            rate: itemRate,
            discountPercent: item.discountPercent,
            discountAmount: Math.round(discountAmount * 100) / 100,
            taxPercent: item.taxPercent,
            taxAmount: Math.round(taxAmount * 100) / 100,
            netAmount: Math.round(netAmount * 100) / 100,
            reason: returnReason || undefined
          });
        }
      });

      // Validate before processing
      const validation = validateReturn(selectedSale, returnItemsArray);
      if (!validation.valid) {
        setError(validation.errors.join("; "));
        setProcessing(false);
        return;
      }

      // Process the return
      const result = await processSalesReturn(
        selectedSale.id,
        returnItemsArray,
        refundMethod,
        returnReason || undefined,
        returnNotes || undefined,
        user?.email || "stacklyn96@gmail.com"
      );

      if (result.success && result.return) {
        setSuccess(`Return processed successfully! Return No: ${result.return.returnNo}`);
        setLastReturn(result.return);
        setShowReturnReceipt(true);
        
        // Refresh return history
        const updatedHistory = await fetchReturns();
        setReturnHistory(updatedHistory);
        
        // Reset form
        setSelectedSale(null);
        setReturnItems(new Map());
        setSearchQuery("");
        setSearchResults([]);
        setReturnReason("");
        setReturnNotes("");
        setRefundMethod("ORIGINAL_MODE");
      } else {
        setError(result.error || "Failed to process return");
      }
    } catch (err) {
      setError("An unexpected error occurred while processing the return");
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  // Print return receipt
  const handlePrintReturnReceipt = () => {
    window.print();
  };

  // Get days since sale
  const getDaysSinceSale = (timestamp: string) => {
    const saleDate = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - saleDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const returnTotals = calculateReturnTotals();

  return (
    <div className="max-w-7xl mx-auto space-y-6 select-none font-sans">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-black text-slate-100 uppercase tracking-tight flex items-center gap-2">
              <RotateCcw className="w-6 h-6 text-cyan-400" />
              Sales Return & Refund Processing
            </h1>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Process customer returns, refunds, and inventory restocking
            </p>
          </div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-sm flex items-center gap-2 text-slate-300 transition"
          >
            <Eye className="w-4 h-4" />
            {showHistory ? "Hide" : "Show"} History
          </button>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start gap-3 backdrop-blur-md">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400" />
            <div>
              <p className="font-bold text-red-400 text-sm">Error</p>
              <p className="text-sm text-slate-300">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-start gap-3 backdrop-blur-md">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-400" />
            <div>
              <p className="font-bold text-emerald-400 text-sm">Success</p>
              <p className="text-sm text-slate-300">{success}</p>
            </div>
          </div>
        )}

        {/* Return History View */}
        {showHistory && (
          <div className="mb-6 p-5 bg-slate-900/90 border border-slate-800 rounded-2xl backdrop-blur-md shadow-xl">
            <h2 className="text-base font-bold mb-4 flex items-center gap-2 text-slate-100">
              <Receipt className="w-5 h-5 text-cyan-400" />
              Return History ({returnHistory.length})
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {returnHistory.length === 0 ? (
                <p className="text-slate-500 text-sm">No returns processed yet</p>
              ) : (
                returnHistory.map(ret => (
                  <div key={ret.id} className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-sm hover:bg-slate-800/40 transition">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-slate-200 font-mono">{ret.returnNo}</p>
                        <p className="text-slate-400 text-xs mt-0.5">Original: {ret.originalBillNo}</p>
                        <p className="text-slate-400 text-xs">{ret.customer.name} - {ret.customer.phone}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-100 font-mono">₹{ret.totalReturnAmount.toFixed(2)}</p>
                        <p className="text-cyan-400 text-xs bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/30 inline-block mt-1">
                          {ret.refundMethod}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(ret.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {ret.returnReason && (
                      <p className="mt-2 text-xs text-slate-500 bg-slate-900/50 p-2 rounded border border-slate-800">
                        Reason: {ret.returnReason}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel: Search & Select Transaction */}
          <div className="space-y-4">
            <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl backdrop-blur-md shadow-xl">
              <h2 className="text-base font-bold mb-4 flex items-center gap-2 text-slate-100">
                <Search className="w-5 h-5 text-cyan-400" />
                Find Transaction
              </h2>

              {/* Search Input */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Bill No, Phone, or Customer Name..."
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-cyan-500 text-slate-100 placeholder-slate-500 text-sm"
                />
                <button
                  onClick={handleSearch}
                  disabled={searching}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:cursor-not-allowed rounded-xl flex items-center gap-2 text-slate-950 font-bold transition text-sm"
                >
                  {searching ? "..." : <Search className="w-4 h-4" />}
                  Search
                </button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && !selectedSale && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  <p className="text-sm text-slate-400 mb-2 font-mono">
                    Found {searchResults.length} transaction(s):
                  </p>
                  {searchResults.map(sale => {
                    const daysSince = getDaysSinceSale(sale.timestamp);
                    const isExpired = daysSince > 30;
                    
                    return (
                      <button
                        key={sale.id}
                        onClick={() => !isExpired && handleSelectSale(sale)}
                        disabled={isExpired}
                        className={`w-full p-3 border rounded-xl text-left transition text-sm ${
                          isExpired
                            ? "bg-red-500/10 border-red-500/30 cursor-not-allowed opacity-50"
                            : "bg-slate-950/60 border-slate-800 hover:bg-slate-800/60 hover:border-cyan-500/30"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-slate-100 font-mono">{sale.billNo}</p>
                            <p className="text-sm text-slate-400">{sale.customer.name}</p>
                            <p className="text-sm text-slate-500 font-mono">{sale.customer.phone}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-100 font-mono">₹{sale.totalAmount.toFixed(2)}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {new Date(sale.timestamp).toLocaleDateString()}
                            </p>
                            <p className={`text-xs mt-1 font-mono ${isExpired ? "text-red-400" : "text-slate-500"}`}>
                              {daysSince === 0 ? "Today" : `${daysSince} days ago`}
                              {isExpired && " - EXPIRED"}
                            </p>
                          </div>
                        </div>
                        {sale.returnStatus && sale.returnStatus !== "none" && (
                          <div className="mt-2 text-xs text-amber-400 flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/30">
                            <AlertCircle className="w-3 h-3" />
                            {sale.returnStatus === "full" ? "Fully Returned" : "Partially Returned"}
                            {sale.returnAmount && ` (₹${sale.returnAmount.toFixed(2)})`}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selected Transaction Details */}
            {selectedSale && (
              <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl backdrop-blur-md shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold flex items-center gap-2 text-slate-100">
                    <Receipt className="w-5 h-5 text-cyan-400" />
                    Transaction Details
                  </h2>
                  <button
                    onClick={() => {
                      setSelectedSale(null);
                      setReturnItems(new Map());
                    }}
                    className="text-slate-500 hover:text-slate-300 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-2.5 text-sm">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Receipt className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-400">Bill No:</span>
                    <span className="font-bold text-cyan-400 font-mono">{selectedSale.billNo}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-400">Date:</span>
                    <span className="font-mono">{new Date(selectedSale.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <User className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-400">Customer:</span>
                    <span className="font-semibold">{selectedSale.customer.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Phone className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-400">Phone:</span>
                    <span className="font-mono">{selectedSale.customer.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <DollarSign className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-400">Original Total:</span>
                    <span className="font-bold text-slate-100 font-mono">₹{selectedSale.totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <CreditCard className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-400">Payment:</span>
                    <span className="bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full text-xs border border-cyan-500/30 font-mono">
                      {selectedSale.payment.mode}
                    </span>
                  </div>
                </div>

                {/* Items List with Return Selection */}
                <div className="mt-4 pt-4 border-t border-slate-800">
                  <h3 className="font-bold mb-3 flex items-center gap-2 text-slate-100 text-sm">
                    <Package className="w-4 h-4 text-cyan-400" />
                    Select Items to Return
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedSale.items.map(item => (
                      <div key={item.id} className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl hover:bg-slate-800/40 transition">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <p className="font-bold text-sm text-slate-200">{item.name}</p>
                            <p className="text-xs text-slate-400 font-mono">
                              Rate: ₹{item.rate} × {item.quantity} {item.unit}
                            </p>
                            {item.discountPercent > 0 && (
                              <p className="text-xs text-amber-400">
                                Discount: {item.discountPercent}%
                              </p>
                            )}
                          </div>
                          <p className="font-bold text-sm text-slate-100 font-mono">₹{item.netAmount.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-400">Return Qty:</label>
                          <input
                            type="number"
                            min="0"
                            max={item.quantity}
                            value={returnItems.get(item.id) || 0}
                            onChange={(e) => handleToggleReturnItem(item, parseInt(e.target.value) || 0)}
                            className="w-20 px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-sm focus:outline-none focus:border-cyan-500 text-slate-100 font-mono"
                          />
                          <span className="text-xs text-slate-500">of {item.quantity}</span>
                          {returnItems.get(item.id) && returnItems.get(item.id)! > 0 && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-auto" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: Return Processing */}
          <div className="space-y-4">
            {selectedSale && returnItems.size > 0 && (
              <>
                {/* Return Summary */}
                <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl backdrop-blur-md shadow-xl">
                  <h2 className="text-base font-bold mb-4 flex items-center gap-2 text-slate-100">
                    <DollarSign className="w-5 h-5 text-emerald-400" />
                    Return Summary
                  </h2>
                  <div className="space-y-2 text-sm font-mono">
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-400">Items to Return:</span>
                      <span className="font-bold">{returnItems.size}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-400">Subtotal:</span>
                      <span>₹{returnTotals.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-amber-400">
                      <span>Discount:</span>
                      <span>-₹{returnTotals.discount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-400">Tax:</span>
                      <span>₹{returnTotals.tax.toFixed(2)}</span>
                    </div>
                    <div className="pt-3 border-t border-slate-800 flex justify-between text-base">
                      <span className="font-bold text-slate-100">Refund Amount:</span>
                      <span className="font-black text-emerald-400">₹{returnTotals.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Return Details Form */}
                <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl backdrop-blur-md shadow-xl">
                  <h2 className="text-base font-bold mb-4 text-slate-100">Return Details</h2>
                  
                  <div className="space-y-4">
                    {/* Refund Method */}
                    <div>
                      <label className="block text-sm font-bold mb-2 text-slate-300">Refund Method <span className="text-red-400">*</span></label>
                      <div className="grid grid-cols-2 gap-2">
                        {(["ORIGINAL_MODE", "CASH", "CARD", "UPI", "CREDIT"] as const).map(method => (
                          <button
                            key={method}
                            onClick={() => setRefundMethod(method)}
                            className={`p-2.5 border rounded-xl text-xs flex items-center justify-center gap-2 font-mono font-bold transition ${
                              refundMethod === method
                                ? "bg-cyan-500 border-cyan-400 text-slate-950"
                                : "bg-slate-950 border-slate-800 hover:border-cyan-500/40 text-slate-300"
                            }`}
                          >
                            {method === "CASH" && <Banknote className="w-4 h-4" />}
                            {method === "CARD" && <CreditCard className="w-4 h-4" />}
                            {method === "UPI" && <QrCode className="w-4 h-4" />}
                            {method === "CREDIT" && <DollarSign className="w-4 h-4" />}
                            {method === "ORIGINAL_MODE" && <RotateCcw className="w-4 h-4" />}
                            {method.replace("_", " ")}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Return Reason */}
                    <div>
                      <label className="block text-sm font-bold mb-2 text-slate-300">Return Reason</label>
                      <select
                        value={returnReason}
                        onChange={(e) => setReturnReason(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-cyan-500 text-slate-100 text-sm"
                      >
                        <option value="">Select reason...</option>
                        <option value="Defective Product">Defective Product</option>
                        <option value="Wrong Item">Wrong Item</option>
                        <option value="Customer Changed Mind">Customer Changed Mind</option>
                        <option value="Quality Issue">Quality Issue</option>
                        <option value="Expired Product">Expired Product</option>
                        <option value="Damaged in Transit">Damaged in Transit</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {/* Additional Notes */}
                    <div>
                      <label className="block text-sm font-bold mb-2 text-slate-300">Additional Notes</label>
                      <textarea
                        value={returnNotes}
                        onChange={(e) => setReturnNotes(e.target.value)}
                        rows={3}
                        placeholder="Optional notes about this return..."
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-cyan-500 resize-none text-slate-100 placeholder-slate-500 text-sm"
                      />
                    </div>

                    {/* Process Button */}
                    <button
                      onClick={handleProcessReturn}
                      disabled={processing || returnItems.size === 0}
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:cursor-not-allowed rounded-xl font-bold flex items-center justify-center gap-2 text-slate-950 transition"
                    >
                      {processing ? (
                        <>Processing...</>
                      ) : (
                        <>
                          <RotateCcw className="w-5 h-5" />
                          Process Return - ₹{returnTotals.total.toFixed(2)}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Instructions when no sale selected */}
            {!selectedSale && (
              <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-2xl text-center backdrop-blur-md shadow-xl">
                <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-slate-600" />
                <h3 className="text-base font-bold mb-2 text-slate-100">No Transaction Selected</h3>
                <p className="text-sm text-slate-400">
                  Search for a transaction using bill number, phone number, or customer name to initiate a return.
                </p>
                <div className="mt-4 p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-left text-xs space-y-1.5">
                  <p className="font-bold text-cyan-400">Return Policy:</p>
                  <p className="text-slate-400">• Returns accepted within 30 days</p>
                  <p className="text-slate-400">• Original receipt required</p>
                  <p className="text-slate-400">• Items must be in original condition</p>
                  <p className="text-slate-400">• Refund processed via original payment method</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Return Receipt Modal */}
      {showReturnReceipt && lastReturn && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 space-y-4">
              {/* Header */}
              <div className="text-center border-b border-slate-800 pb-4">
                <h2 className="text-xl font-bold mb-1 text-slate-100">POS VAULT LOCKER</h2>
                <p className="text-base font-bold text-cyan-400">RETURN RECEIPT</p>
              </div>

              {/* Return Info */}
              <div className="space-y-2 text-sm font-mono">
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Return No:</span>
                  <span className="font-bold text-cyan-400">{lastReturn.returnNo}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Original Bill:</span>
                  <span className="font-bold">{lastReturn.originalBillNo}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Date:</span>
                  <span>{new Date(lastReturn.timestamp).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Customer:</span>
                  <span className="font-semibold">{lastReturn.customer.name}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Phone:</span>
                  <span>{lastReturn.customer.phone}</span>
                </div>
              </div>

              {/* Items */}
              <div className="border-t border-slate-800 pt-4">
                <h3 className="font-bold mb-3 text-slate-100">RETURNED ITEMS</h3>
                <div className="space-y-2">
                  {lastReturn.returnItems.map((item, idx) => (
                    <div key={idx} className="text-sm">
                      <div className="flex justify-between font-bold text-slate-200">
                        <span>{item.name}</span>
                        <span>₹{item.netAmount.toFixed(2)}</span>
                      </div>
                      <div className="text-xs text-slate-400 font-mono">
                        {item.returnQuantity} {item.unit} @ ₹{item.rate}
                        {item.discountPercent > 0 && ` (-${item.discountPercent}%)`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="border-t border-slate-800 pt-4 space-y-2 text-sm font-mono">
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Subtotal:</span>
                  <span>₹{lastReturn.returnSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-amber-400">
                  <span>Discount:</span>
                  <span>-₹{(lastReturn.returnItemDiscountTotal + lastReturn.returnBillDiscount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Tax:</span>
                  <span>₹{lastReturn.returnTaxTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-bold border-t border-slate-800 pt-2 text-slate-100">
                  <span>REFUND AMOUNT:</span>
                  <span className="text-emerald-400">₹{lastReturn.totalReturnAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Refund Method */}
              <div className="border-t border-slate-800 pt-4">
                <div className="flex justify-between text-sm text-slate-300">
                  <span className="text-slate-400">Refund Method:</span>
                  <span className="font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/30">
                    {lastReturn.refundMethod}
                  </span>
                </div>
                {lastReturn.returnReason && (
                  <div className="mt-2 text-sm text-slate-300">
                    <span className="text-slate-400">Reason: </span>
                    <span>{lastReturn.returnReason}</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-slate-800 pt-4 text-center text-xs text-slate-400 font-mono">
                <p>Thank you for your business!</p>
                <p className="mt-1">Processed by: {lastReturn.processedBy}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 print:hidden">
                <button
                  onClick={handlePrintReturnReceipt}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
                <button
                  onClick={() => {
                    setShowReturnReceipt(false);
                    setLastReturn(null);
                  }}
                  className="flex-1 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl font-bold transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
