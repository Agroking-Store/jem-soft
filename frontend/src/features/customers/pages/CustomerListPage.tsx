"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import type { RootState, AppDispatch } from "@/store/store";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { fetchCustomers, deleteCustomer } from "@/features/customers/customerSlice";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  User,
  Building2,
  Mail,
  Phone,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function CustomerListPage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { user } = useAuth();
  const { customers, isLoading, error } = useSelector((s: RootState) => s.customers);

  const [searchTerm, setSearchTerm] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    dispatch(fetchCustomers());
  }, [dispatch]);

  const canEdit = isMounted && (user?.role === "ADMIN" || user?.role === "ADVISOR");

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.companyName && c.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await dispatch(deleteCustomer(deleteId)).unwrap();
      toast.success("Customer deleted successfully");
    } catch (err: any) {
      toast.error(err || "Failed to delete customer");
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Customer Management</h1>
          <p className="text-slate-500 text-sm mt-1">
            Create, view, edit, and manage all external customers.
          </p>
        </div>
        {canEdit && (
          <Link
            href="/dashboard/customers/new"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm shadow-sm transition-all duration-200 shrink-0"
          >
            <Plus size={16} />
            <span>Add Customer</span>
          </Link>
        )}
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search customers by name, email, or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-10 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 shrink-0">
            Total: {filteredCustomers.length} customers
          </div>
        </div>

        {/* Table View */}
        {isLoading && customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
            <p className="text-sm text-slate-500">Loading customers...</p>
          </div>
        ) : error && customers.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="inline-flex p-3 bg-red-50 text-red-650 rounded-xl mb-3">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-lg font-semibold text-slate-950 mb-1">Failed to Load Customers</h3>
            <p className="text-sm text-slate-505 max-w-md mx-auto mb-4">{error}</p>
            <button
              onClick={() => dispatch(fetchCustomers())}
              className="text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              Try Again
            </button>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="inline-flex p-3 bg-slate-50 text-slate-400 rounded-xl mb-3">
              <User size={24} />
            </div>
            <h3 className="text-lg font-semibold text-slate-950 mb-1">No Customers Found</h3>
            <p className="text-sm text-slate-505 max-w-md mx-auto">
              {searchTerm ? "No customers match your search criteria." : "Get started by adding your first customer."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Customer Info</th>
                  <th className="py-4 px-6">Company</th>
                  <th className="py-4 px-6">Phone</th>
                  <th className="py-4 px-6">Created</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {filteredCustomers.map((customer) => {
                  const createdDate = new Date(customer.createdAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });

                  return (
                    <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                            {customer.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{customer.name}</div>
                            <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                              <Mail size={12} />
                              <span>{customer.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-slate-600 font-medium">
                        {customer.companyName ? (
                          <div className="flex items-center gap-1.5">
                            <Building2 size={14} className="text-slate-400" />
                            <span>{customer.companyName}</span>
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-slate-505">
                        <div className="flex items-center gap-1.5">
                          <Phone size={14} className="text-slate-400" />
                          <span>{customer.phone}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-slate-505">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-slate-400" />
                          <span>{createdDate}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/dashboard/customers/${customer.id}`}
                            title="View Details"
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Eye size={16} />
                          </Link>
                          {canEdit && (
                            <>
                              <Link
                                href={`/dashboard/customers/${customer.id}/edit`}
                                title="Edit Customer"
                                className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              >
                                <Edit size={16} />
                              </Link>
                              <button
                                onClick={() => setDeleteId(customer.id)}
                                title="Delete Customer"
                                className="p-1.5 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-650 mb-4">
              <div className="p-2 bg-red-50 rounded-lg">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Delete Customer</h3>
            </div>
            <p className="text-sm text-slate-505 mb-6 leading-relaxed">
              Are you sure you want to delete this customer? This action is permanent and will completely remove the customer's access to the portal.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                disabled={isDeleting}
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors flex items-center gap-2"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
