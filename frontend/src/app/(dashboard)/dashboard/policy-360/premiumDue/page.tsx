"use client";

import { useState, useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "@/store/store";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useRouter} from "next/navigation";
import { Seal } from "@/features/customers/pages/CustomerListPage";

import Link from "next/link";
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  AlertCircle,
  Landmark,
  HandCoins,
  Banknote,
  Activity,
  FileText,
  Icon,
  Filter,
  ArrowRight,
  ArrowDown,
  RotateCcw,
  ArrowLeft
} from "lucide-react";
import { fetchLoans, deleteLoan } from "@/features/loans/loanSlice";
import toast from "react-hot-toast";
import { fetchPolicies, deletePolicy, Policy } from "@/features/policy/policySlice";
import {
  CustomerSectionCard,
  CustomerBreadcrumbs,
} from "@/features/customers/components/CustomerUi";
import { EMPTY_FILTERS, LapsedPolicyFilters , FilterDrawer } from "@/features/policy360/FilterDrawer";

export default function PremiumDuePage()
{
    const [searchTerm, setSearchTerm] = useState("");
      const [isFilterOpen, setIsFilterOpen] = useState(false);
      const [filters, setFilters] = useState<LapsedPolicyFilters>(EMPTY_FILTERS);
      const [appliedFilters, setAppliedFilters] =
        useState<LapsedPolicyFilters>(EMPTY_FILTERS);
      const [currentPage, setCurrentPage] = useState(1);
      const [itemsPerPage, setItemsPerPage] = useState(10);
    const dispatch = useDispatch<AppDispatch>();
    const [selectedPolicy,setSelectedPolicy] = useState<Policy>()
    const [policyModal,setPolicyModal] = useState(true)

    const { policies, isLoading } = useSelector(
    (state: RootState) => state.policies,
  );

    const filteredPolicies = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        return policies.filter((policy) => {
          // Search bar filter (case-insensitive, partial-match)
          if (query) {
            const searchable = [
              policy.policyNumber,
              policy.CustomerMaster?.firstName,
              policy.CustomerMaster?.lastName,
              policy.customer?.groupCode,
              policy.product?.productName,
              //policy.customer?.contactInfo?.mobile1,
            ]
              .join(" ")
              .toLowerCase();
            if (!searchable.includes(query)) return false;
          }
    
          // Drawer filters (AND logic)
          const {
            policyHolderName,
            policyNumber,
            planName,
            groupCode,
            premiumAmount,
            sumAssured,
          } = appliedFilters;
    
          if (
            policyHolderName &&
            !policy.CustomerMaster?.firstName.toLowerCase().includes(policyHolderName.toLowerCase()) &&
            !policy.CustomerMaster?.lastName.toLowerCase().includes(policyHolderName.toLowerCase())
          ) {
            return false;
          }
          if (
            policyNumber &&
            !policy.policyNumber.toLowerCase().includes(policyNumber.toLowerCase())
          ) {
            return false;
          }
          if (
            planName &&
            !policy?.product?.productName.toLowerCase().includes(planName.toLowerCase())
          ) {
            return false;
          }
          if (
            groupCode &&
            !policy.customer?.groupCode?.toLowerCase().includes(groupCode.toLowerCase())
          ) {
            return false;
          }
          if (
            premiumAmount &&
            !policy.premium?.basicYearlyPremium?.toString().toLowerCase().includes(premiumAmount.toLowerCase())
          ) {
            return false;
          }
          if (
            sumAssured &&
            !policy?.premium?.sumAssured.toString().toLowerCase().includes(sumAssured.toLowerCase())
          ) {
            return false;
          }
    
          return true;
        });
      }, [searchTerm, appliedFilters]);
    
      const totalPages = Math.max(
        1,
        Math.ceil(filteredPolicies.length / itemsPerPage),
      );
      const safePage = Math.min(currentPage, totalPages);
      const paginatedPolicies = filteredPolicies.slice(
        (safePage - 1) * itemsPerPage,
        safePage * itemsPerPage,
      );
    
      const handleApplyFilters = () => {
        setAppliedFilters(filters);
        setIsFilterOpen(false);
        setCurrentPage(1);
      };
    
      const handleClearAll = () => {
        setFilters(EMPTY_FILTERS);
        setAppliedFilters(EMPTY_FILTERS);
        setCurrentPage(1);
      };
    
      const handleReset = () => {
        setSearchTerm("");
        setFilters(EMPTY_FILTERS);
        setAppliedFilters(EMPTY_FILTERS);
        setCurrentPage(1);
      };
    
      const handleItemsPerPageChange = (value: number) => {
        setItemsPerPage(value);
        setCurrentPage(1);
      };
    
    const [infoModals,setInfoModals] = useState({
        policyDetails : false,
        premiumAndpayment : false,
        ridersAndBenefits : false,
        loansAndAdvances : false,
        reports : false
    })

    const openModal = (modalName : string) => {
    setInfoModals({
        policyDetails: false,
        premiumAndpayment: false,
        ridersAndBenefits: false,
        loansAndAdvances: false,
        reports: false,
        [modalName]: !(infoModals[modalName])
    });
    };

    useEffect(() => {
        dispatch(fetchPolicies());
        dispatch(fetchLoans());
      }, [dispatch]);

       

  const { loans } = useSelector((state: RootState) => state.loans);

  function getLoanDetails(policyId : string)
  {
    const loan = loans.find(l => l.policyId == policyId)
    
  }

  const [modal,setmodal] = useState(false)

  function PolicyModal()
  {
    const policyLoanDetails = getLoanDetails(selectedPolicy!.id);
    console.log(policyLoanDetails)
    const data = [{
        key : "policyDetails",
        title : "Policy Details",
        attributes : [
            {"Customer :" : `${selectedPolicy?.CustomerMaster?.firstName} ${selectedPolicy?.CustomerMaster?.lastName}`},
            {"Mobile Number :" : "9005551235"},
            {"Date Of Birth :" :  new Date(selectedPolicy!.CustomerMaster!.dob!).toLocaleDateString("en-IN") },
            {"Gender :" : selectedPolicy?.CustomerMaster?.gender},
            {"Plan Name :" : selectedPolicy?.product?.productName},
            {"Mode :" : selectedPolicy?.premiumMode?.modeName},
            {"Plan Term :" : selectedPolicy?.policyTerm},
            {"PPT :" : selectedPolicy?.premiumPayingTerm},
            {"Sum Assured" : selectedPolicy?.premium?.sumAssured},
            {"Premium :" : selectedPolicy?.premium?.basicYearlyPremium},
            {"Commencement Date :" : new Date(selectedPolicy!.commencementDate).toLocaleDateString("en-IN")},
            {"Maturity Date :" : new Date(selectedPolicy!.maturityDate!).toLocaleDateString("en-IN")}
        ],
    },
    {
        key : "premiumAndPayment",
        title : "Premium And Payment",
        attributes : [
            {"Outstanding Premium :" : 500},
            {"Late fees" : 500},
            {"Next Due Date" : new Date(selectedPolicy!.commencementDate).toLocaleDateString("en-IN")},
            {"Total Premium Paid :" : 55555},
            {"Last Premium Paid Date :" : new Date(selectedPolicy!.commencementDate).toLocaleDateString("en-IN")}
        ],
    },
    {
        key: "ridersAndBenefits",
        title : "Riders And benefits",
        attributes : [{policyNumber : selectedPolicy?.policyNumber},{startDate : selectedPolicy?.commencementDate}],
    },
    {
        key : "loansAndAdvances",
        title : "Loans And Advances",
        attributes : [
            {"Loan Available :" : 100},
            {"Loan outstanding :" : "NA"}
        ],
    },
    {
        key : "reports",
        title : "Reports",
        attributes : [{policyNumber : selectedPolicy?.policyNumber},{startDate : selectedPolicy?.commencementDate}],
    }
]

    return(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-[80%] p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex rounded-2xl p-4 justify-between bg-gradient-to-r from-[#0B1220] via-[#132342] to-[#16294D] text-[#E8C77A]">
                    <h2>Policy Number - {selectedPolicy?.policyNumber}</h2>
                    <button className="cursor-pointer" onClick={() => {setmodal(false)}}>Close</button>
                </div>
                <div className="flex flex-col gap-4 mt-5">
                {
                    data.map((d) => {
                        return(
                            <div key={d.title} className="rounded-2xl p-4 justify-between bg-gradient-to-r from-[#0B1220] via-[#132342] to-[#16294D] text-[#E8C77A]">
                                <div className="flex justify-between">
                                    <p className="font-semibold">{d.title}</p>
                                    <button className="cursor-pointer" onClick={() => {openModal(d.title)}}>{infoModals[d.title] ? <ArrowDown/> : <ArrowRight/>}</button>
                                </div>
                                {infoModals[d.title] &&
                                    (<div className="grid grid-cols-4 gap-4 mt-3">
                                        {d.attributes.map((attribute,index) => {
                                            const [key, value] = Object.entries(attribute)[0];
                                            return (
                                            <div key={index}>
                                               
                                                    <p className="font-semibold">{key}</p>
                                                    <p>{value}</p>
                                                
                                            </div>
                                            );
                                        })}
                                    </div>)
                                }
                            </div>
                        )
                    })
                }
                </div>
            </div>
        </div>
    )
  }

    return(
        <div className="max-w-7xl mx-auto">
             {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B1220] text-[#E8C77A]">
                    <Landmark />
                    </span>
                    <span>
                    <h1 className="text-2xl font-serif font-semibold tracking-tight text-slate-900">
                        Premium Due <span className="text-sm">(Next 30 days)</span>
                    </h1>
                    </span>
                </div>
            </div>
            {/* Search Area */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <Link
          href="/dashboard/policy-360"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft size={16} /> Back
        </Link>
        <div className="relative w-full flex-1 lg:max-w-2xl">
          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search: Policy Number, Customer Name, Group Code..."
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-[#B8873A] focus:ring-2 focus:ring-[#B8873A]/15"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            title="Reset"
          >
            <RotateCcw size={16} />
          </button>
          <button
            type="button"
            onClick={() => setIsFilterOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            title="Filter"
          >
            <Filter size={16} />
          </button>
        </div>
      </div>
            <div>
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="sticky top-0 z-10 w-[110px] px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                            Policy Number
                            </th>
                            <th className="sticky top-0 z-10 w-[110px] px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                            Customer Name
                            </th>
                            <th className="sticky top-0 z-10 w-[110px] px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                            Group Code
                            </th>
                            <th className="sticky top-0 z-10 w-[110px] px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                            Plan
                            </th>
                            <th className="sticky top-0 z-10 w-[110px] px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                            Premium
                            </th>
                            <th className="sticky top-0 z-10 w-[110px] px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                            Sum Assured 
                            </th>
                            <th className="sticky top-0 z-10 w-[110px] px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                            Due Date
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {
                            filteredPolicies.map((p) => {
                                return(
                                    <tr key={p.id}>
                                        <td onClick={() => {
                                            setmodal(true);
                                            const selectedPolicy = policies.find(policy => policy.id == p?.id)
                                            setSelectedPolicy(selectedPolicy);
                                            getLoanDetails(selectedPolicy!.id);
                                        }} 
                                            className="whitespace-nowrap px-4 py-4 align-top text-sm font-semibold text-slate-900">
                                            {p.policyNumber}
                                        </td>
                                        <td >
                                            {`${p.CustomerMaster?.firstName} ${p.CustomerMaster?.lastName}`}
                                        </td>
                                        <td className="min-w-[100px] px-4 py-4 align-top text-sm text-slate-800">
                                            {`${p.customer?.groupCode}`}
                                        </td>
                                        <td className="min-w-[200px] whitespace-normal break-words px-4 py-4 align-top text-sm text-slate-800">
                                            {`${p.product?.productName}`}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-4 align-top text-sm font-semibold text-slate-900">
                                            ₹ {`${p.premium?.basicYearlyPremium?.toLocaleString("en-IN")}`}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-4 align-top text-sm font-semibold text-slate-900">
                                            ₹ {`${p.premium?.sumAssured.toLocaleString("en-IN")}`}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-4 align-top text-sm text-slate-800">
                                            {p.commencementDate
                                                ? new Date(
                                                    p.commencementDate,
                                                ).toLocaleDateString("en-IN")
                                                : "N/A"}
                                        </td>
                                    </tr>
                                )
                            })
                        }
                    </tbody>
                </table>
                {
                    modal &&
                    <PolicyModal/>
                }
            </div>
            <FilterDrawer
                    open={isFilterOpen}
                    filters={filters}
                    onClose={() => setIsFilterOpen(false)}
                    onChange={setFilters}
                    onApply={handleApplyFilters}
                    onClear={handleClearAll}
                  />
        </div>
    )
}