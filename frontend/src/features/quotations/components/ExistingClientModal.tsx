"use client";

import React, { useState, useEffect, useMemo } from "react";
import { X, Search, Filter } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store/store";
import { fetchCustomersMaster } from "@/features/customers/customerMasterSlice";

interface ExistingClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectClient: (client: {
    memberId: string;
    customerId?: string;
    groupCode?: string;
    title?: string;
    fullName: string;
    gender: string;
    dob: string;
    age: number;
  }) => void;
}

export const ExistingClientModal: React.FC<ExistingClientModalProps> = ({
  isOpen,
  onClose,
  onSelectClient,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { customers, isLoading } = useSelector((state: RootState) => state.customerMaster);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState<"groupCode" | "groupMember" | "groupHeadName">("groupCode");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 11;

  useEffect(() => {
    if (isOpen && customers.length === 0) {
      dispatch(fetchCustomersMaster());
    }
  }, [isOpen, customers.length, dispatch]);

  const clientRows = useMemo(() => {
    return customers.map((c: any) => {
      const groupCode = c.group?.groupCode || "-";
      const groupHeadName = c.group?.groupName || (c.isGroupHead ? `${c.lastName || ""} ${c.firstName || ""}`.trim() : "-");
      const fullName = [c.firstName, c.middleName, c.lastName].filter(Boolean).join(" ");
      
      return {
        id: c.id,
        groupId: c.groupId,
        groupCode,
        groupMember: fullName,
        groupHeadName,
        salutation: c.salutation || "Mr.",
        gender: c.gender === "Female" || c.gender === "F" ? "Female" : "Male",
        dob: c.dob ? new Date(c.dob).toISOString().split("T")[0] : "",
        rawDob: c.dob,
      };
    });
  }, [customers]);

  const filteredClients = useMemo(() => {
    if (!searchTerm.trim()) return clientRows;
    const term = searchTerm.toLowerCase();

    return clientRows.filter((client) => {
      if (searchField === "groupCode") {
        return client.groupCode.toLowerCase().includes(term);
      }
      if (searchField === "groupMember") {
        return client.groupMember.toLowerCase().includes(term);
      }
      if (searchField === "groupHeadName") {
        return client.groupHeadName.toLowerCase().includes(term);
      }
      return (
        client.groupCode.toLowerCase().includes(term) ||
        client.groupMember.toLowerCase().includes(term) ||
        client.groupHeadName.toLowerCase().includes(term)
      );
    });
  }, [clientRows, searchTerm, searchField]);

  const totalRecords = filteredClients.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRecords);
  const currentData = filteredClients.slice(startIndex, endIndex);

  const calculateAge = (dobString: string) => {
    if (!dobString) return 30;
    const dob = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return Math.max(0, age);
  };

  const handleSelectAndClose = () => {
    if (!selectedMemberId) {
      if (currentData.length > 0) {
        // Default to first item if none clicked
        const item = currentData[0];
        const age = calculateAge(item.dob);
        onSelectClient({
          memberId: item.id,
          customerId: item.groupId,
          groupCode: item.groupCode,
          title: item.salutation,
          fullName: item.groupMember,
          gender: item.gender,
          dob: item.dob,
          age,
        });
      }
      onClose();
      return;
    }

    const item = clientRows.find((c) => c.id === selectedMemberId);
    if (item) {
      const age = calculateAge(item.dob);
      onSelectClient({
        memberId: item.id,
        customerId: item.groupId,
        groupCode: item.groupCode,
        title: item.salutation,
        fullName: item.groupMember,
        gender: item.gender,
        dob: item.dob,
        age,
      });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] border border-slate-300 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-blue-200">
          <h2 className="text-xl font-semibold text-blue-900 tracking-tight">
            Existing Client List
          </h2>
          <button
            onClick={onClose}
            className="text-blue-900 hover:text-red-600 transition-colors p-1"
          >
            <X size={22} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search..."
              className="w-full pl-3 pr-9 py-1.5 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
            <Search
              size={18}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-blue-600"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-600">In</span>
            <select
              value={searchField}
              onChange={(e: any) => setSearchField(e.target.value)}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded bg-white font-medium text-slate-700 focus:ring-1 focus:ring-blue-500"
            >
              <option value="groupCode">Group Code</option>
              <option value="groupMember">Group Member</option>
              <option value="groupHeadName">Group Head Name</option>
            </select>
            <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded border border-transparent">
              <Filter size={18} />
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {isLoading ? (
            <div className="py-12 text-center text-slate-500">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-2"></div>
              <p className="text-sm">Loading clients...</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-y border-blue-200">
                  <th className="py-2 px-4 font-semibold text-blue-900 border-r border-blue-100 w-1/4">
                    Group Code
                  </th>
                  <th className="py-2 px-4 font-semibold text-blue-900 border-r border-blue-100 w-2/5">
                    Group Member
                  </th>
                  <th className="py-2 px-4 font-semibold text-blue-900 w-1/3">
                    Group Head Name
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentData.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-400">
                      No client records found.
                    </td>
                  </tr>
                ) : (
                  currentData.map((client) => {
                    const isSelected = selectedMemberId === client.id;
                    return (
                      <tr
                        key={client.id}
                        onClick={() => setSelectedMemberId(client.id)}
                        onDoubleClick={handleSelectAndClose}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-blue-100/80 font-medium text-blue-900"
                            : "hover:bg-slate-50 text-slate-800"
                        }`}
                      >
                        <td className="py-2 px-4 border-r border-slate-100">
                          {client.groupCode}
                        </td>
                        <td className="py-2 px-4 border-r border-slate-100">
                          {client.groupMember}
                        </td>
                        <td className="py-2 px-4">{client.groupHeadName}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal Footer / Pagination */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs font-semibold text-slate-700">
            {totalRecords > 0
              ? `${startIndex + 1} - ${endIndex} of ${totalRecords}`
              : "0 of 0"}
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-2 py-1 text-slate-600 disabled:opacity-30 hover:bg-slate-200 rounded"
            >
              |&lt;
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2 py-1 text-slate-600 disabled:opacity-30 hover:bg-slate-200 rounded"
            >
              Prev
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum = currentPage;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-2.5 py-1 rounded font-medium ${
                    currentPage === pageNum
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-2 py-1 text-slate-600 disabled:opacity-30 hover:bg-slate-200 rounded"
            >
              Next
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-2 py-1 text-slate-600 disabled:opacity-30 hover:bg-slate-200 rounded"
            >
              &gt;|
            </button>
          </div>

          <button
            onClick={handleSelectAndClose}
            className="px-5 py-1.5 text-sm font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border border-slate-300 rounded shadow-sm transition-all"
          >
            Select & Close
          </button>
        </div>
      </div>
    </div>
  );
};
