import { 
  collection, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc, 
  query, 
  orderBy, 
  serverTimestamp, 
  Timestamp 
} from "firebase/firestore";
import { db } from "./firebase";

export interface Product {
  id: string;
  name: string;
  price: number;
  purchaseRate?: number;
  mrp?: number;
  stock: number;
  category: string;
  barcode: string;
  unit?: string;
  taxPercent?: number;
  hsnCode?: string;
  rackLocation?: string;
  expiryDate?: string;
  batchNo?: string;
  createdAt?: number;
  isActive?: boolean; // Manual inactive flag - takes priority over expiry
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  gstin?: string;
  customerType?: "Retail" | "Wholesale" | "VIP" | "Corporate";
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  creditLimit?: number;
  creditBalance?: number;
  points?: number;
  dob?: string;
  anniversary?: string;
  notes?: string;
  createdAt?: number;
}

export interface BillItem {
  id: string;
  barcode: string;
  name: string;
  stock: number;
  unit: string;
  purchaseRate?: number;
  mrp: number;
  rate: number;
  quantity: number;
  discountPercent: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  netAmount: number;
}

export interface PaymentDetails {
  mode: "CASH" | "CARD" | "UPI" | "CREDIT" | "SPLIT";
  cashTendered: number;
  cardAmount: number;
  upiAmount: number;
  creditAmount: number;
  changeReturn: number;
}

export interface HeldBill {
  id: string;
  heldAt: string;
  customerName: string;
  customerPhone: string;
  customerGstin?: string;
  customerAddress?: string;
  items: BillItem[];
  itemCount: number;
  totalAmount: number;
  note?: string;
}

export interface Sale {
  id: string;
  billNo: string;
  customer: {
    name: string;
    phone: string;
    email?: string;
    gstin?: string;
    address?: string;
    customerType?: string;
  };
  items: BillItem[];
  subtotal: number;
  itemDiscountTotal: number;
  billDiscount: number;
  taxTotal: number;
  roundOff: number;
  totalAmount: number;
  payment: PaymentDetails;
  timestamp: string;
  cashier: string;
  // Return tracking fields
  returnStatus?: "none" | "partial" | "full";
  returnAmount?: number;
}

export interface ReturnItem {
  id: string;
  barcode: string;
  name: string;
  unit: string;
  originalQuantity: number;
  returnQuantity: number;
  rate: number;
  discountPercent: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  netAmount: number;
  reason?: string;
}

export interface SalesReturn {
  id: string;
  returnNo: string;
  originalSaleId: string;
  originalBillNo: string;
  customer: {
    name: string;
    phone: string;
    email?: string;
    gstin?: string;
    address?: string;
    customerType?: string;
  };
  returnItems: ReturnItem[];
  returnSubtotal: number;
  returnItemDiscountTotal: number;
  returnBillDiscount: number;
  returnTaxTotal: number;
  returnRoundOff: number;
  totalReturnAmount: number;
  refundMethod: "CASH" | "CARD" | "UPI" | "CREDIT" | "ORIGINAL_MODE";
  returnReason?: string;
  timestamp: string;
  processedBy: string;
  notes?: string;
}

const DEFAULT_PRODUCTS: Product[] = [
  { id: "prod_1", name: "Premium Arabica Coffee 250g", purchaseRate: 280.00, price: 350.00, mrp: 390.00, stock: 45, category: "Beverages", barcode: "1001", unit: "PCS", taxPercent: 5, hsnCode: "0901", rackLocation: "A-01", batchNo: "LOT-901", expiryDate: "2026-12-31", createdAt: Date.now() - 86400000 * 20 },
  { id: "prod_2", name: "Artisan Butter Croissant", purchaseRate: 95.00, price: 120.00, mrp: 140.00, stock: 28, category: "Bakery", barcode: "1002", unit: "PCS", taxPercent: 5, hsnCode: "1905", rackLocation: "B-03", batchNo: "LOT-902", expiryDate: "2026-09-03", createdAt: Date.now() },
  { id: "prod_3", name: "Organic Green Tea 100g", purchaseRate: 140.00, price: 180.00, mrp: 210.00, stock: 50, category: "Beverages", barcode: "1003", unit: "BOX", taxPercent: 5, hsnCode: "0902", rackLocation: "A-02", batchNo: "LOT-903", expiryDate: "2027-03-30", createdAt: Date.now() - 86400000 * 15 },
  { id: "prod_4", name: "Farm Fresh Eggs (Pack of 12)", purchaseRate: 75.00, price: 95.00, mrp: 110.00, stock: 30, category: "Food", barcode: "1004", unit: "BOX", taxPercent: 0, hsnCode: "0407", rackLocation: "C-01", batchNo: "LOT-904", expiryDate: "2026-09-12", createdAt: Date.now() - 86400000 * 3 },
  { id: "prod_5", name: "Dark Chocolate Hazelnut Muffin", purchaseRate: 110.00, price: 140.00, mrp: 160.00, stock: 22, category: "Bakery", barcode: "1005", unit: "PCS", taxPercent: 5, hsnCode: "1905", rackLocation: "B-04", batchNo: "LOT-905", expiryDate: "2026-09-08", createdAt: Date.now() - 86400000 * 2 },
  { id: "prod_6", name: "Cold Brew Nitro Special 330ml", purchaseRate: 150.00, price: 190.00, mrp: 220.00, stock: 35, category: "Beverages", barcode: "1006", unit: "BOT", taxPercent: 12, hsnCode: "2202", rackLocation: "A-04", batchNo: "LOT-906", expiryDate: "2026-10-15", createdAt: Date.now() - 86400000 * 10 },
  { id: "prod_7", name: "Paneer Tikka Ciabatta Panini", purchaseRate: 175.00, price: 220.00, mrp: 250.00, stock: 15, category: "Food", barcode: "1007", unit: "PCS", taxPercent: 5, hsnCode: "2106", rackLocation: "D-02", batchNo: "LOT-907", expiryDate: "2026-09-20", createdAt: Date.now() - 86400000 * 1 },
  { id: "prod_8", name: "Cold Pressed Mustard Oil 1L", purchaseRate: 170.00, price: 210.00, mrp: 240.00, stock: 20, category: "Food", barcode: "1008", unit: "BTL", taxPercent: 5, hsnCode: "1509", rackLocation: "E-01", batchNo: "LOT-908", expiryDate: "2027-06-15", createdAt: Date.now() - 86400000 * 40 },
  { id: "prod_9", name: "Almond Milk Unsweetened 1L", purchaseRate: 210.00, price: 260.00, mrp: 290.00, stock: 40, category: "Beverages", barcode: "1009", unit: "LTR", taxPercent: 5, hsnCode: "2202", rackLocation: "A-05", batchNo: "LOT-909", expiryDate: "2026-10-28", createdAt: Date.now() - 86400000 * 5 },
  { id: "prod_10", name: "Roasted Masala Cashews 200g", purchaseRate: 220.00, price: 280.00, mrp: 320.00, stock: 25, category: "Snacks", barcode: "1010", unit: "PKT", taxPercent: 12, hsnCode: "2008", rackLocation: "F-02", batchNo: "LOT-910", expiryDate: "2027-01-20", createdAt: Date.now() - 86400000 * 25 },
  { id: "prod_11", name: "Fresh Greek Yogurt Berries 200g", purchaseRate: 60.00, price: 85.00, mrp: 99.00, stock: 12, category: "Food", barcode: "1011", unit: "CUP", taxPercent: 5, hsnCode: "0403", rackLocation: "C-02", batchNo: "LOT-911", expiryDate: "2026-08-28", createdAt: Date.now() - 86400000 * 12 },
];

const DEFAULT_CUSTOMERS: Customer[] = [
  { 
    id: "cust_1", 
    name: "Walk-In Customer", 
    phone: "9999999999", 
    email: "walkin@store.in",
    customerType: "Retail",
    points: 0, 
    creditLimit: 0, 
    creditBalance: 0,
    city: "Local",
    state: "State"
  },
  { 
    id: "cust_2", 
    name: "Rahul Sharma", 
    phone: "9876543210", 
    email: "rahul.sharma@gmail.com",
    gstin: "29ABCDE1234F1Z5",
    customerType: "VIP",
    address: "42, Greenwood Residency, Sector 4", 
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560001",
    points: 340, 
    creditLimit: 10000, 
    creditBalance: 1500,
    dob: "1990-08-15"
  },
  { 
    id: "cust_3", 
    name: "Anita Desai Enterprises", 
    phone: "9845123456", 
    email: "anita@desai-enterprises.in",
    gstin: "33AAACD4567E1ZV",
    customerType: "Wholesale",
    address: "Plot 8B, Industrial Estate", 
    city: "Chennai",
    state: "Tamil Nadu",
    pincode: "600032",
    points: 850, 
    creditLimit: 50000, 
    creditBalance: 0,
    notes: "Requires formal GST Tax Invoices"
  },
  { 
    id: "cust_4", 
    name: "Vikram Mehta", 
    phone: "9123456789", 
    email: "vikram.mehta@outlook.com",
    customerType: "Retail",
    address: "102, Palm Grove Apts", 
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400050",
    points: 120, 
    creditLimit: 5000, 
    creditBalance: 250,
    dob: "1988-12-04"
  },
];

// ============================================================================
// PRODUCT EXPIRY AND AVAILABILITY CHECKS
// ============================================================================

/**
 * Checks if a product is expired based on expiryDate.
 * Returns true if expired, false if not expired or no expiry date.
 */
export function isProductExpired(product: Product): boolean {
  if (!product.expiryDate) return false;
  
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const expiryDate = new Date(product.expiryDate);
    expiryDate.setHours(0, 0, 0, 0);
    
    return expiryDate < today;
  } catch {
    return false; // Invalid date format, assume not expired
  }
}

/**
 * Checks if a product can be sold.
 * Returns { canSell: boolean, reason?: string }
 */
export function canSellProduct(product: Product): { canSell: boolean; reason?: string } {
  // Check manual inactive flag first
  if (product.isActive === false) {
    return { canSell: false, reason: "This product has been marked as INACTIVE and cannot be sold." };
  }
  
  // Check if expired
  if (isProductExpired(product)) {
    return { 
      canSell: false, 
      reason: `This product EXPIRED on ${product.expiryDate}. Expired products cannot be sold.` 
    };
  }
  
  // Check stock
  if (product.stock <= 0) {
    return { canSell: false, reason: "This product is OUT OF STOCK." };
  }
  
  return { canSell: true };
}

// ============================================================================

const LOCAL_INVENTORY_KEY = "pos_vault_inventory";
const LOCAL_SALES_KEY = "pos_vault_sales";
const LOCAL_CUSTOMERS_KEY = "pos_vault_customers";
const LOCAL_HELD_BILLS_KEY = "pos_vault_held_bills";
const LOCAL_RETURNS_KEY = "pos_vault_returns";

function addMissingDefaultAttributes(products: Product[]): Product[] {
  const updated = products.map((product) => {
    const defaultProduct = DEFAULT_PRODUCTS.find((item) => item.id === product.id);
    let item = { ...product };
    if (item.purchaseRate === undefined && defaultProduct?.purchaseRate) {
      item.purchaseRate = defaultProduct.purchaseRate;
    }
    if (!item.expiryDate && defaultProduct?.expiryDate) {
      item.expiryDate = defaultProduct.expiryDate;
    }
    if (!item.batchNo && defaultProduct?.batchNo) {
      item.batchNo = defaultProduct.batchNo;
    }
    return item;
  });

  // Also include any default products missing from local storage (e.g. newly added expired sample item)
  DEFAULT_PRODUCTS.forEach((dp) => {
    if (!updated.some((p) => p.id === dp.id)) {
      updated.push(dp);
    }
  });

  return updated;
}

function getLocalInventory(): Product[] {
  if (typeof window === "undefined") return DEFAULT_PRODUCTS;
  try {
    const data = localStorage.getItem(LOCAL_INVENTORY_KEY);
    if (!data) {
      localStorage.setItem(LOCAL_INVENTORY_KEY, JSON.stringify(DEFAULT_PRODUCTS));
      return DEFAULT_PRODUCTS;
    }
    const products = addMissingDefaultAttributes(JSON.parse(data));
    saveLocalInventory(products);
    return products;
  } catch {
    return DEFAULT_PRODUCTS;
  }
}

function saveLocalInventory(products: Product[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_INVENTORY_KEY, JSON.stringify(products));
  } catch (err) {
    console.error("[POS] Failed to save inventory to localStorage:", err);
    alert("WARNING: Failed to save inventory data. Your changes may be lost.");
  }
}

function getLocalSales(): Sale[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(LOCAL_SALES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveLocalSales(sales: Sale[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_SALES_KEY, JSON.stringify(sales));
  } catch (err) {
    console.error("[POS] CRITICAL: Failed to save sale to localStorage:", err);
    alert("CRITICAL ERROR: Sale data could not be saved. Please screenshot this bill and contact support.");
  }
}

export function getLocalCustomers(): Customer[] {
  if (typeof window === "undefined") return DEFAULT_CUSTOMERS;
  try {
    const data = localStorage.getItem(LOCAL_CUSTOMERS_KEY);
    if (!data) {
      localStorage.setItem(LOCAL_CUSTOMERS_KEY, JSON.stringify(DEFAULT_CUSTOMERS));
      return DEFAULT_CUSTOMERS;
    }
    return JSON.parse(data);
  } catch {
    return DEFAULT_CUSTOMERS;
  }
}

export function saveLocalCustomer(customer: Customer) {
  if (typeof window === "undefined") return;
  try {
    const list = getLocalCustomers();
    const existingIndex = list.findIndex(c => c.phone === customer.phone || (customer.id && c.id === customer.id));
    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...customer };
      localStorage.setItem(LOCAL_CUSTOMERS_KEY, JSON.stringify(list));
    } else {
      localStorage.setItem(LOCAL_CUSTOMERS_KEY, JSON.stringify([customer, ...list]));
    }
  } catch (err) {
    console.error("[POS] Failed to save customer to localStorage:", err);
    alert("WARNING: Failed to save customer data.");
  }
}

export async function fetchCustomers(): Promise<Customer[]> {
  try {
    if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== "dummy") {
      const snap = await getDocs(collection(db, "customers"));
      if (!snap.empty) {
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as Customer));
      }
    }
  } catch (err: unknown) {
    // Graceful permission error handling - fallback to local storage
    if (err && typeof err === "object" && "code" in err && err.code !== "permission-denied") {
      console.warn("Firestore customer fetch notice:", "message" in err ? err.message : err);
    }
  }
  return getLocalCustomers();
}

export async function addCustomer(cust: Omit<Customer, "id">): Promise<Customer> {
  const newCust: Customer = {
    ...cust,
    id: "cust_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
    createdAt: Date.now()
  };

  try {
    if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== "dummy") {
      const custData = Object.fromEntries(
        Object.entries({ ...newCust }).filter(([, v]) => v !== undefined)
      );
      const docRef = await addDoc(collection(db, "customers"), {
        ...custData,
        timestamp: serverTimestamp()
      });
      newCust.id = docRef.id;
    }
  } catch (err) {
    console.error("[POS] Firestore sync failed for customer, using local ID only:", err);
  }

  saveLocalCustomer(newCust);
  return newCust;
}

export function getHeldBills(): HeldBill[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(LOCAL_HELD_BILLS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveHeldBill(bill: HeldBill) {
  if (typeof window === "undefined") return;
  try {
    const list = getHeldBills();
    localStorage.setItem(LOCAL_HELD_BILLS_KEY, JSON.stringify([bill, ...list]));
  } catch (err) {
    console.error("[POS] Failed to save held bill:", err);
    alert("WARNING: Failed to save held bill.");
  }
}

export function removeHeldBill(id: string) {
  if (typeof window === "undefined") return;
  try {
    const list = getHeldBills();
    localStorage.setItem(LOCAL_HELD_BILLS_KEY, JSON.stringify(list.filter(b => b.id !== id)));
  } catch (err) {
    console.error("[POS] Failed to remove held bill:", err);
  }
}

export async function fetchInventory(): Promise<Product[]> {
  try {
    if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== "dummy") {
      const snap = await getDocs(collection(db, "inventory"));
      if (!snap.empty) {
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
      }
    }
  } catch (err: unknown) {
    // Graceful permission error handling - fallback to local storage
    if (err && typeof err === "object" && "code" in err && err.code !== "permission-denied") {
      console.warn("Firestore inventory notice:", "message" in err ? err.message : err);
    }
  }
  return getLocalInventory();
}

export async function addProduct(product: Omit<Product, "id">): Promise<Product> {
  const newProduct: Product = {
    ...product,
    id: "prod_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
    createdAt: Date.now()
  };

  try {
    if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== "dummy") {
      const prodData = Object.fromEntries(
        Object.entries({ ...newProduct }).filter(([, v]) => v !== undefined)
      );
      const docRef = await addDoc(collection(db, "inventory"), {
        ...prodData,
        timestamp: serverTimestamp()
      });
      newProduct.id = docRef.id;
    }
  } catch (err) {
    console.error("[POS] Firestore sync failed for product, using local ID only:", err);
  }

  const current = getLocalInventory();
  const updated = [newProduct, ...current];
  saveLocalInventory(updated);
  return newProduct;
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<void> {
  try {
    if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== "dummy") {
      await updateDoc(doc(db, "inventory", id), updates);
    }
  } catch (err) {
    console.error("[POS] Firestore sync failed for product update, local only:", err);
  }

  const current = getLocalInventory();
  const updated = current.map(p => (p.id === id ? { ...p, ...updates } : p));
  saveLocalInventory(updated);
}

export async function removeProduct(id: string): Promise<void> {
  try {
    if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== "dummy") {
      await deleteDoc(doc(db, "inventory", id));
    }
  } catch (err) {
    console.error("[POS] Firestore sync failed for product deletion, local only:", err);
  }

  const current = getLocalInventory();
  const updated = current.filter(p => p.id !== id);
  saveLocalInventory(updated);
}

// Monotonic counter for collision-resistant invoice IDs
let _invoiceCounter = 0;

export async function processRetailSale(
  items: BillItem[],
  customer: { 
    name: string; 
    phone: string; 
    email?: string; 
    gstin?: string; 
    address?: string; 
    customerType?: string; 
  },
  payment: PaymentDetails,
  billDiscount: number = 0,
  cashier: string = "stacklyn96@gmail.com"
): Promise<Sale> {
  const subtotal = items.reduce((sum, item) => sum + (item.rate * item.quantity), 0);
  const itemDiscountTotal = items.reduce((sum, item) => sum + item.discountAmount, 0);
  const taxTotal = items.reduce((sum, item) => sum + item.taxAmount, 0);
  const rawTotal = Math.max(0, subtotal - itemDiscountTotal - billDiscount);
  const totalAmount = Math.round(rawTotal * 100) / 100;
  const roundOff = Math.round((totalAmount - rawTotal) * 100) / 100;

  // Generate collision-resistant invoice ID: BILL-YY-<timestamp><counter>
  const timestamp = Date.now();
  const counter = (_invoiceCounter++ % 1000).toString().padStart(3, "0");
  const year = new Date().getFullYear().toString().slice(-2);
  const invoiceNo = `BILL-${year}-${timestamp}${counter}`;

  const saleRecord: Sale = {
    id: invoiceNo,
    billNo: invoiceNo,
    customer,
    items,
    subtotal,
    itemDiscountTotal,
    billDiscount,
    taxTotal,
    roundOff,
    totalAmount,
    payment,
    timestamp: new Date().toISOString(),
    cashier
  };

  // 1. Record Sale in Local Storage & Firebase
  const currentSales = getLocalSales();
  saveLocalSales([saleRecord, ...currentSales]);

  try {
    if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== "dummy") {
      // Strip undefined values — Firestore rejects them with "Unsupported field value: undefined"
      const sanitizeForFirestore = (obj: unknown): unknown => {
        if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
        if (obj !== null && typeof obj === "object") {
          return Object.fromEntries(
            Object.entries(obj as Record<string, unknown>)
              .filter(([, v]) => v !== undefined)
              .map(([k, v]) => [k, sanitizeForFirestore(v)])
          );
        }
        return obj;
      };

      await addDoc(collection(db, "sales"), {
        ...(sanitizeForFirestore(saleRecord) as Record<string, unknown>),
        timestamp: serverTimestamp()
      });
    }
  } catch (err) {
    console.error("[POS] CRITICAL: Firestore sync failed for sale. Sale saved locally only:", err);
  }

  // 2. Reduce stock for each cart item cleanly without race conditions
  const currentInv = getLocalInventory();
  const updatedInv = currentInv.map(prod => {
    const purchased = items.find(c => c.id === prod.id || (prod.barcode && prod.barcode !== "N/A" && c.barcode === prod.barcode));
    if (purchased) {
      const newStock = Math.max(0, prod.stock - purchased.quantity);
      // Only sync to Firestore if this product has a real Firestore document ID
      // (local seed products like "prod_1" don't exist in Firestore — skip them)
      const hasFirestoreId = !prod.id.startsWith("prod_");
      if (
        hasFirestoreId &&
        process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
        process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== "dummy"
      ) {
        updateDoc(doc(db, "inventory", prod.id), { stock: newStock }).catch((err) => {
          console.error("[POS] Firestore stock sync failed for product:", prod.name, err);
        });
      }
      return { ...prod, stock: newStock };
    }
    return prod;
  });
  saveLocalInventory(updatedInv);

  return saleRecord;
}

export async function fetchSales(): Promise<Sale[]> {
  try {
    if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== "dummy") {
      const q = query(collection(db, "sales"), orderBy("timestamp", "desc"));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs.map(d => {
          const data = d.data();
          let ts = data.timestamp;
          if (ts instanceof Timestamp) {
            ts = ts.toDate().toISOString();
          } else if (ts && typeof ts === "object" && "seconds" in ts) {
            ts = new Date(ts.seconds * 1000).toISOString();
          } else if (typeof ts !== "string") {
            ts = new Date().toISOString();
          }
          return { id: d.id, ...data, timestamp: ts } as Sale;
        });
      }
    }
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && err.code !== "permission-denied") {
      console.warn("Firestore sales notice:", "message" in err ? err.message : err);
    }
  }
  return getLocalSales();
}

// ============================================================================
// DATA BACKUP & EXPORT FUNCTIONS
// ============================================================================

export interface BackupData {
  version: string;
  exportDate: string;
  inventory: Product[];
  customers: Customer[];
  sales: Sale[];
  heldBills: HeldBill[];
}

/**
 * Exports all POS data as a downloadable JSON backup file.
 * Use this regularly to prevent data loss.
 */
export function exportAllData(): void {
  if (typeof window === "undefined") return;
  
  try {
    const backup: BackupData = {
      version: "1.0",
      exportDate: new Date().toISOString(),
      inventory: getLocalInventory(),
      customers: getLocalCustomers(),
      sales: getLocalSales(),
      heldBills: getHeldBills(),
    };

    const dataStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = `pos-backup-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log("[POS] Data backup exported successfully");
  } catch (err) {
    console.error("[POS] Failed to export backup:", err);
    alert("Failed to create backup file. Check console for details.");
  }
}

/**
 * Imports data from a backup JSON file.
 * WARNING: This will REPLACE all current local data.
 */
export function importBackupData(backupData: BackupData): { success: boolean; message: string } {
  if (typeof window === "undefined") {
    return { success: false, message: "Import only works in browser" };
  }

  try {
    // Validate backup structure
    if (!backupData.inventory || !backupData.customers || !backupData.sales) {
      return { success: false, message: "Invalid backup file format" };
    }

    // Save to localStorage
    localStorage.setItem(LOCAL_INVENTORY_KEY, JSON.stringify(backupData.inventory));
    localStorage.setItem(LOCAL_CUSTOMERS_KEY, JSON.stringify(backupData.customers));
    localStorage.setItem(LOCAL_SALES_KEY, JSON.stringify(backupData.sales));
    
    if (backupData.heldBills) {
      localStorage.setItem(LOCAL_HELD_BILLS_KEY, JSON.stringify(backupData.heldBills));
    }

    console.log("[POS] Data restored from backup successfully");
    return { 
      success: true, 
      message: `Restored ${backupData.inventory.length} products, ${backupData.customers.length} customers, ${backupData.sales.length} sales` 
    };
  } catch (err) {
    console.error("[POS] Failed to import backup:", err);
    return { success: false, message: "Failed to restore backup. Check console for details." };
  }
}

/**
 * Checks localStorage quota usage and warns if running low.
 */
export function checkStorageHealth(): { used: number; available: number; percentUsed: number; warning: string | null } {
  if (typeof window === "undefined") {
    return { used: 0, available: 0, percentUsed: 0, warning: null };
  }

  try {
    let used = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        used += localStorage[key].length + key.length;
      }
    }

    // Most browsers allow 5-10MB, we'll assume 5MB as conservative estimate
    const available = 5 * 1024 * 1024; // 5MB in bytes
    const percentUsed = (used / available) * 100;

    let warning = null;
    if (percentUsed > 90) {
      warning = "CRITICAL: Storage nearly full! Export backup and clear old data immediately.";
    } else if (percentUsed > 75) {
      warning = "WARNING: Storage is 75% full. Consider exporting backup and clearing old sales.";
    } else if (percentUsed > 50) {
      warning = "Storage is over 50% full. Regular backups recommended.";
    }

    return { used, available, percentUsed, warning };
  } catch (err) {
    console.error("[POS] Failed to check storage:", err);
    return { used: 0, available: 0, percentUsed: 0, warning: "Could not check storage status" };
  }
}

// ============================================================================
// SALES RETURN FUNCTIONS
// ============================================================================

/**
 * Gets all returns from localStorage
 */
function getLocalReturns(): SalesReturn[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(LOCAL_RETURNS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Saves returns to localStorage
 */
function saveLocalReturns(returns: SalesReturn[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_RETURNS_KEY, JSON.stringify(returns));
  } catch (err) {
    console.error("[POS] CRITICAL: Failed to save return to localStorage:", err);
    alert("CRITICAL ERROR: Return data could not be saved. Please screenshot this return and contact support.");
  }
}

/**
 * Searches sales by bill number, customer phone, or customer name
 */
export async function searchSales(searchTerm: string): Promise<Sale[]> {
  const allSales = await fetchSales();
  if (!searchTerm || searchTerm.trim() === "") return allSales;

  const term = searchTerm.toLowerCase().trim();
  
  return allSales.filter(sale => {
    const billNoMatch = sale.billNo.toLowerCase().includes(term);
    const phoneMatch = sale.customer.phone.includes(term);
    const nameMatch = sale.customer.name.toLowerCase().includes(term);
    
    return billNoMatch || phoneMatch || nameMatch;
  });
}

/**
 * Gets a specific sale by ID or bill number
 */
export async function getSaleById(idOrBillNo: string): Promise<Sale | null> {
  const allSales = await fetchSales();
  return allSales.find(s => s.id === idOrBillNo || s.billNo === idOrBillNo) || null;
}

/**
 * Validates if items can be returned
 */
export function validateReturn(
  originalSale: Sale,
  returnItems: ReturnItem[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check if sale exists
  if (!originalSale) {
    errors.push("Original sale not found");
    return { valid: false, errors };
  }

  // Check if return items are provided
  if (!returnItems || returnItems.length === 0) {
    errors.push("No items selected for return");
    return { valid: false, errors };
  }

  // Validate each return item
  returnItems.forEach(returnItem => {
    const originalItem = originalSale.items.find(
      item => item.id === returnItem.id || item.barcode === returnItem.barcode
    );

    if (!originalItem) {
      errors.push(`Item ${returnItem.name} not found in original sale`);
      return;
    }

    // Check return quantity
    if (returnItem.returnQuantity <= 0) {
      errors.push(`Invalid return quantity for ${returnItem.name}`);
    }

    if (returnItem.returnQuantity > originalItem.quantity) {
      errors.push(
        `Return quantity (${returnItem.returnQuantity}) exceeds original quantity (${originalItem.quantity}) for ${returnItem.name}`
      );
    }
  });

  // Check if sale is too old (optional: 30 days return policy)
  const saleDate = new Date(originalSale.timestamp);
  const daysSinceSale = Math.floor((Date.now() - saleDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysSinceSale > 30) {
    errors.push(`Sale is older than 30 days (${daysSinceSale} days). Return policy expired.`);
  }

  return { valid: errors.length === 0, errors };
}

// Monotonic counter for return IDs
let _returnCounter = 0;

/**
 * Processes a sales return transaction
 */
export async function processSalesReturn(
  originalSaleId: string,
  returnItems: ReturnItem[],
  refundMethod: "CASH" | "CARD" | "UPI" | "CREDIT" | "ORIGINAL_MODE",
  returnReason?: string,
  notes?: string,
  processedBy: string = "stacklyn96@gmail.com"
): Promise<{ success: boolean; return?: SalesReturn; error?: string }> {
  
  try {
    // 1. Get original sale
    const originalSale = await getSaleById(originalSaleId);
    
    if (!originalSale) {
      return { success: false, error: "Original sale not found" };
    }

    // 2. Validate return
    const validation = validateReturn(originalSale, returnItems);
    if (!validation.valid) {
      return { success: false, error: validation.errors.join("; ") };
    }

    // 3. Calculate return totals
    const returnSubtotal = returnItems.reduce((sum, item) => 
      sum + (item.rate * item.returnQuantity), 0
    );
    
    const returnItemDiscountTotal = returnItems.reduce((sum, item) => {
      const itemDiscount = (item.rate * item.returnQuantity * item.discountPercent) / 100;
      return sum + itemDiscount;
    }, 0);

    // Calculate proportional bill discount
    const originalTotal = originalSale.subtotal - originalSale.itemDiscountTotal;
    const returnBeforeDiscount = returnSubtotal - returnItemDiscountTotal;
    const billDiscountRatio = originalTotal > 0 ? originalSale.billDiscount / originalTotal : 0;
    const returnBillDiscount = returnBeforeDiscount * billDiscountRatio;

    const returnTaxTotal = returnItems.reduce((sum, item) => {
      const taxableAmount = (item.rate * item.returnQuantity) - 
        ((item.rate * item.returnQuantity * item.discountPercent) / 100);
      const tax = (taxableAmount * item.taxPercent) / 100;
      return sum + tax;
    }, 0);

    const rawReturnTotal = Math.max(0, returnSubtotal - returnItemDiscountTotal - returnBillDiscount);
    const totalReturnAmount = Math.round(rawReturnTotal * 100) / 100;
    const returnRoundOff = Math.round((totalReturnAmount - rawReturnTotal) * 100) / 100;

    // 4. Generate return record
    const timestamp = Date.now();
    const counter = (_returnCounter++ % 1000).toString().padStart(3, "0");
    const year = new Date().getFullYear().toString().slice(-2);
    const returnNo = `RTN-${year}-${timestamp}${counter}`;

    const returnRecord: SalesReturn = {
      id: returnNo,
      returnNo,
      originalSaleId: originalSale.id,
      originalBillNo: originalSale.billNo,
      customer: originalSale.customer,
      returnItems,
      returnSubtotal,
      returnItemDiscountTotal,
      returnBillDiscount,
      returnTaxTotal,
      returnRoundOff,
      totalReturnAmount,
      refundMethod,
      returnReason,
      timestamp: new Date().toISOString(),
      processedBy,
      notes
    };

    // 5. Save return to local storage
    const currentReturns = getLocalReturns();
    saveLocalReturns([returnRecord, ...currentReturns]);

    // 6. Save to Firestore
    try {
      if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY && 
          process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== "dummy") {
        const sanitizeForFirestore = (obj: unknown): unknown => {
          if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
          if (obj !== null && typeof obj === "object") {
            return Object.fromEntries(
              Object.entries(obj as Record<string, unknown>)
                .filter(([, v]) => v !== undefined)
                .map(([k, v]) => [k, sanitizeForFirestore(v)])
            );
          }
          return obj;
        };

        await addDoc(collection(db, "returns"), {
          ...(sanitizeForFirestore(returnRecord) as Record<string, unknown>),
          timestamp: serverTimestamp()
        });
      }
    } catch (err) {
      console.error("[POS] Firestore sync failed for return. Return saved locally only:", err);
    }

    // 7. Update inventory - add returned items back to stock
    const currentInv = getLocalInventory();
    const updatedInv = currentInv.map(prod => {
      const returnedItem = returnItems.find(
        item => item.id === prod.id || (prod.barcode && item.barcode === prod.barcode)
      );
      
      if (returnedItem) {
        const newStock = prod.stock + returnedItem.returnQuantity;
        
        // Sync to Firestore if real product ID
        const hasFirestoreId = !prod.id.startsWith("prod_");
        if (
          hasFirestoreId &&
          process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
          process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== "dummy"
        ) {
          updateDoc(doc(db, "inventory", prod.id), { stock: newStock }).catch((err) => {
            console.error("[POS] Firestore stock sync failed for returned product:", prod.name, err);
          });
        }
        
        return { ...prod, stock: newStock };
      }
      return prod;
    });
    saveLocalInventory(updatedInv);

    // 8. Update original sale return status
    const currentSales = getLocalSales();
    const totalOriginalQuantity = originalSale.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalReturnedQuantity = returnItems.reduce((sum, item) => sum + item.returnQuantity, 0);
    
    const returnStatus: "none" | "partial" | "full" = 
      totalReturnedQuantity >= totalOriginalQuantity ? "full" : "partial";

    const updatedSales = currentSales.map(s => {
      if (s.id === originalSale.id || s.billNo === originalSale.billNo) {
        return {
          ...s,
          returnStatus,
          returnAmount: (s.returnAmount || 0) + totalReturnAmount
        };
      }
      return s;
    });
    saveLocalSales(updatedSales);

    // Try to update Firestore sale record
    try {
      if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY && 
          process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== "dummy") {
        await updateDoc(doc(db, "sales", originalSale.id), {
          returnStatus,
          returnAmount: (originalSale.returnAmount || 0) + totalReturnAmount
        });
      }
    } catch (err) {
      console.error("[POS] Firestore sync failed for sale update:", err);
    }

    console.log("[POS] Return processed successfully:", returnNo);
    return { success: true, return: returnRecord };

  } catch (err) {
    console.error("[POS] Error processing return:", err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : "Unknown error processing return" 
    };
  }
}

/**
 * Fetches all returns from Firestore or localStorage
 */
export async function fetchReturns(): Promise<SalesReturn[]> {
  try {
    if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY && 
        process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== "dummy") {
      const q = query(collection(db, "returns"), orderBy("timestamp", "desc"));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs.map(d => {
          const data = d.data();
          let ts = data.timestamp;
          if (ts instanceof Timestamp) {
            ts = ts.toDate().toISOString();
          } else if (ts && typeof ts === "object" && "seconds" in ts) {
            ts = new Date(ts.seconds * 1000).toISOString();
          } else if (typeof ts !== "string") {
            ts = new Date().toISOString();
          }
          return { id: d.id, ...data, timestamp: ts } as SalesReturn;
        });
      }
    }
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && err.code !== "permission-denied") {
      console.warn("Firestore returns notice:", "message" in err ? err.message : err);
    }
  }
  return getLocalReturns();
}
