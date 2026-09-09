"use client";
import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { 
  fetchInventory, 
  processRetailSale, 
  Product, 
  BillItem, 
  Sale, 
  Customer, 
  HeldBill,
  getLocalCustomers, 
  saveLocalCustomer, 
  getHeldBills, 
  saveHeldBill, 
  removeHeldBill,
  addProduct,
  canSellProduct,
  isProductExpired,
  fetchSales
} from "@/lib/store";
import { useAuth } from "@/lib/AuthContext";
import { 
  Search, 
  Plus, 
  Trash2, 
  Package, 
  Printer, 
  Barcode, 
  PauseCircle, 
  User, 
  Phone, 
  Percent, 
  CreditCard, 
  Banknote, 
  QrCode, 
  Wallet, 
  X, 
  Layers, 
  Save 
} from "lucide-react";

export default function GoFrugalRetailEasySalesScreen() {
  const { user } = useAuth();
  
  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [heldBills, setHeldBills] = useState<HeldBill[]>([]);

  // Active Billing States
  const [billNo, setBillNo] = useState("");
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  
  // Fast Barcode / Search Input State
  const [scanInput, setScanInput] = useState("");
  const [quickQty, setQuickQty] = useState(1);

  // Customer State with Extended Retail Fields
  const [customerPhone, setCustomerPhone] = useState("9999999999");
  const [customerName, setCustomerName] = useState("Walk-In Customer");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerGstin, setCustomerGstin] = useState("");
  const [customerType, setCustomerType] = useState<"Retail" | "Wholesale" | "VIP" | "Corporate">("Retail");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerCity, setCustomerCity] = useState("");
  const [customerState, setCustomerState] = useState("");
  const [customerPincode, setCustomerPincode] = useState("");
  const [customerPoints, setCustomerPoints] = useState(0);
  const [customerCreditLimit, setCustomerCreditLimit] = useState(0);
  const [customerCredit, setCustomerCredit] = useState(0);
  const [customerDob, setCustomerDob] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");

  // Discount & Taxes
  const [billDiscountPercent, setBillDiscountPercent] = useState(0);
  const [billDiscountAmount, setBillDiscountAmount] = useState(0);

  // Modals
  const [isTenderModalOpen, setIsTenderModalOpen] = useState(false);
  const [isItemLookupOpen, setIsItemLookupOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isHeldBillsModalOpen, setIsHeldBillsModalOpen] = useState(false);
  const [isBillDiscountModalOpen, setIsBillDiscountModalOpen] = useState(false);
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<Sale | null>(null);
  const [expiredProductModal, setExpiredProductModal] = useState<{ show: boolean; product: Product | null; reason: string }>({
    show: false,
    product: null,
    reason: ""
  });
  const [isReprintModalOpen, setIsReprintModalOpen] = useState(false);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);

  // Tender / Settlement State
  const [paymentMode, setPaymentMode] = useState<"CASH" | "CARD" | "UPI" | "CREDIT" | "SPLIT">("CASH");
  const [cashTendered, setCashTendered] = useState<string>("");
  const [cardAmount, setCardAmount] = useState<string>("");
  const [upiAmount, setUpiAmount] = useState<string>("");
  const [creditAmount, setCreditAmount] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Quick SKU form
  const [newSku, setNewSku] = useState({ name: "", purchaseRate: "", price: "", stock: "50", barcode: "", category: "Beverages" });

  const scanInputRef = useRef<HTMLInputElement>(null);

  // Financial Calculations (GST is not added on top of selling rate to total amount)
  const grossSubtotal = billItems.reduce((sum, it) => sum + it.rate * it.quantity, 0);
  const totalItemDiscount = billItems.reduce((sum, it) => sum + it.discountAmount, 0);
  const totalTax = billItems.reduce((sum, it) => sum + it.taxAmount, 0);
  const netBeforeBillDiscount = Math.max(0, grossSubtotal - totalItemDiscount);
  const appliedBillDiscount = billDiscountAmount > 0 
    ? billDiscountAmount 
    : (netBeforeBillDiscount * billDiscountPercent) / 100;
  
  const grandTotalRaw = Math.max(0, netBeforeBillDiscount - appliedBillDiscount);
  const grandTotal = Math.round(grandTotalRaw * 100) / 100;
  const roundOff = Math.round((grandTotal - grandTotalRaw) * 100) / 100;
  const totalQtyCount = billItems.reduce((sum, it) => sum + it.quantity, 0);
  const totalCost = billItems.reduce((sum, item) => {
    const purchaseRate = item.purchaseRate ?? products.find((product) => product.id === item.id)?.purchaseRate ?? 0;
    return sum + purchaseRate * item.quantity;
  }, 0);
  const grossProfit = Math.round((grossSubtotal - totalItemDiscount - appliedBillDiscount - totalCost) * 100) / 100;

  // Selected Product for Focused Product Card
  const selectedItem = selectedRowIndex !== null && billItems[selectedRowIndex] 
    ? billItems[selectedRowIndex] 
    : null;
  const selectedItemPurRate = selectedItem 
    ? (selectedItem.purchaseRate ?? products.find((product) => product.id === selectedItem.id)?.purchaseRate ?? 0)
    : 0;

  // Initialize data and Bill No
  const generateNewBillNo = () => {
    const yr = new Date().getFullYear().toString().slice(-2);
    const rnd = Math.floor(1000 + Math.random() * 9000);
    setBillNo(`RE-${yr}-${rnd}`);
  };

  const loadData = async () => {
    const prodList = await fetchInventory();
    setProducts(prodList);
    setCustomers(getLocalCustomers());
    setHeldBills(getHeldBills());
    generateNewBillNo();
  };

  useEffect(() => {
    let isMounted = true;
    fetchInventory().then((prodList) => {
      if (isMounted) {
        setProducts(prodList);
        setCustomers(getLocalCustomers());
        setHeldBills(getHeldBills());
        const yr = new Date().getFullYear().toString().slice(-2);
        const rnd = Math.floor(1000 + Math.random() * 9000);
        setBillNo(`RE-${yr}-${rnd}`);
      }
    });
    scanInputRef.current?.focus();
    return () => {
      isMounted = false;
    };
  }, []);

  // Store active state in refs for reliable global keyboard shortcuts
  const stateRef = useRef({
    billItems,
    selectedRowIndex,
    customerName,
    customerPhone,
    customerGstin,
    customerAddress,
    grandTotal,
    isTenderModalOpen,
    isItemLookupOpen,
    isCustomerModalOpen,
    isHeldBillsModalOpen,
    isBillDiscountModalOpen,
    isQuickAddModalOpen,
  });

  useEffect(() => {
    stateRef.current = {
      billItems,
      selectedRowIndex,
      customerName,
      customerPhone,
      customerGstin,
      customerAddress,
      grandTotal,
      isTenderModalOpen,
      isItemLookupOpen,
      isCustomerModalOpen,
      isHeldBillsModalOpen,
      isBillDiscountModalOpen,
      isQuickAddModalOpen,
    };
  });

  // Live Item Search in Scan Input
  const matchingProducts = useMemo(() => {
    if (!scanInput.trim()) return [];
    const q = scanInput.toLowerCase();
    return products
      .filter((p) => p.barcode?.toLowerCase().includes(q) || p.name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [scanInput, products]);

  const isSearchDropdownOpen = matchingProducts.length > 0 && scanInput.trim().length > 0;

  // Fast Add Product by Barcode / Match
  const handleAddItemToBill = (product: Product, quantityToAdd: number = quickQty) => {
    // Check if product can be sold (expiry, inactive, stock)
    const sellCheck = canSellProduct(product);
    if (!sellCheck.canSell) {
      setExpiredProductModal({
        show: true,
        product,
        reason: sellCheck.reason || "This product cannot be sold."
      });
      return;
    }

    const existingIndex = billItems.findIndex(
      (item) => item.id === product.id || (product.barcode && product.barcode !== "N/A" && product.barcode !== "" && item.barcode === product.barcode)
    );
    
    if (existingIndex > -1) {
      const existing = billItems[existingIndex];
      const newQty = existing.quantity + quantityToAdd;
      if (newQty > product.stock) {
        alert(`Cannot exceed available stock of ${product.stock} units!`);
        return;
      }
      updateRowQuantity(existingIndex, newQty);
      setSelectedRowIndex(existingIndex);
    } else {
      if (quantityToAdd > product.stock) {
        alert(`Only ${product.stock} units available in stock.`);
        return;
      }
      const rate = product.price;
      const mrp = product.mrp || product.price;
      const taxPercent = product.taxPercent ?? 5;
      const discAmt = 0;
      const taxable = (rate * quantityToAdd) - discAmt;
      const taxAmt = Math.round(((taxable * taxPercent) / 100) * 100) / 100;
      const net = Math.round(taxable * 100) / 100;

      const newItem: BillItem = {
        id: product.id,
        barcode: product.barcode || "N/A",
        name: product.name,
        stock: product.stock,
        unit: product.unit || "PCS",
        purchaseRate: product.purchaseRate,
        mrp,
        rate,
        quantity: quantityToAdd,
        discountPercent: 0,
        discountAmount: 0,
        taxPercent,
        taxAmount: taxAmt,
        netAmount: net,
      };

      setBillItems((prev) => [...prev, newItem]);
      setSelectedRowIndex(billItems.length);
    }

    setScanInput("");
    setQuickQty(1);
    scanInputRef.current?.focus();
  };

  // Scan input submit
  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;

    // Exact barcode match first
    const exactMatch = products.find(
      (p) => p.barcode?.toLowerCase() === scanInput.trim().toLowerCase()
    );

    if (exactMatch) {
      handleAddItemToBill(exactMatch, quickQty);
    } else if (matchingProducts.length > 0) {
      handleAddItemToBill(matchingProducts[0], quickQty);
    } else {
      alert(`Item not found for code: "${scanInput}". Press [F8] to quick add SKU.`);
    }
  };

  // Inline Row Updates (Qty, Disc %)
  const updateRowQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveRow(index);
      return;
    }

    const currentItem = billItems[index];
    if (currentItem && newQty > currentItem.stock) {
      alert(`Max available stock is ${currentItem.stock}`);
      return;
    }

    setBillItems((prev) => {
      return prev.map((item, idx) => {
        if (idx !== index) return item;
        const discAmount = (item.rate * newQty * item.discountPercent) / 100;
        const taxable = (item.rate * newQty) - discAmount;
        const taxAmt = Math.round(((taxable * item.taxPercent) / 100) * 100) / 100;
        const net = Math.round(taxable * 100) / 100;

        return {
          ...item,
          quantity: newQty,
          discountAmount: discAmount,
          taxAmount: taxAmt,
          netAmount: net,
        };
      });
    });
  };

  const updateRowDiscount = (index: number, discPercent: number) => {
    const validPercent = Math.max(0, Math.min(100, discPercent));
    setBillItems((prev) => {
      return prev.map((item, idx) => {
        if (idx !== index) return item;
        const discAmount = (item.rate * item.quantity * validPercent) / 100;
        const taxable = (item.rate * item.quantity) - discAmount;
        const taxAmt = Math.round(((taxable * item.taxPercent) / 100) * 100) / 100;
        const net = Math.round(taxable * 100) / 100;

        return {
          ...item,
          discountPercent: validPercent,
          discountAmount: discAmount,
          taxAmount: taxAmt,
          netAmount: net,
        };
      });
    });
  };

  const handleRemoveRow = useCallback((index: number) => {
    setBillItems((prev) => prev.filter((_, idx) => idx !== index));
    setSelectedRowIndex(null);
  }, []);

  // Customer Selection & Lookup
  const handleSelectCustomer = (c: Customer) => {
    setCustomerPhone(c.phone);
    setCustomerName(c.name);
    setCustomerEmail(c.email || "");
    setCustomerGstin(c.gstin || "");
    setCustomerType(c.customerType || "Retail");
    setCustomerAddress(c.address || "");
    setCustomerCity(c.city || "");
    setCustomerState(c.state || "");
    setCustomerPincode(c.pincode || "");
    setCustomerPoints(c.points || 0);
    setCustomerCreditLimit(c.creditLimit || 0);
    setCustomerCredit(c.creditBalance || 0);
    setCustomerDob(c.dob || "");
    setCustomerNotes(c.notes || "");
    setIsCustomerModalOpen(false);
  };

  const handleCustomerPhoneChange = (phone: string) => {
    setCustomerPhone(phone);
    const existing = customers.find((c) => c.phone === phone);
    if (existing) {
      handleSelectCustomer(existing);
    } else if (phone === "9999999999") {
      setCustomerName("Walk-In Customer");
      setCustomerEmail("");
      setCustomerGstin("");
      setCustomerType("Retail");
      setCustomerAddress("");
      setCustomerCity("");
      setCustomerState("");
      setCustomerPincode("");
      setCustomerPoints(0);
      setCustomerCreditLimit(0);
      setCustomerCredit(0);
      setCustomerDob("");
      setCustomerNotes("");
    }
  };

  const handleSaveCustomerProfile = () => {
    const updatedCustomer: Customer = {
      id: "cust_" + (customerPhone || "customer"),
      name: customerName.trim() || "Customer",
      phone: customerPhone.trim() || "9999999999",
      email: customerEmail.trim(),
      gstin: customerGstin.trim(),
      customerType: customerType,
      address: customerAddress.trim(),
      city: customerCity.trim(),
      state: customerState.trim(),
      pincode: customerPincode.trim(),
      points: customerPoints,
      creditLimit: customerCreditLimit,
      creditBalance: customerCredit,
      dob: customerDob,
      notes: customerNotes.trim(),
    };

    saveLocalCustomer(updatedCustomer);
    setCustomers(getLocalCustomers());
    setIsCustomerModalOpen(false);
  };

  const handleResetBill = useCallback(() => {
    setBillItems([]);
    setSelectedRowIndex(null);
    setCustomerPhone("9999999999");
    setCustomerName("Walk-In Customer");
    setCustomerEmail("");
    setCustomerGstin("");
    setCustomerType("Retail");
    setCustomerAddress("");
    setCustomerCity("");
    setCustomerState("");
    setCustomerPincode("");
    setCustomerPoints(0);
    setCustomerCreditLimit(0);
    setCustomerCredit(0);
    setCustomerDob("");
    setCustomerNotes("");
    setBillDiscountPercent(0);
    setBillDiscountAmount(0);
    const yr = new Date().getFullYear().toString().slice(-2);
    const rnd = Math.floor(1000 + Math.random() * 9000);
    setBillNo(`RE-${yr}-${rnd}`);
    scanInputRef.current?.focus();
  }, []);

  // Hold & Recall Bill
  const handleHoldBill = useCallback(() => {
    const s = stateRef.current;
    if (s.billItems.length === 0) {
      alert("No items in bill to hold!");
      return;
    }
    const rnd = Math.floor(1000 + Math.random() * 9000);
    const newHold: HeldBill = {
      id: "HOLD-" + rnd,
      heldAt: new Date().toLocaleTimeString(),
      customerName: s.customerName,
      customerPhone: s.customerPhone,
      customerGstin: s.customerGstin,
      customerAddress: s.customerAddress,
      items: s.billItems,
      itemCount: s.billItems.length,
      totalAmount: s.grandTotal,
    };
    saveHeldBill(newHold);
    setHeldBills(getHeldBills());
    handleResetBill();
    alert(`Bill held in queue. Code: ${newHold.id}. Press [F4] to recall anytime.`);
  }, [handleResetBill]);

  const handleRecallBill = (held: HeldBill) => {
    if (billItems.length > 0 && !confirm("Current items on screen will be replaced. Proceed?")) {
      return;
    }
    setBillItems(held.items);
    setCustomerName(held.customerName);
    setCustomerPhone(held.customerPhone);
    setCustomerGstin(held.customerGstin || "");
    setCustomerAddress(held.customerAddress || "");
    removeHeldBill(held.id);
    setHeldBills(getHeldBills());
    setIsHeldBillsModalOpen(false);
  };

  // Open Tender / Settlement Modal
  const openTenderModal = useCallback(() => {
    const currentTotal = stateRef.current.grandTotal;
    setCashTendered(currentTotal.toFixed(2));
    setCardAmount("");
    setUpiAmount("");
    setCreditAmount("");
    setPaymentMode("CASH");
    setIsTenderModalOpen(true);
  }, []);

  // Tender Calculations
  const numCashTendered = parseFloat(cashTendered) || 0;
  const numCard = parseFloat(cardAmount) || 0;
  const numUpi = parseFloat(upiAmount) || 0;
  const numCredit = parseFloat(creditAmount) || 0;

  const totalPaid = paymentMode === "CASH" 
    ? numCashTendered 
    : paymentMode === "CARD" 
    ? numCard || grandTotal 
    : paymentMode === "UPI"
    ? numUpi || grandTotal
    : paymentMode === "CREDIT"
    ? numCredit || grandTotal
    : (numCashTendered + numCard + numUpi + numCredit);

  const changeToReturn = Math.max(0, totalPaid - grandTotal);
  const balanceDue = Math.max(0, grandTotal - totalPaid);

  // Complete Sale Execution
  const handleFinalizeBill = async () => {
    if (billItems.length === 0 || isProcessing) return;

    if (totalPaid < grandTotal && paymentMode !== "CREDIT") {
      alert(`Insufficient payment! Balance due: ₹${balanceDue.toFixed(2)}`);
      return;
    }

    setIsProcessing(true);
    try {
      const sale = await processRetailSale(
        billItems,
        { 
          name: customerName, 
          phone: customerPhone,
          email: customerEmail,
          gstin: customerGstin,
          address: customerAddress ? `${customerAddress}, ${customerCity}` : "",
          customerType: customerType
        },
        {
          mode: paymentMode,
          cashTendered: paymentMode === "CASH" ? (numCashTendered || grandTotal) : numCashTendered,
          cardAmount: paymentMode === "CARD" ? (numCard || grandTotal) : numCard,
          upiAmount: paymentMode === "UPI" ? (numUpi || grandTotal) : numUpi,
          creditAmount: paymentMode === "CREDIT" ? (numCredit || grandTotal) : numCredit,
          changeReturn: changeToReturn,
        },
        appliedBillDiscount,
        user?.email || "stacklyn96@gmail.com"
      );

      // Save customer if new or updated
      saveLocalCustomer({
        id: "cust_" + customerPhone,
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
        gstin: customerGstin,
        customerType: customerType,
        address: customerAddress,
        city: customerCity,
        state: customerState,
        pincode: customerPincode,
        creditLimit: customerCreditLimit,
        creditBalance: customerCredit,
        points: (customerPoints || 0) + Math.floor(grandTotal / 10),
        dob: customerDob,
        notes: customerNotes,
      });

      setLastInvoice(sale);
      setIsTenderModalOpen(false);
      handleResetBill();
      await loadData();
    } catch {
      alert("Error finalizing sale transaction.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Quick Add SKU
  const handleSaveQuickSku = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSku.name || !newSku.price) return;

    const priceNum = parseFloat(newSku.price);
    const purNum = newSku.purchaseRate ? parseFloat(newSku.purchaseRate) : Math.round(priceNum * 0.8 * 100) / 100;

    const added = await addProduct({
      name: newSku.name,
      purchaseRate: purNum,
      price: priceNum,
      mrp: priceNum * 1.1,
      stock: parseInt(newSku.stock) || 50,
      category: newSku.category,
      barcode: newSku.barcode || "SKU-" + Math.floor(1000 + Math.random() * 9000),
      unit: "PCS",
      taxPercent: 5,
    });

    await loadData();
    setIsQuickAddModalOpen(false);
    handleAddItemToBill(added, 1);
    setNewSku({ name: "", purchaseRate: "", price: "", stock: "50", barcode: "", category: "Beverages" });
  };

  // Global Keyboard Shortcuts (GoFrugal Style: F1-F9, Del, Esc)
  const loadRecentSalesForReprint = async () => {
    const sales = await fetchSales();
    // Get last 20 sales only
    setRecentSales(sales.slice(0, 20));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (e.key === "F1") {
        e.preventDefault();
        setIsItemLookupOpen(true);
      } else if (e.key === "F2") {
        e.preventDefault();
        setIsCustomerModalOpen(true);
      } else if (e.key === "F3") {
        e.preventDefault();
        handleHoldBill();
      } else if (e.key === "F4") {
        e.preventDefault();
        setIsHeldBillsModalOpen(true);
      } else if (e.key === "F5") {
        e.preventDefault();
        handleResetBill();
      } else if (e.key === "F6") {
        e.preventDefault();
        if (s.billItems.length > 0) openTenderModal();
      } else if (e.key === "F7") {
        e.preventDefault();
        setIsBillDiscountModalOpen(true);
      } else if (e.key === "F8") {
        e.preventDefault();
        setIsQuickAddModalOpen(true);
      } else if (e.key === "F9") {
        e.preventDefault();
        loadRecentSalesForReprint();
        setIsReprintModalOpen(true);
      } else if (e.key === "Escape") {
        setIsTenderModalOpen(false);
        setIsItemLookupOpen(false);
        setIsCustomerModalOpen(false);
        setIsHeldBillsModalOpen(false);
        setIsBillDiscountModalOpen(false);
        setIsQuickAddModalOpen(false);
        setIsReprintModalOpen(false);
        setLastInvoice(null);
        scanInputRef.current?.focus();
      } else if (e.key === "Delete" && s.selectedRowIndex !== null) {
        if (!s.isTenderModalOpen && !s.isItemLookupOpen && !s.isCustomerModalOpen) {
          handleRemoveRow(s.selectedRowIndex);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleHoldBill, handleResetBill, openTenderModal, handleRemoveRow]);

  return (
    <div className="h-full flex flex-col justify-between max-w-[1600px] mx-auto text-slate-100 font-sans select-none">
      
      {/* 1. TOP HEADER: GoFrugal RetailEasy Billing Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 mb-3 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          
          {/* Bill No, Counter, Date */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-2 py-1 rounded-md font-bold text-sm">
                {billNo}
              </span>
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wide">
                RETAILEASY POS • COUNTER 01
              </span>
            </div>
            <span className="text-slate-700">|</span>
            <div className="text-slate-400 font-mono">
              {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          {/* Customer Quick Lookup [F2] */}
          <div className="flex items-center gap-3 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Phone className="w-3.5 h-3.5 text-cyan-400" />
              <input
                type="text"
                placeholder="Mobile (F2)"
                value={customerPhone}
                onChange={(e) => handleCustomerPhoneChange(e.target.value)}
                className="bg-transparent text-xs font-mono text-slate-100 w-28 focus:outline-none focus:text-cyan-400"
              />
            </div>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-semibold text-slate-200 truncate max-w-[130px]">
                {customerName}
              </span>
              {customerPoints > 0 && (
                <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 rounded font-mono">
                  {customerPoints} pts
                </span>
              )}
            </div>
            <button
              onClick={() => setIsCustomerModalOpen(true)}
              className="text-[10px] font-mono bg-slate-800 hover:bg-slate-700 text-cyan-400 px-2 py-0.5 rounded transition"
            >
              Edit [F2]
            </button>
          </div>

          {/* Cashier & Status */}
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>CASHIER: {user?.email?.split("@")[0]}</span>
            </div>
            {heldBills.length > 0 && (
              <button
                onClick={() => setIsHeldBillsModalOpen(true)}
                className="bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold animate-bounce flex items-center gap-1"
              >
                <PauseCircle className="w-3 h-3" />
                {heldBills.length} HELD BILLS [F4]
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. FAST SCANNER & ITEM SEARCH BAR (Keyboard Optimized) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 mb-3 shadow-md relative">
        <form onSubmit={handleScanSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-cyan-400 font-mono text-xs">
              <Barcode className="w-4 h-4" />
              <span>SCAN / SEARCH:</span>
            </div>
            <input
              ref={scanInputRef}
              type="text"
              placeholder="Scan barcode or type item name... (Press Enter to Add)"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              className="w-full pl-36 pr-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-lg text-sm text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/40"
            />
          </div>

          {/* Quick Qty Box */}
          <div className="flex items-center bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5">
            <span className="text-xs font-mono text-slate-400 mr-2">QTY:</span>
            <input
              type="number"
              min="1"
              max="999"
              value={quickQty}
              onChange={(e) => setQuickQty(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-12 bg-transparent text-sm font-bold font-mono text-cyan-400 focus:outline-none text-center"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs font-mono flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            ADD ITEM [Enter]
          </button>

          <button
            type="button"
            onClick={() => setIsItemLookupOpen(true)}
            className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono flex items-center gap-1.5 transition"
            title="Browse Catalog (F1)"
          >
            <Search className="w-3.5 h-3.5" />
            CATALOG [F1]
          </button>
        </form>

        {/* Live Search Autocomplete Popup */}
        {isSearchDropdownOpen && matchingProducts.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-40 mt-1 bg-slate-900 border border-cyan-500/40 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl">
            <div className="px-3 py-1.5 bg-slate-950 text-[11px] font-mono text-slate-400 flex justify-between border-b border-slate-800">
              <span>Matching Items in Database</span>
              <span>Click or Press Enter to Select</span>
            </div>
            <div className="divide-y divide-slate-800/60 max-h-60 overflow-y-auto">
              {matchingProducts.map((p) => {
                const purRate = p.purchaseRate ?? 0;
                const sellingRate = p.price;
                const unitProfit = sellingRate - purRate;

                return (
                  <div
                    key={p.id}
                    onClick={() => handleAddItemToBill(p, quickQty)}
                    className="p-3 hover:bg-slate-800/80 cursor-pointer flex items-center justify-between transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                        {p.barcode}
                      </span>
                      <div>
                        <div className="text-xs font-semibold text-slate-100">{p.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          Stock: {p.stock} {p.unit || "PCS"}
                        </div>
                      </div>
                    </div>

                    {/* Product Card Margins: Pur Rate, Selling Rate, Profit */}
                    <div className="flex items-center gap-5 text-right font-mono">
                      <div>
                        <div className="text-[9px] uppercase text-slate-400 font-semibold tracking-wide">Pur Rate</div>
                        <div className="text-xs font-bold text-amber-400">₹{purRate.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase text-slate-400 font-semibold tracking-wide">Selling Rate</div>
                        <div className="text-xs font-bold text-slate-100">₹{sellingRate.toFixed(2)}</div>
                      </div>
                      <div className="bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
                        <div className="text-[9px] uppercase text-emerald-400 font-semibold tracking-wide">Profit</div>
                        <div className="text-xs font-black text-emerald-400">₹{unitProfit.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 2.5 SELECTED PRODUCT CARD (Pur Rate, Selling Rate, Profit) */}
      {selectedItem && (
        <div className="bg-slate-900 border border-cyan-500/40 rounded-xl p-3 mb-3 shadow-lg flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-100 text-sm">{selectedItem.name}</span>
                <span className="font-mono text-[11px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded font-semibold">
                  {selectedItem.barcode}
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                Selected in bill • {selectedItem.quantity} {selectedItem.unit}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-5 sm:gap-6 font-mono">
            <div className="text-right">
              <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider block">Pur Rate</span>
              <span className="text-sm sm:text-base font-bold text-amber-400">
                ₹{selectedItemPurRate.toFixed(2)}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider block">Selling Rate</span>
              <span className="text-sm sm:text-base font-bold text-slate-100">
                ₹{selectedItem.rate.toFixed(2)}
              </span>
            </div>

            <div className="text-right bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-lg">
              <span className="text-[10px] uppercase text-emerald-400 font-semibold tracking-wider block">Profit</span>
              <span className="text-sm sm:text-base font-black text-emerald-400">
                ₹{(selectedItem.rate - selectedItemPurRate).toFixed(2)}
                <span className="text-[10px] text-emerald-500 font-normal ml-1">
                  ({selectedItem.rate > 0 ? (((selectedItem.rate - selectedItemPurRate) / selectedItem.rate) * 100).toFixed(1) : 0}%)
                </span>
              </span>
            </div>

            <button
              type="button"
              onClick={() => setSelectedRowIndex(null)}
              className="text-slate-500 hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-800 transition"
              title="Close Product Card"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 3. MAIN TABULAR BILLING GRID (GoFrugal RetailEasy Style) */}
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col min-h-[320px]">
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left border-collapse font-mono text-xs">
            {/* Header */}
            <thead className="sticky top-0 bg-slate-950 border-b border-slate-800 text-[11px] text-slate-400 font-semibold z-10">
              <tr>
                <th className="p-2.5 w-10 text-center">#</th>
                <th className="p-2.5 w-24">Barcode</th>
                <th className="p-2.5">Item Description</th>
                <th className="p-2.5 w-16 text-center">Loc</th>
                <th className="p-2.5 w-16 text-right">Avl</th>
                <th className="p-2.5 w-24 text-center">Qty</th>
                <th className="p-2.5 w-14 text-center">Unit</th>
                <th className="p-2.5 w-20 text-right">MRP</th>
                <th className="p-2.5 w-20 text-right">Rate</th>
                <th className="p-2.5 w-20 text-center">Disc%</th>
                <th className="p-2.5 w-16 text-right">Tax%</th>
                <th className="p-2.5 w-24 text-right">Net Amount</th>
                <th className="p-2.5 w-12 text-center">Del</th>
              </tr>
            </thead>

            {/* Rows */}
            <tbody className="divide-y divide-slate-800/60">
              {billItems.length === 0 ? (
                <tr>
                  <td colSpan={13} className="p-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <Barcode className="w-12 h-12 mb-3 stroke-1 text-slate-600 animate-pulse" />
                      <p className="text-sm font-semibold text-slate-400">RetailEasy Billing Grid Ready</p>
                      <p className="text-xs text-slate-600 mt-1">
                        Scan items with barcode gun, or press <span className="text-cyan-400 font-bold">[F1]</span> to browse catalog
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                billItems.map((item, index) => {
                  const isSelected = selectedRowIndex === index;
                  return (
                    <tr
                      key={item.id + index}
                      onClick={() => setSelectedRowIndex(index)}
                      className={`transition-colors cursor-pointer ${
                        isSelected 
                          ? "bg-cyan-500/15 border-l-4 border-l-cyan-400" 
                          : "hover:bg-slate-800/50"
                      }`}
                    >
                      {/* S.No */}
                      <td className="p-2.5 text-center text-slate-500">{index + 1}</td>
                      
                      {/* Barcode */}
                      <td className="p-2.5 font-semibold text-cyan-400">{item.barcode}</td>

                      {/* Name */}
                      <td className="p-2.5 font-sans font-medium text-slate-100">
                        {item.name}
                      </td>

                      {/* Rack Location */}
                      <td className="p-2.5 text-center text-slate-500 text-[10px]">
                        {products.find(p => p.id === item.id)?.rackLocation || "A-01"}
                      </td>

                      {/* Available Stock */}
                      <td className="p-2.5 text-right text-slate-400 font-semibold">{item.stock}</td>

                      {/* Editable Quantity */}
                      <td className="p-2.5 text-center">
                        <div className="inline-flex items-center bg-slate-950 border border-slate-700 rounded">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); updateRowQuantity(index, item.quantity - 1); }}
                            className="px-1.5 py-0.5 hover:bg-slate-800 text-slate-400"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            max={item.stock}
                            value={item.quantity}
                            onChange={(e) => updateRowQuantity(index, parseInt(e.target.value) || 1)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-10 bg-transparent text-center font-bold text-slate-100 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); updateRowQuantity(index, item.quantity + 1); }}
                            className="px-1.5 py-0.5 hover:bg-slate-800 text-slate-400"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* Unit */}
                      <td className="p-2.5 text-center text-slate-400 text-[11px]">{item.unit}</td>

                      {/* MRP */}
                      <td className="p-2.5 text-right text-slate-500 line-through">₹{item.mrp.toFixed(2)}</td>

                      {/* Rate */}
                      <td className="p-2.5 text-right font-semibold text-slate-200">₹{item.rate.toFixed(2)}</td>

                      {/* Disc % */}
                      <td className="p-2.5 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.discountPercent}
                          onChange={(e) => updateRowDiscount(index, parseFloat(e.target.value) || 0)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-12 bg-slate-950 border border-slate-700 rounded px-1 text-center text-amber-400 focus:outline-none"
                        />
                      </td>

                      {/* Tax % */}
                      <td className="p-2.5 text-right text-slate-400">{item.taxPercent}%</td>

                      {/* Net Amount */}
                      <td className="p-2.5 text-right font-bold text-emerald-400">₹{item.netAmount.toFixed(2)}</td>

                      {/* Delete Row */}
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleRemoveRow(index); }}
                          className="text-slate-500 hover:text-red-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 4. FINANCIAL SUMMARY & TOTALS FOOTER (RetailEasy Grand Total Box) */}
        <div className="bg-slate-950 border-t border-slate-800 p-3 flex flex-wrap items-center justify-between gap-4">
          
          {/* Item Count & Savings */}
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
              <span className="text-slate-500">Items: </span>
              <span className="font-bold text-slate-100">{billItems.length}</span>
              <span className="text-slate-500 ml-2">Qty: </span>
              <span className="font-bold text-cyan-400">{totalQtyCount}</span>
            </div>

            <div className="text-slate-400">
              <span>Gross: </span>
              <span className="text-slate-200 font-semibold">₹{grossSubtotal.toFixed(2)}</span>
            </div>

            <div className="text-slate-400">
              <span>Discounts: </span>
              <span className="text-amber-400 font-semibold">-₹{(totalItemDiscount + appliedBillDiscount).toFixed(2)}</span>
            </div>

            <div className="text-slate-400">
              <span>GST (Tax): </span>
              <span className="text-slate-300 font-semibold">₹{totalTax.toFixed(2)} (incl.)</span>
            </div>

            <div className="text-slate-400">
              <span>Profit: </span>
              <span className={`font-semibold ${grossProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                ₹{grossProfit.toFixed(2)}
              </span>
            </div>

            {roundOff !== 0 && (
              <div className="text-slate-500 text-[11px]">
                <span>Round: {roundOff > 0 ? `+${roundOff}` : roundOff}</span>
              </div>
            )}
          </div>

          {/* Large Net Payable Display & Pay Button */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">NET PAYABLE TOTAL</div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 tracking-tight">
                ₹{grandTotal.toFixed(2)}
              </div>
            </div>

            <button
              type="button"
              onClick={openTenderModal}
              disabled={billItems.length === 0}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-xl text-sm font-mono flex items-center gap-2 shadow-xl shadow-emerald-500/20 transition transform active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
            >
              <Banknote className="w-5 h-5" />
              TENDER / SAVE [F6]
            </button>
          </div>
        </div>
      </div>

      {/* 5. GOFRUGAL RETAIL EASY FUNCTION KEYS BAR (STICKY BOTTOM) */}
      <div className="mt-3 bg-slate-900 border border-slate-800 rounded-xl p-2 shadow-lg">
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 text-center text-[10px] font-mono font-bold">
          <button
            onClick={() => setIsItemLookupOpen(true)}
            className="p-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 hover:border-cyan-500/50 transition flex flex-col items-center"
          >
            <span className="text-cyan-400">[F1]</span>
            <span className="text-[9px] text-slate-400 truncate">ITEM LOOKUP</span>
          </button>

          <button
            onClick={() => setIsCustomerModalOpen(true)}
            className="p-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 hover:border-cyan-500/50 transition flex flex-col items-center"
          >
            <span className="text-cyan-400">[F2]</span>
            <span className="text-[9px] text-slate-400 truncate">CUSTOMER</span>
          </button>

          <button
            onClick={handleHoldBill}
            className="p-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 hover:border-cyan-500/50 transition flex flex-col items-center"
          >
            <span className="text-amber-400">[F3]</span>
            <span className="text-[9px] text-slate-400 truncate">HOLD BILL</span>
          </button>

          <button
            onClick={() => setIsHeldBillsModalOpen(true)}
            className="p-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 hover:border-cyan-500/50 transition flex flex-col items-center"
          >
            <span className="text-amber-400">[F4]</span>
            <span className="text-[9px] text-slate-400 truncate">RECALL BILL</span>
          </button>

          <button
            onClick={handleResetBill}
            className="p-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 hover:border-cyan-500/50 transition flex flex-col items-center"
          >
            <span className="text-red-400">[F5]</span>
            <span className="text-[9px] text-slate-400 truncate">NEW BILL</span>
          </button>

          <button
            onClick={openTenderModal}
            disabled={billItems.length === 0}
            className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded border border-emerald-500/30 transition flex flex-col items-center disabled:opacity-40"
          >
            <span className="text-emerald-300 font-black">[F6]</span>
            <span className="text-[9px] text-emerald-200 truncate">TENDER / SAVE</span>
          </button>

          <button
            onClick={() => setIsBillDiscountModalOpen(true)}
            className="p-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 hover:border-cyan-500/50 transition flex flex-col items-center"
          >
            <span className="text-purple-400">[F7]</span>
            <span className="text-[9px] text-slate-400 truncate">BILL DISCOUNT</span>
          </button>

          <button
            onClick={() => setIsQuickAddModalOpen(true)}
            className="p-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 hover:border-cyan-500/50 transition flex flex-col items-center"
          >
            <span className="text-blue-400">[F8]</span>
            <span className="text-[9px] text-slate-400 truncate">ADD SKU</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. GOFRUGAL TENDER & SETTLEMENT MODAL (F6) */}
      {/* ========================================================================= */}
      {isTenderModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            
            {/* Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Banknote className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold font-mono text-sm text-slate-100">
                  BILL SETTLEMENT & TENDER (F6)
                </h3>
              </div>
              <button
                onClick={() => setIsTenderModalOpen(false)}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              
              {/* Grand Total Banner */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400 font-mono">Invoice Bill: {billNo}</div>
                  <div className="text-xs text-slate-400 font-mono">Customer: {customerName}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400 font-mono uppercase">Grand Total Amount</div>
                  <div className="text-3xl font-black font-mono text-emerald-400">₹{grandTotal.toFixed(2)}</div>
                </div>
              </div>

              {/* Payment Mode Selection Buttons */}
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-2 uppercase">
                  Select Tender Mode:
                </label>
                <div className="grid grid-cols-5 gap-2 font-mono text-xs">
                  {[
                    { id: "CASH" as const, label: "Cash [A]", icon: Banknote },
                    { id: "CARD" as const, label: "Card [C]", icon: CreditCard },
                    { id: "UPI" as const, label: "UPI/QR [U]", icon: QrCode },
                    { id: "CREDIT" as const, label: "Credit [D]", icon: Wallet },
                    { id: "SPLIT" as const, label: "Split [S]", icon: Layers },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = paymentMode === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMode(m.id)}
                        className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition ${
                          isSelected
                            ? "bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-lg shadow-cyan-500/20"
                            : "bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[10px]">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tender Inputs based on mode */}
              {paymentMode === "CASH" && (
                <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Cash Tendered by Customer (₹):</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      autoFocus
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-xl font-bold font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* Fast Currency Denominations (INR) */}
                  <div className="flex gap-2 font-mono text-xs">
                    {[50, 100, 200, 500, 1000, 2000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setCashTendered(amt.toString())}
                        className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-[11px]"
                      >
                        ₹{amt}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setCashTendered(grandTotal.toFixed(2))}
                      className="flex-1 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg text-[11px] font-bold"
                    >
                      Exact
                    </button>
                  </div>
                </div>
              )}

              {paymentMode === "CARD" && (
                <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Card Amount to Charge:</span>
                    <span className="font-bold text-slate-100">₹{grandTotal.toFixed(2)}</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Card Approval / Ref No. (Optional)"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              )}

              {paymentMode === "UPI" && (
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between font-mono text-xs">
                  <div>
                    <div className="font-bold text-slate-100">Dynamic UPI QR Code</div>
                    <div className="text-slate-400 text-[11px] mt-1">Ask customer to scan with any UPI app</div>
                  </div>
                  <div className="w-16 h-16 bg-white p-1 rounded-lg flex items-center justify-center">
                    <QrCode className="w-14 h-14 text-slate-950" />
                  </div>
                </div>
              )}

              {paymentMode === "SPLIT" && (
                <div className="space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400">Cash Amount:</label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={cashTendered}
                        onChange={(e) => setCashTendered(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-100 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400">Card Amount:</label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={cardAmount}
                        onChange={(e) => setCardAmount(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-100 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400">UPI Amount:</label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={upiAmount}
                        onChange={(e) => setUpiAmount(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-100 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400">Credit / Due:</label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={creditAmount}
                        onChange={(e) => setCreditAmount(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-100 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Change / Balance Calculation */}
              <div className="grid grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono">
                <div>
                  <div className="text-xs text-slate-400 uppercase">Change to Return</div>
                  <div className="text-2xl font-bold text-amber-400">
                    ₹{changeToReturn.toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400 uppercase">Balance Due</div>
                  <div className={`text-2xl font-bold ${balanceDue > 0 ? "text-red-400" : "text-slate-500"}`}>
                    ₹{balanceDue.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Save & Print Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTenderModalOpen(false)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-bold rounded-xl transition"
                >
                  Cancel [Esc]
                </button>
                <button
                  type="button"
                  onClick={handleFinalizeBill}
                  disabled={isProcessing || (totalPaid < grandTotal && paymentMode !== "CREDIT")}
                  className="flex-2 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black font-mono text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition disabled:opacity-50"
                >
                  {isProcessing ? (
                    <span>FINALIZING INVOICE...</span>
                  ) : (
                    <>
                      <Printer className="w-4 h-4" />
                      SAVE & PRINT BILL [F6]
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. ITEM LOOKUP MODAL (F1) */}
      {/* ========================================================================= */}
      {isItemLookupOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold font-mono text-sm text-slate-100">
                  PRODUCT CATALOG LOOKUP [F1]
                </h3>
              </div>
              <button onClick={() => setIsItemLookupOpen(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 divide-y divide-slate-800">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-slate-950 text-slate-400 text-[11px] sticky top-0">
                  <tr>
                    <th className="p-2">Barcode</th>
                    <th className="p-2">Product Name</th>
                    <th className="p-2 text-right">Purchase Rate</th>
                    <th className="p-2 text-right">Selling Rate</th>
                    <th className="p-2 text-right">Profit</th>
                    <th className="p-2 text-right">Stock</th>
                    <th className="p-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/60 transition">
                      <td className="p-2 font-bold text-cyan-400">{p.barcode}</td>
                      <td className="p-2 font-sans font-medium text-slate-100">{p.name}</td>
                      <td className="p-2 text-right text-amber-400">
                        {p.purchaseRate !== undefined ? `₹${p.purchaseRate.toFixed(2)}` : "N/A"}
                      </td>
                      <td className="p-2 text-right font-bold text-emerald-400">₹{p.price.toFixed(2)}</td>
                      <td className="p-2 text-right font-semibold text-cyan-400">
                        {p.purchaseRate !== undefined ? `₹${(p.price - p.purchaseRate).toFixed(2)}` : "N/A"}
                      </td>
                      <td className="p-2 text-right text-slate-300">{p.stock}</td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            handleAddItemToBill(p, 1);
                            setIsItemLookupOpen(false);
                          }}
                          className="px-2 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded text-[11px]"
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. CUSTOMER MODAL (F2) — Expanded with Full Details */}
      {/* ========================================================================= */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
              <h3 className="font-bold font-mono text-sm text-slate-100 flex items-center gap-2">
                <User className="w-4 h-4 text-cyan-400" />
                CUSTOMER DETAILS [F2]
              </h3>
              <button onClick={() => setIsCustomerModalOpen(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-5 font-mono text-xs">

              {/* Quick Customer Search & Select */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <label className="text-slate-500 block mb-1.5 text-[10px] uppercase tracking-wider">Quick Select Existing Customer</label>
                <input
                  type="text"
                  placeholder="Search by name, phone, or GSTIN..."
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500 mb-2"
                />
                {customerSearchQuery.trim().length > 0 && (
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {customers
                      .filter(c => {
                        const q = customerSearchQuery.toLowerCase();
                        return c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.gstin && c.gstin.toLowerCase().includes(q));
                      })
                      .map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => { handleSelectCustomer(c); setCustomerSearchQuery(""); }}
                          className="w-full text-left px-3 py-2 bg-slate-800/60 hover:bg-cyan-500/10 border border-slate-700/50 hover:border-cyan-500/30 rounded-lg flex items-center justify-between transition"
                        >
                          <div>
                            <span className="font-semibold text-slate-200">{c.name}</span>
                            <span className="text-slate-500 ml-2">{c.phone}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {c.customerType && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                                c.customerType === "VIP" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                                c.customerType === "Wholesale" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                c.customerType === "Corporate" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                                "bg-slate-700 text-slate-400 border-slate-600"
                              }`}>{c.customerType}</span>
                            )}
                            {(c.points || 0) > 0 && <span className="text-amber-400 text-[10px]">{c.points} pts</span>}
                          </div>
                        </button>
                      ))
                    }
                  </div>
                )}
              </div>

              {/* Section 1: Primary Info */}
              <div>
                <div className="text-[10px] text-cyan-400 uppercase tracking-wider mb-2 font-bold">Primary Information</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Mobile Phone *</label>
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={(e) => handleCustomerPhoneChange(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                      placeholder="10-digit mobile"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Full Name *</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                      placeholder="Customer name"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Email Address</label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Customer Type</label>
                    <select
                      value={customerType}
                      onChange={(e) => setCustomerType(e.target.value as "Retail" | "Wholesale" | "VIP" | "Corporate")}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="Retail">Retail</option>
                      <option value="Wholesale">Wholesale</option>
                      <option value="VIP">VIP</option>
                      <option value="Corporate">Corporate</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: GST & Tax */}
              <div>
                <div className="text-[10px] text-cyan-400 uppercase tracking-wider mb-2 font-bold">GST & Tax Details</div>
                <div>
                  <label className="text-slate-400 block mb-1">GSTIN (15-char)</label>
                  <input
                    type="text"
                    maxLength={15}
                    value={customerGstin}
                    onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500 uppercase"
                    placeholder="e.g. 29ABCDE1234F1Z5"
                  />
                </div>
              </div>

              {/* Section 3: Address */}
              <div>
                <div className="text-[10px] text-cyan-400 uppercase tracking-wider mb-2 font-bold">Address & Location</div>
                <div className="space-y-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Street Address</label>
                    <input
                      type="text"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                      placeholder="Door No, Street, Landmark"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-slate-400 block mb-1">City</label>
                      <input
                        type="text"
                        value={customerCity}
                        onChange={(e) => setCustomerCity(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">State</label>
                      <input
                        type="text"
                        value={customerState}
                        onChange={(e) => setCustomerState(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                        placeholder="State"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Pincode</label>
                      <input
                        type="text"
                        maxLength={6}
                        value={customerPincode}
                        onChange={(e) => setCustomerPincode(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                        placeholder="560001"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: Loyalty & Credit */}
              <div>
                <div className="text-[10px] text-cyan-400 uppercase tracking-wider mb-2 font-bold">Loyalty & Credit</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
                    <span className="text-slate-500 block text-[10px]">LOYALTY POINTS</span>
                    <span className="text-amber-400 font-bold text-sm">{customerPoints} pts</span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
                    <span className="text-slate-500 block text-[10px]">CREDIT LIMIT</span>
                    <span className="text-slate-200 font-bold text-sm">₹{customerCreditLimit.toFixed(0)}</span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
                    <span className="text-slate-500 block text-[10px]">CREDIT BALANCE</span>
                    <span className={`font-bold text-sm ${customerCredit > 0 ? "text-red-400" : "text-emerald-400"}`}>₹{customerCredit.toFixed(2)}</span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
                    <span className="text-slate-500 block text-[10px]">AVAILABLE CREDIT</span>
                    <span className="text-emerald-400 font-bold text-sm">₹{Math.max(0, customerCreditLimit - customerCredit).toFixed(0)}</span>
                  </div>
                </div>
              </div>

              {/* Section 5: Personal & Notes */}
              <div>
                <div className="text-[10px] text-cyan-400 uppercase tracking-wider mb-2 font-bold">Personal & Notes</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={customerDob}
                      onChange={(e) => setCustomerDob(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Internal Notes</label>
                    <input
                      type="text"
                      value={customerNotes}
                      onChange={(e) => setCustomerNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
                      placeholder="e.g. VIP — always give 5% extra"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCustomerProfile}
                className="flex-2 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl transition text-xs flex items-center justify-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                Save & Apply Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. HELD BILLS MODAL (F4) */}
      {/* ========================================================================= */}
      {isHeldBillsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold font-mono text-sm text-slate-100 flex items-center gap-2">
                <PauseCircle className="w-4 h-4 text-amber-400" />
                SUSPENDED & HELD BILLS [F4]
              </h3>
              <button onClick={() => setIsHeldBillsModalOpen(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            {heldBills.length === 0 ? (
              <div className="p-8 text-center text-slate-500 font-mono text-xs">
                No bills currently held in queue.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto">
                {heldBills.map((b) => (
                  <div
                    key={b.id}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between font-mono text-xs"
                  >
                    <div>
                      <div className="font-bold text-cyan-400">{b.id} • {b.heldAt}</div>
                      <div className="text-slate-300 text-xs mt-0.5">{b.customerName} ({b.customerPhone})</div>
                      <div className="text-[10px] text-slate-500">{b.itemCount} items in cart</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-emerald-400">₹{b.totalAmount.toFixed(2)}</span>
                      <button
                        type="button"
                        onClick={() => handleRecallBill(b)}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs"
                      >
                        Resume
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 10. BILL LEVEL DISCOUNT MODAL (F7) */}
      {/* ========================================================================= */}
      {isBillDiscountModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl font-mono text-xs">
            <h3 className="font-bold text-sm text-slate-100 mb-4 flex items-center gap-2">
              <Percent className="w-4 h-4 text-purple-400" />
              APPLY BILL DISCOUNT (F7)
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-slate-400 block mb-1">Discount by Percentage (%):</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={billDiscountPercent || ""}
                  onChange={(e) => {
                    setBillDiscountPercent(parseFloat(e.target.value) || 0);
                    setBillDiscountAmount(0);
                  }}
                  className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">OR Flat Discount Amount (₹):</label>
                <input
                  type="number"
                  min="0"
                  value={billDiscountAmount || ""}
                  onChange={(e) => {
                    setBillDiscountAmount(parseFloat(e.target.value) || 0);
                    setBillDiscountPercent(0);
                  }}
                  className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100"
                />
              </div>

              <button
                type="button"
                onClick={() => setIsBillDiscountModalOpen(false)}
                className="w-full py-2.5 bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold rounded-xl"
              >
                Apply Discount
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 11. QUICK ADD SKU MODAL (F8) */}
      {/* ========================================================================= */}
      {isQuickAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl font-mono text-xs">
            <h3 className="font-bold text-sm text-slate-100 mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-400" />
              QUICK REGISTER SKU (F8)
            </h3>

            <form onSubmit={handleSaveQuickSku} className="space-y-3">
              <div>
                <label className="text-slate-400 block mb-1">Product Description:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fresh Orange Juice 500ml"
                  value={newSku.name}
                  onChange={(e) => setNewSku({ ...newSku, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Pur Rate (₹):</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Cost price"
                    value={newSku.purchaseRate}
                    onChange={(e) => setNewSku({ ...newSku, purchaseRate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Selling Rate (₹) *:</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newSku.price}
                    onChange={(e) => setNewSku({ ...newSku, price: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Barcode / SKU:</label>
                  <input
                    type="text"
                    placeholder="Auto-generated"
                    value={newSku.barcode}
                    onChange={(e) => setNewSku({ ...newSku, barcode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold rounded-xl mt-2"
              >
                Register & Add to Bill
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 12. GOFRUGAL RETAIL TAX INVOICE PRINTABLE RECEIPT MODAL */}
      {/* ========================================================================= */}
      {lastInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white text-slate-950 rounded-2xl p-6 shadow-2xl font-mono text-xs">
            {/* Printable Thermal Receipt Style */}
            <div className="text-center border-b border-dashed border-slate-400 pb-3 mb-3">
              <h2 className="text-base font-black uppercase tracking-wider">RETAILEASY SUPERSTORE</h2>
              <p className="text-[10px] text-slate-600">POS Vault Terminal • GSTIN: 33AAAAA0000A1Z5</p>
              <p className="text-[10px] text-slate-600">Tax Invoice / Bill of Supply</p>
            </div>

            <div className="space-y-1 text-[11px] border-b border-dashed border-slate-400 pb-2 mb-2">
              <div className="flex justify-between">
                <span>Bill No: {lastInvoice.billNo}</span>
                <span>{new Date(lastInvoice.timestamp).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Customer: {lastInvoice.customer.name}</span>
                <span>Cashier: {lastInvoice.cashier.split("@")[0]}</span>
              </div>
            </div>

            {/* Items Table */}
            <div className="border-b border-dashed border-slate-400 pb-2 mb-2">
              <div className="flex justify-between font-bold text-[10px] uppercase mb-1">
                <span>Item</span>
                <span>Qty x Rate</span>
                <span>Net</span>
              </div>
              {lastInvoice.items.map((it, idx) => (
                <div key={idx} className="flex justify-between text-[11px] py-0.5">
                  <span className="truncate max-w-[120px]">{it.name}</span>
                  <span>{it.quantity} x ₹{it.rate.toFixed(2)}</span>
                  <span className="font-bold">₹{it.netAmount.toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Financials */}
            <div className="space-y-1 text-[11px] border-b border-dashed border-slate-400 pb-2 mb-3">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{lastInvoice.subtotal.toFixed(2)}</span>
              </div>
              {lastInvoice.itemDiscountTotal + lastInvoice.billDiscount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Total Discount Savings:</span>
                  <span>-₹{(lastInvoice.itemDiscountTotal + lastInvoice.billDiscount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Tax Total (GST):</span>
                <span>₹{lastInvoice.taxTotal.toFixed(2)} (incl.)</span>
              </div>
              <div className="flex justify-between text-sm font-black pt-1">
                <span>GRAND TOTAL:</span>
                <span>₹{lastInvoice.totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-600 pt-1">
                <span>Payment Mode: {lastInvoice.payment.mode}</span>
                <span>
                  {lastInvoice.payment.mode === "CASH" && `Cash: ₹${lastInvoice.totalAmount.toFixed(2)}`}
                  {lastInvoice.payment.mode === "UPI" && `UPI: ₹${lastInvoice.totalAmount.toFixed(2)}`}
                  {lastInvoice.payment.mode === "CARD" && `Card: ₹${lastInvoice.totalAmount.toFixed(2)}`}
                  {lastInvoice.payment.mode === "SPLIT" && `Cash: ₹${(lastInvoice.payment.cashTendered || 0).toFixed(2)} | UPI: ₹${(lastInvoice.payment.upiAmount || 0).toFixed(2)}`}
                  {lastInvoice.payment.mode === "CREDIT" && `Credit: ₹${lastInvoice.totalAmount.toFixed(2)}`}
                </span>
              </div>
              {lastInvoice.payment.changeReturn > 0 && (
                <div className="flex justify-between text-[10px] text-slate-600">
                  <span>Change Returned:</span>
                  <span>₹{lastInvoice.payment.changeReturn.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="text-center text-[10px] text-slate-500 mb-4">
              *** THANK YOU! VISIT AGAIN ***<br />
              Powered by GoFrugal RetailEasy Architecture
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Bill
              </button>
              <button
                type="button"
                onClick={() => setLastInvoice(null)}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition"
              >
                Next Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXPIRED/INACTIVE PRODUCT WARNING MODAL */}
      {expiredProductModal.show && expiredProductModal.product && (
        <div className="fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border-2 border-red-500/50 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-red-500/20 border-2 border-red-500/40 text-red-400 flex items-center justify-center">
                  <X className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-red-400 uppercase">Cannot Sell Product</h3>
                  <p className="text-xs text-slate-400 font-mono">Product is not available for sale</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Product:</span>
                <span className="text-slate-100 font-bold">{expiredProductModal.product.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Barcode:</span>
                <span className="text-slate-300 font-mono">{expiredProductModal.product.barcode}</span>
              </div>
              {expiredProductModal.product.expiryDate && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Expiry Date:</span>
                  <span className="text-red-400 font-bold">{expiredProductModal.product.expiryDate}</span>
                </div>
              )}
              {expiredProductModal.product.batchNo && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Batch No:</span>
                  <span className="text-slate-300 font-mono">{expiredProductModal.product.batchNo}</span>
                </div>
              )}
            </div>

            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
              <p className="text-sm text-red-300 font-semibold text-center">
                ⚠️ {expiredProductModal.reason}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setExpiredProductModal({ show: false, product: null, reason: "" })}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold rounded-xl transition flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Close & Continue
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
