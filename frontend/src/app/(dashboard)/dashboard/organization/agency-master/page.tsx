"use client";

import { Building2, Plus, Search, Edit, Trash2 } from "lucide-react";
import Link from "next/link";

export default function AgencyMasterPage() {
  // Mock data - will be replaced with real data
  const agencies = [
    { id: 1, name: "Agency One", code: "AG001", email: "agency1@email.com", phone: "+1 234 567 8900", status: "Active" },
    { id: 2, name: "Agency Two", code: "AG002", email: "agency2@email.com", phone: "+1 234 567 8901", status: "Active" },
    { id: 3, name: "Agency Three", code: "AG003", email: "agency3@email.com", phone: "+1 234 567 8902", status: "Inactive" },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Link href="/dashboard/organization" className="hover:text-blue-600">
              Organization
            </Link>
            <span>/</span>
            <span className="text-slate-900">Agency Master</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Agency Master</h1>
          <p className="text-slate-500">Manage all agencies and their details</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
          <Plus size={18} />
          Add Agency
        </button>
      </div>

      {/* Search and Filter */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search agencies..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <select className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white">
            <option>All Status</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {agencies.map((agency) => (
                <tr key={agency.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Building2 size={16} className="text-slate-400" />
                      <span className="font-medium text-slate-900">{agency.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{agency.code}</td>
                  <td className="px-6 py-4 text-slate-600">{agency.email}</td>
                  <td className="px-6 py-4 text-slate-600">{agency.phone}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      agency.status === "Active" 
                        ? "bg-green-100 text-green-700" 
                        : "bg-red-100 text-red-700"
                    }`}>
                      {agency.status}
                    </span>
                  </td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}