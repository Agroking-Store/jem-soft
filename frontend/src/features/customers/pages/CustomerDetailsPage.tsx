"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter, useParams } from "next/navigation";
import type { RootState, AppDispatch } from "@/store/store";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { fetchCustomer, deleteCustomer } from "@/features/customers/customerSlice";
import {
  ArrowLeft,
  User,
  Building2,
  Mail,
  Phone,
  Calendar,
  Edit,
  Trash2,
  Clock,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function CustomerDetailsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { user } = useAuth();
  const { currentCustomer, isLoading, error } = useSelector((s: RootState) => s.customers);

  const [isMounted, setIsMounted] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (id) {
      dispatch(fetchCustomer(id));
    }
  }, [dispatch, id]);

  const canEdit = isMounted && (user?.role === "ADMIN" || user?.role === "ADVISOR");

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await dispatch(deleteCustomer(id)).unwrap();
      toast.success("Customer deleted successfully");
      router.push("/dashboard/customers");
    } catch (err: any) {
      toast.error(err || "Failed to delete customer");
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (!isMounted || (isLoading && !currentCustomer)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error && !currentCustomer) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16 px-4">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Error Loading Customer</h3>
        <p className="text-slate-500 mb-6">{error}</p>
        <Link
          href="/dashboard/customers"
          className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors"
        >
          Back to Customers
        </Link>
      </div>
    );
  }

  const createdDate = currentCustomer?.createdAt
    ? new Date(currentCustomer.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  const updatedDate = currentCustomer?.updatedAt
    ? new Date(currentCustomer.updatedAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button & Action buttons */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/customers"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to Customers</span>
        </Link>

        {canEdit && currentCustomer && (
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/customers/${currentCustomer.id}/edit`}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold text-sm transition-colors shadow-sm"
            >
              <Edit size={15} />
              <span>Edit</span>
            </Link>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 border border-red-200 hover:bg-red-50 text-red-650 rounded-lg font-semibold text-sm transition-colors shadow-sm"
            >
              <Trash2 size={15} />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Details Card */}
      {currentCustomer && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200 p-6 sm:p-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-bold shadow-sm">
                {currentCustomer.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{currentCustomer.name}</h1>
                {currentCustomer.companyName && (
                  <p className="text-slate-500 font-medium mt-1 flex items-center gap-1.5">
                    <Building2 size={16} />
                    <span>{currentCustomer.companyName}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Details Content */}
          <div className="p-6 sm:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Contact Information */}
              <div className="space-y-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                  Contact Details
                </h3>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
                    <Mail size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Email Address</p>
                    <p className="text-slate-900 font-medium mt-0.5">{currentCustomer.email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
                    <Phone size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Phone Number</p>
                    <p className="text-slate-900 font-medium mt-0.5">{currentCustomer.phone}</p>
                  </div>
                </div>
              </div>

              {/* Account Metadata */}
              <div className="space-y-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                  Account details
                </h3>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Created At</p>
                    <p className="text-slate-900 font-medium mt-0.5">{createdDate}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
                    <Clock size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Last Updated</p>
                    <p className="text-slate-900 font-medium mt-0.5">{updatedDate}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
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
                onClick={() => setShowDeleteModal(false)}
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
