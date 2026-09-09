"use client";
import React, { useEffect, useState } from "react";
import { 
  fetchCustomers, 
  addCustomer, 
  saveLocalCustomer, 
  Customer 
} from "@/lib/store";
import { 
  Search, 
  Plus, 
  Edit, 
  Phone, 
  Mail, 
  MapPin, 
  User, 
  CreditCard, 
  Star, 
  Calendar, 
  FileText,
  X,
  Save,
  Users,
  TrendingUp,
  Award,
  Building2
} from "lucide-react";

type CustomerTypeOption = "Retail" | "Wholesale" | "VIP" | "Corporate";

export default function CustomerMasterPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | CustomerTypeOption>("all");
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Form states
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: "",
    phone: "",
    email: "",
    gstin: "",
    customerType: "Retail",
    address: "",
    city: "",
    state: "",
    pincode: "",
    creditLimit: 0,
    creditBalance: 0,
    points: 0,
    dob: "",
    anniversary: "",
    notes: ""
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    const data = await fetchCustomers();
    setCustomers(data);
    setLoading(false);
  };

  const handleAddCustomer = async () => {
    if (!formData.name?.trim() || !formData.phone?.trim()) {
      alert("Name and Phone are required!");
      return;
    }

    if (formData.phone.trim().length !== 10) {
      alert("Phone number must be exactly 10 digits!");
      return;
    }

    try {
      const newCustomer = await addCustomer({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email?.trim() || "",
        gstin: formData.gstin?.trim() || "",
        customerType: formData.customerType || "Retail",
        address: formData.address?.trim() || "",
        city: formData.city?.trim() || "",
        state: formData.state?.trim() || "",
        pincode: formData.pincode?.trim() || "",
        creditLimit: formData.creditLimit || 0,
        creditBalance: formData.creditBalance || 0,
        points: formData.points || 0,
        dob: formData.dob || "",
        anniversary: formData.anniversary || "",
        notes: formData.notes?.trim() || ""
      });

      setCustomers((prev) => [newCustomer, ...prev]);
      resetForm();
      setIsAddModalOpen(false);
      alert("Customer added successfully!");
    } catch (error) {
      console.error("Failed to add customer:", error);
      alert("Failed to add customer. Check console for details.");
    }
  };

  const handleUpdateCustomer = async () => {
    if (!selectedCustomer || !formData.name?.trim() || !formData.phone?.trim()) {
      alert("Name and Phone are required!");
      return;
    }

    if (formData.phone.trim().length !== 10) {
      alert("Phone number must be exactly 10 digits!");
      return;
    }

    try {
      const updatedCustomer: Customer = {
        ...selectedCustomer,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email?.trim() || "",
        gstin: formData.gstin?.trim() || "",
        customerType: formData.customerType || "Retail",
        address: formData.address?.trim() || "",
        city: formData.city?.trim() || "",
        state: formData.state?.trim() || "",
        pincode: formData.pincode?.trim() || "",
        creditLimit: formData.creditLimit || 0,
        creditBalance: formData.creditBalance || 0,
        points: formData.points || 0,
        dob: formData.dob || "",
        anniversary: formData.anniversary || "",
        notes: formData.notes?.trim() || ""
      };

      saveLocalCustomer(updatedCustomer);
      setCustomers((prev) => prev.map((c) => (c.id === selectedCustomer.id ? updatedCustomer : c)));
      resetForm();
      setIsEditModalOpen(false);
      setSelectedCustomer(null);
      alert("Customer updated successfully!");
    } catch (error) {
      console.error("Failed to update customer:", error);
      alert("Failed to update customer. Check console for details.");
    }
  };

  const openEditModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || "",
      gstin: customer.gstin || "",
      customerType: customer.customerType || "Retail",
      address: customer.address || "",
      city: customer.city || "",
      state: customer.state || "",
      pincode: customer.pincode || "",
      creditLimit: customer.creditLimit || 0,
      creditBalance: customer.creditBalance || 0,
      points: customer.points || 0,
      dob: customer.dob || "",
      anniversary: customer.anniversary || "",
      notes: customer.notes || ""
    });
    setIsEditModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      gstin: "",
      customerType: "Retail",
      address: "",
      city: "",
      state: "",
      pincode: "",
      creditLimit: 0,
      creditBalance: 0,
      points: 0,
      dob: "",
      anniversary: "",
      notes: ""
    });
  };

  const filteredCustomers = customers.filter((c) => {
    const matchSearch = 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.gstin?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.city?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchType = typeFilter === "all" || c.customerType === typeFilter;

    return matchSearch && matchType;
  });

  // Statistics
  const totalCustomers = customers.length;
  const retailCount = customers.filter((c) => c.customerType === "Retail").length;
  const wholesaleCount = customers.filter((c) => c.customerType === "Wholesale").length;
  const vipCount = customers.filter((c) => c.customerType === "VIP").length;
  const corporateCount = customers.filter((c) => c.customerType === "Corporate").length;
  const totalCreditBalance = customers.reduce((sum, c) => sum + (c.creditBalance || 0), 0);
  const totalPoints = customers.reduce((sum, c) => sum + (c.points || 0), 0);

  const getCustomerTypeColor = (type?: string) => {
    switch (type) {
      case "Retail": return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      case "Wholesale": return "bg-purple-500/10 text-purple-400 border-purple-500/30";
      case "VIP": return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "Corporate": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      default: return "bg-slate-500/10 text-slate-400 border-slate-500/30";
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 select-none font-sans">
      
      {/* Header & Stats */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-black text-slate-100 uppercase tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-cyan-400" />
              Customer Master
            </h1>
            <p className="text-xs text-slate-400 font-mono">Manage customer database and relationships</p>
          </div>
          <button
            onClick={() => { resetForm(); setIsAddModalOpen(true); }}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-sm flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            Add Customer
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <div className="text-xs text-slate-400 font-mono">Total Customers</div>
                <div className="text-xl font-black text-slate-100 font-mono">{totalCustomers}</div>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-500 flex justify-between">
              <span>Retail: {retailCount}</span>
              <span>Wholesale: {wholesaleCount}</span>
            </div>
          </div>

          <div className="p-4 bg-slate-900/90 border border-amber-500/30 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Star className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="text-xs text-slate-400 font-mono">VIP Customers</div>
                <div className="text-xl font-black text-amber-400 font-mono">{vipCount}</div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-900/90 border border-emerald-500/30 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="text-xs text-slate-400 font-mono">Corporate</div>
                <div className="text-xl font-black text-emerald-400 font-mono">{corporateCount}</div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-900/90 border border-purple-500/30 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <Award className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <div className="text-xs text-slate-400 font-mono">Total Points</div>
                <div className="text-xl font-black text-purple-400 font-mono">{totalPoints}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setTypeFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
                typeFilter === "all"
                  ? "bg-cyan-500 text-slate-950"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              }`}
            >
              All ({totalCustomers})
            </button>
            <button
              onClick={() => setTypeFilter("Retail")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
                typeFilter === "Retail"
                  ? "bg-blue-500 text-white"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              }`}
            >
              Retail ({retailCount})
            </button>
            <button
              onClick={() => setTypeFilter("Wholesale")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
                typeFilter === "Wholesale"
                  ? "bg-purple-500 text-white"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              }`}
            >
              Wholesale ({wholesaleCount})
            </button>
            <button
              onClick={() => setTypeFilter("VIP")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
                typeFilter === "VIP"
                  ? "bg-amber-500 text-slate-950"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              }`}
            >
              VIP ({vipCount})
            </button>
            <button
              onClick={() => setTypeFilter("Corporate")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
                typeFilter === "Corporate"
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              }`}
            >
              Corporate ({corporateCount})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name, phone, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono w-full"
            />
          </div>
        </div>
      </div>

      {/* Customer Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] text-slate-400 uppercase tracking-wider">
                <th className="p-3.5 font-sans">Customer Name</th>
                <th className="p-3.5">Type</th>
                <th className="p-3.5">Contact</th>
                <th className="p-3.5">Location</th>
                <th className="p-3.5 text-center">Points</th>
                <th className="p-3.5 text-right">Credit Balance</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Loading customers...
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No customers found. Add your first customer!
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-800/40 transition">
                    {/* Name */}
                    <td className="p-3.5 font-sans">
                      <div className="font-semibold text-slate-100 flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-cyan-400" />
                        {customer.name}
                      </div>
                      {customer.gstin && (
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          GSTIN: {customer.gstin}
                        </div>
                      )}
                    </td>

                    {/* Type */}
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getCustomerTypeColor(customer.customerType)}`}>
                        {customer.customerType || "Retail"}
                      </span>
                    </td>

                    {/* Contact */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Phone className="w-3 h-3 text-slate-500" />
                        {customer.phone}
                      </div>
                      {customer.email && (
                        <div className="flex items-center gap-1.5 text-slate-400 text-[10px] mt-0.5">
                          <Mail className="w-3 h-3 text-slate-500" />
                          {customer.email}
                        </div>
                      )}
                    </td>

                    {/* Location */}
                    <td className="p-3.5">
                      {customer.city || customer.state ? (
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          {customer.city && customer.state
                            ? `${customer.city}, ${customer.state}`
                            : customer.city || customer.state}
                        </div>
                      ) : (
                        <span className="text-slate-600 text-xs">—</span>
                      )}
                    </td>

                    {/* Points */}
                    <td className="p-3.5 text-center">
                      {customer.points && customer.points > 0 ? (
                        <span className="text-purple-400 font-bold">{customer.points}</span>
                      ) : (
                        <span className="text-slate-600">0</span>
                      )}
                    </td>

                    {/* Credit Balance */}
                    <td className="p-3.5 text-right">
                      {customer.creditBalance && customer.creditBalance > 0 ? (
                        <span className="text-red-400 font-bold">₹{customer.creditBalance.toFixed(2)}</span>
                      ) : (
                        <span className="text-slate-600">₹0.00</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => openEditModal(customer)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-lg text-xs flex items-center gap-1 mx-auto transition"
                      >
                        <Edit className="w-3 h-3" />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Plus className="w-5 h-5 text-cyan-400" />
                Add New Customer
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 font-mono mb-1.5 block">
                    Customer Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-mono mb-1.5 block">
                    Phone Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, "") })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                    placeholder="10 digits"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 font-mono mb-1.5 block">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-mono mb-1.5 block">Customer Type</label>
                  <select
                    value={formData.customerType}
                    onChange={(e) => setFormData({ ...formData, customerType: e.target.value as CustomerTypeOption })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Retail">Retail</option>
                    <option value="Wholesale">Wholesale</option>
                    <option value="VIP">VIP</option>
                    <option value="Corporate">Corporate</option>
                  </select>
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="text-xs text-slate-400 font-mono mb-1.5 block">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                  placeholder="Street address"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-400 font-mono mb-1.5 block">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-mono mb-1.5 block">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-mono mb-1.5 block">Pincode</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, "") })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* GST & Financial */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 font-mono mb-1.5 block">GSTIN</label>
                  <input
                    type="text"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                    placeholder="15-character GSTIN"
                    maxLength={15}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-mono mb-1.5 block">Credit Limit</label>
                  <input
                    type="number"
                    value={formData.creditLimit}
                    onChange={(e) => setFormData({ ...formData, creditLimit: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                    min="0"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 font-mono mb-1.5 block">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-mono mb-1.5 block">Anniversary</label>
                  <input
                    type="date"
                    value={formData.anniversary}
                    onChange={(e) => setFormData({ ...formData, anniversary: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs text-slate-400 font-mono mb-1.5 block">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                  placeholder="Internal notes, preferences, etc."
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6 pt-4 border-t border-slate-800">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCustomer}
                className="flex-1 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition"
              >
                <Save className="w-4 h-4" />
                Add Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Modal (Similar to Add, but with update logic) */}
      {isEditModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Edit className="w-5 h-5 text-cyan-400" />
                Edit Customer
              </h3>
              <button onClick={() => { setIsEditModalOpen(false); setSelectedCustomer(null); }} className="text-slate-500 hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              {/* Same form fields as Add Modal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 font-mono mb-1.5 block">
                    Customer Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-mono mb-1.5 block">
                    Phone Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, "") })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                    placeholder="10 digits"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 font-mono mb-1.5 block">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-mono mb-1.5 block">Customer Type</label>
                  <select
                    value={formData.customerType}
                    onChange={(e) => setFormData({ ...formData, customerType: e.target.value as CustomerTypeOption })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Retail">Retail</option>
                    <option value="Wholesale">Wholesale</option>
                    <option value="VIP">VIP</option>
                    <option value="Corporate">Corporate</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-mono mb-1.5 block">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                  placeholder="Street address"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-400 font-mono mb-1.5 block">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-mono mb-1.5 block">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-mono mb-1.5 block">Pincode</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, "") })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 font-mono mb-1.5 block">GSTIN</label>
                  <input
                    type="text"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                    placeholder="15-character GSTIN"
                    maxLength={15}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-mono mb-1.5 block">Credit Limit</label>
                  <input
                    type="number"
                    value={formData.creditLimit}
                    onChange={(e) => setFormData({ ...formData, creditLimit: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                    min="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-400 font-mono mb-1.5 block">Points</label>
                  <input
                    type="number"
                    value={formData.points}
                    onChange={(e) => setFormData({ ...formData, points: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                    min="0"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-mono mb-1.5 block">Credit Balance</label>
                  <input
                    type="number"
                    value={formData.creditBalance}
                    onChange={(e) => setFormData({ ...formData, creditBalance: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                    min="0"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-mono mb-1.5 block">Credit Limit</label>
                  <input
                    type="number"
                    value={formData.creditLimit}
                    onChange={(e) => setFormData({ ...formData, creditLimit: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                    min="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 font-mono mb-1.5 block">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-mono mb-1.5 block">Anniversary</label>
                  <input
                    type="date"
                    value={formData.anniversary}
                    onChange={(e) => setFormData({ ...formData, anniversary: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-mono mb-1.5 block">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                  placeholder="Internal notes, preferences, etc."
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6 pt-4 border-t border-slate-800">
              <button
                onClick={() => { setIsEditModalOpen(false); setSelectedCustomer(null); }}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateCustomer}
                className="flex-1 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition"
              >
                <Save className="w-4 h-4" />
                Update Customer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
