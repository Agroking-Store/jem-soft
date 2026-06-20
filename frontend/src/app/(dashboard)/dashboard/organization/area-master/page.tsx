"use client";

import { MapPin, Plus, Search, Edit, Trash2 } from "lucide-react";
import Link from "next/link";

export default function AreaMasterPage() {
  const areas = [
    { id: 1, name: "North Region", code: "AR001", description: "Northern territories", status: "Active" },
    { id: 2, name: "South Region", code: "AR002", description: "Southern territories", status: "Active" },
    { id: 3, name: "East Region", code: "AR003", description: "Eastern territories", status: "Inactive" },
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
            <span className="text-slate-900">Area Master</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Area Master</h1>
          <p className="text-slate-500">Manage geographical areas and regions</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
          <Plus size={18} />
          Add Area
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search areas..."
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
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {areas.map((area) => (
                <tr key={area.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-slate-400" />
                      <span className="font-medium text-slate-900">{area.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{area.code}</td>
                  <td className="px-6 py-4 text-slate-600">{area.description}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      area.status === "Active" 
                        ? "bg-green-100 text-green-700" 
                        : "bg-red-100 text-red-700"
                    }`}>
                      {area.status}
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