"use client";

import { Building, Plus, Search, Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/features/auth/hooks/useAuth";

export default function BranchesPage() {
  const { user } = useAuth();
  const isViewer = user?.role === "VIEWER";
  const branches = [
    { id: 1, name: "Downtown Branch", code: "BR001", location: "New York, NY", phone: "+1 234 567 8900", status: "Active" },
    { id: 2, name: "Uptown Branch", code: "BR002", location: "Los Angeles, CA", phone: "+1 234 567 8901", status: "Active" },
    { id: 3, name: "Eastside Branch", code: "BR003", location: "Chicago, IL", phone: "+1 234 567 8902", status: "Inactive" },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Link href="/dashboard/organization" className="hover:text-blue-600">
              Organization
            </Link>
            <span>/</span>
            <span className="text-slate-900">Branches</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Branches</h1>
          <p className="text-slate-500">View and manage branch offices</p>
        </div>
        {!isViewer && (
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            <Plus size={18} />
            Add Branch
          </button>
        )}
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search branches..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                {!isViewer && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {branches.map((branch) => (
                <tr key={branch.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Building size={16} className="text-slate-400" />
                      <span className="font-medium text-slate-900">{branch.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{branch.code}</td>
                  <td className="px-6 py-4 text-slate-600">{branch.location}</td>
                  <td className="px-6 py-4 text-slate-600">{branch.phone}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      branch.status === "Active" 
                        ? "bg-green-100 text-green-700" 
                        : "bg-red-100 text-red-700"
                    }`}>
                      {branch.status}
                    </span>
                  </td>
                  {!isViewer && (
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition">
                          <Edit size={16} />
                        </button>
                        <button className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}