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
  ArrowLeft,
  X
} from "lucide-react";
import { fetchLoans, deleteLoan } from "@/features/loans/loanSlice";
import toast from "react-hot-toast";
import { fetchPolicies, deletePolicy, Policy } from "@/features/policy/policySlice";
import {
  CustomerSectionCard,
  CustomerBreadcrumbs,
} from "@/features/customers/components/CustomerUi";
import { EMPTY_FILTERS, LapsedPolicyFilters , FilterDrawer } from "@/features/policy360/FilterDrawer";
import { fetchPolicyById } from "@/features/policy/policySlice";
import { fetchCustomersMaster } from "@/features/customers/customerMasterSlice";

export default function PremiumDuePage()
{
    const [searchTerm, setSearchTerm] = useState("");
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filters, setFilters] = useState<LapsedPolicyFilters>(EMPTY_FILTERS);
    const [appliedFilters, setAppliedFilters] = useState<LapsedPolicyFilters>(EMPTY_FILTERS);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const dispatch = useDispatch<AppDispatch>();
    const [selectedPolicy,setSelectedPolicy] = useState<Policy>();
    const [policyLoan,setPolicyLoan] = useState({availableLoan : 0 , outstandingLoan : 0});

    const {
        customers: masterCustomers,
      } = useSelector((s: RootState) => s.customerMaster);


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
      }, [policies,searchTerm, appliedFilters]);
    
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
        dispatch(fetchCustomersMaster());
      }, [dispatch]);

       

  const { loans } = useSelector((state: RootState) => state.loans);


  const [modal,setmodal] = useState(false)

  const handlePolicyClick = async (policyId : string) => 
  {     
      const policyDetails = await dispatch(fetchPolicyById(policyId)).unwrap();
      setSelectedPolicy(policyDetails);
      setmodal(true);

      const loan = loans.find(l => l.policyId == policyId)

      const premium = Number(policyDetails.premium!.basicYearlyPremium ?? 0);
      
      const policyDuration = (new Date().getFullYear() - new Date(policyDetails.commencementDate)?.getFullYear());
      let gsv = 0;
      if(3 < policyDuration && policyDuration < 5)
      {
        //Guaranteed Surrender Value Factor
        gsv = 0.3
      }
      else if(5 < policyDuration && policyDuration < 10)
      {
        gsv = 0.5
      }
      else if(policyDuration > 10)
      {
        gsv = 0.9
      }
    
      const policySurrenderValue = ((premium * policyDuration) - (premium)) * gsv;

      const maxLoan =  policySurrenderValue * 0.9;

      setPolicyLoan({
        availableLoan : maxLoan,
        outstandingLoan : loan ? (loan.loanAmount - loan.totalLoanRepaidAmount) : 0
      })
     console.log(policyLoan);
  }

  function PolicyModal()
  {
    const customerContactDetails = masterCustomers.find((customer) => customer.id == selectedPolicy?.CustomerMasterId)?.contactInfo;
    const policyRiders = selectedPolicy?.policyRiders;
   

    function PolicyRiderSection()
    {
      if (!policyRiders || policyRiders.length === 0) {
        return (
          <div className="p-5">
            <p>No riders Available for this Policy</p>
          </div>
        );
      }

      return(
        <div>
          <div className="p-5 grid grid-cols-3">
            {         
              policyRiders?.map((pr, idx) => {
                return(
                  <div key={(pr as any).id ?? idx} className="contents">
                    <span className="mt-5">{idx+1}) Rider Plan Name :</span>
                    <span className="mt-5">Rider Amount :</span>
                    <span className="mt-5">Rider premium :</span>
                    <span>{pr.rider?.riderName}</span>
                    <span>{pr.riderAmount}</span>
                    <span>{pr.riderPremium}</span>
                  </div>
                )
              })
            }
          </div>
        </div>
      )
    }

    const data = [{
        key : "policyDetails",
        title : "Policy Details",
        attributes : [
            {"Customer :" : `${selectedPolicy?.CustomerMaster?.firstName} ${selectedPolicy?.CustomerMaster?.lastName}`},
            {"Mobile Number :" : customerContactDetails?.mobile1},
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
        attributes : [
          //{"Rider Name :" : policyAllDetails},

        ],
    },
    {
        key : "loansAndAdvances",
        title : "Loans And Advances",
        attributes : [
            {"Loan Available :" : policyLoan.availableLoan},
            {"Loan outstanding :" : policyLoan.outstandingLoan}
        ],
    },
    {
        key : "reports",
        title : "Reports",
        attributes : [{"Sample Report 1 :" : "Report 1"}],
    }
]

    return(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-[80%] p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
                <div className="relative flex justify-between overflow-hidden items-center rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
                    <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent"></div>
                    <h2>Policy Number - {selectedPolicy?.policyNumber}</h2>
                    <div className="flex">
                      <button className="cursor-pointer bg-red-300 p-3 rounded-xl hover:bg-red-500" onClick={() => {setmodal(false)}}> <X/></button>
                    </div>
                </div>
                <div className="flex flex-col gap-4 mt-5">
                {
                    data.map((d) => {
                        return(                         
                            <div key={d.title} className="rounded-2xl p-4 justify-between bg-gradient-to-r from-[#0B1220] via-[#132342] to-[#16294D] text-[#E8C77A]">
                               {/* <PolicyRiderSection/> */}
                                <div className="flex justify-between">                               
                                    <p className="font-semibold">{d.title}</p>
                                    <button className="cursor-pointer" onClick={() => {openModal(d.title)}}>{infoModals[d.title] ? <ArrowDown/> : <ArrowRight/>}</button>
                                </div>
                                {
                                  d.title === "Riders And benefits" && infoModals[d.title]  ? 
                                  (<PolicyRiderSection/>) :           
                                   (infoModals[d.title] &&
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
                                    </div>) )                                       
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
      <div className="flex flex-row gap-3 p-4">
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
            className="inline-flex bg-[#0B1220] text-[#E8C77A] items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold cursor-pointer"
            title="Reset"
          >
            <RotateCcw size={16} />
          </button>
          <button
            type="button"
            onClick={() => setIsFilterOpen(true)}
            className="inline-flex bg-[#0B1220] text-[#E8C77A] items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold cursor-pointer"
            title="Filter"
          >
            <Filter size={16} />
          </button>
        </div>
      </div>
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#B8873A] via-[#B8873A]/40 to-transparent"></div>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Policy Number
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Customer Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Group Code
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Plan
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Premium
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Sum Assured 
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Due Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {
                    paginatedPolicies.map((p) => {
                        return(
                            <tr key={p.id}>
                                <td onClick={() => {
                                  console.log("Before :",selectedPolicy);
                                    handlePolicyClick(p.id);
                                }} 
                                    className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-slate-900 cursor-pointer">
                                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 font-mono font-semibold text-slate-700 hover:bg-slate-300">
                                      {p.policyNumber}
                                    </span>
                                </td>
                                <td className="whitespace-nowrap px-4 py-4 text-slate-900">
                                  <div className="flex gap-3 items-center text-left">
                                    <span className="text-sm text-slate-600">
                                      <Seal name={`${p.CustomerMaster?.firstName} ${p.CustomerMaster?.lastName}` || "-"} size={34} />
                                    </span>
                                    <span className="text-sm text-slate-600">
                                      {`${p.CustomerMaster?.firstName} ${p.CustomerMaster?.lastName}`}
                                    </span>
                                  </div>                              
                                </td>
                                <td className="px-4 py-4 text-sm text-slate-800">
                                  <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 font-mono text-xs font-semibold text-slate-700">
                                    {`${p.customer?.groupCode}`}
                                  </span>                                   
                                </td>
                                <td className="whitespace-normal break-words px-4 py-4 text-sm text-slate-800">
                                    {`${p.product?.productName}`}
                                </td>
                                <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-slate-900">
                                    ₹ {`${p.premium?.basicYearlyPremium?.toLocaleString("en-IN")}`}
                                </td>
                                <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-slate-900">
                                    ₹ {`${p.premium?.sumAssured.toLocaleString("en-IN")}`}
                                </td>
                                <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-800">
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
            </div>
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
        <div className="flex flex-col md:flex-row items-center justify-between px-4 py-3">
          {/* Left */}
          <p className="text-sm text-slate-500">
            Showing{" "}
            {filteredPolicies.length === 0
              ? 0
              : (currentPage - 1) * itemsPerPage + 1}
            {" - "}
            {Math.min(currentPage * itemsPerPage, filteredPolicies.length)}
            {" of "}
            {filteredPolicies.length} entries
          </p>

          {/* Right */}
          <div className="flex items-center gap-3 mt-3 md:mt-0">

            {/* Previous */}
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="w-9 h-9 rounded-lg border border-slate-200 disabled:opacity-50 hover:bg-slate-50"
            >
              &lt;
            </button>

          {/* Page Numbers */}
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(
                Math.max(0, currentPage - 2),
                Math.min(totalPages, currentPage + 1)
              )
              .map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-9 h-9 rounded-lg border text-sm ${currentPage === page
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-slate-200 hover:bg-slate-50"
                    }`}
                >
                  {page}
                </button>
              ))}

            {totalPages > 3 && currentPage < totalPages - 1 && (
              <>
                <span className="px-1 text-slate-400">...</span>

                <button
                  onClick={() => setCurrentPage(totalPages)}
                  className="w-9 h-9 rounded-lg border border-slate-200 hover:bg-slate-50"
                >
                  {totalPages}
                </button>
              </>
            )}
          </div>

          {/* Next */}
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="w-9 h-9 rounded-lg border border-slate-200 disabled:opacity-50 hover:bg-slate-50"
          >
            &gt;
          </button>

          {/* Rows Per Page */}
          <select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className="h-9 rounded-lg border border-slate-200 px-2 text-sm"
          >
            <option value={5}>5 / page</option>
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
          </select>

        </div>
        
      </div>
        </div>
    )
}