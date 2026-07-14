"use client";


import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { RootState, AppDispatch } from "@/store/store";
import {useSelector , useDispatch } from "react-redux";
import { createClaim } from "@/features/claim/claimSlice";
import { fetchPolicies, deletePolicy, Policy } from "@/features/policy/policySlice";
import { useState, useEffect, useMemo, useRef } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { format } from "date-fns";
import Link from "next/link";
import {
  ChevronRight,
  AlertCircle
} from "lucide-react";
import DatePicker from "../../lic/policies/new/DatePicker";
import toast from "react-hot-toast";


export default function NewClaimPage()
{

    const claimSchema = z.object({
  policyId: z.string().min(1, "Policy is required"),
  claimantName: z.string().min(3, "Claimant name is required"),
  claimType: z.string().min(1, "Claim type is required"),
  claimAmount: z.coerce
    .number()
    .positive("Claim amount must be greater than 0"),
  claimDate: z.string().min(1, "Claim date is required"),
});

 type ClaimFormData = z.infer<typeof claimSchema>;

 const dispatch = useDispatch<AppDispatch>();

 useEffect(() => {
  dispatch(fetchPolicies());
}, [dispatch]);

  const { policies} = useSelector(
        (state: RootState) => state.policies,
      );
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ClaimFormData>({
    resolver: zodResolver(claimSchema),
    defaultValues: {
      policyId: "",
      claimantName: "",
      claimType: "",
      claimAmount: 0,
      claimDate: "",
    },
  });

  //For confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [validatedData, setValidatedData] = useState<FormData | null>(null);
  const [selectedPolicy,setSelectedPolicy] = useState<Policy | null>(null);
  const policyRegister = register("policyId");

const onValid = (data: FormData) => {
  setValidatedData(data);
  setConfirmOpen(true);
};


  const onSubmit = async (data: ClaimFormData) => {
     if (!validatedData) return;
    try {
      await dispatch(createClaim(data)).unwrap();
      toast.success("Claim created successfully");
      reset();
      
    } catch (error) {
      toast.error("Failed to create claim")
    }
     setConfirmOpen(false);
  };

  return (
    <div>
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link
            href="/dashboard/claims"
            className="hover:text-blue-600"
          >
            Claims
          </Link>
          <ChevronRight size={16} />
          <span className="font-medium text-slate-700">
            New Claim
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mt-5">
          New Claim
        </h1>
        <p className="text-slate-500 text-sm mt-1">Record a new claim against a policy.</p>
      </div>
    
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
    <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="bg-white col-span-2 border border-slate-200 rounded-xl p-6 transition-all duration-500">
        <p className="text-xl font-bold">Claim Information</p>
        <div>
          <label className="block mt-5 text-slate-500 font-semibold">Policy
            <span className="text-red-500">*</span>
          </label>
          <select className="w-full px-3 py-2 border border-slate-200 rounded-lg 
          focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm" {...register("policyId")}
           onChange={(e) => {
          policyRegister.onChange(e); // Update React Hook Form

          const policy = policies.find(
            (p) => p.id === (e.target.value)
          );

          setSelectedPolicy(policy || null);
        }}
          >
              <option value="">Select Policy</option>
              {policies.map((policy) => {
              return(
              <option key={policy.id} value={policy.id}>
                {policy.policyNumber} - {policy.product?.productName}
              </option>
            )})}
          </select>
          <p className="text-xs text-red-500 mt-1">{errors.policyId?.message}</p>
        </div>
        <div className="bg-slate-50">
          <table className="w-full text-center mt-5">
            <thead>
             <tr>
              <th className="p-6 text-slate-500 font-semibold">Customer</th>
              <th className="p-6 text-slate-500 font-semibold">Sum assured</th>
              <th className="p-6 text-slate-500 font-semibold">Policy Status</th>
              <th className="p-6 text-slate-500 font-semibold">Policy Start Date</th>
             </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-bold p-3">
                  {selectedPolicy?.CustomerMaster?.firstName || "-"} {selectedPolicy?.CustomerMaster?.lastName}
                </td>
                <td className="font-bold p-3">
                  {selectedPolicy?.premium?.sumAssured || "-"} 
                </td>
                <td className="font-bold p-3">
                  {selectedPolicy?.status?.statusName || "-"} 
                </td>
                <td className="font-bold p-3">
                  {selectedPolicy?  new Date(selectedPolicy?.commencementDate).toLocaleDateString() : "-"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-5 w-full flex gap-6">
          <div className="flex-1">
            <label className="block text-slate-500 font-semibold">Claim Type
              <span className="text-red-500">*</span>
            </label>

            <select
            {...register("claimType")}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg 
            focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
            >
            <option value="">Select</option>
            <option value="Death">Death</option>
            <option value="Maturity">Maturity</option>
            <option value="Rider">Rider</option>
            <option value="Other">Other</option>
            </select>
            <p className="text-xs text-red-500 mt-1">{errors.claimType?.message}</p>
          </div>

          <div className="flex-1">
            <label className="block text-slate-500 font-semibold">Claim Date
              <span className="text-red-500">*</span>
            </label>
           <Controller
              control={control}
              name="claimDate"
              render={({ field }) => (
                <DatePicker
                  value={
                    field.value ? new Date(field.value) : undefined
                  }
                  onChange={(date) =>
                    field.onChange(
                      date ? format(date, "yyyy-MM-dd") : "",
                    )
                  }
                />
              )}
            />
            <p className="text-xs text-red-500 mt-1">{errors.claimDate?.message}</p>
          </div>
        </div>
        <div className="w-full flex gap-1 mt-5 gap-6">
          <div className="flex-1">
            <label className="block text-slate-500 font-semibold">Claimed Amount
              <span className="text-red-500">*</span>
            </label>

            <input
              type="text"
              {...register("claimAmount")}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg 
              focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
            />

            <p className="text-xs text-red-500 mt-1">{errors.claimAmount?.message}</p>
          </div>

          {/* Removed Claimant and extra details temporarily to match schema */}
          {/* <div className="flex-1">
            <label className="block text-slate-500 font-semibold">Place Of Loss
            </label>

            <input
              type="text"
               {...register("placeOfLoss")}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg 
              focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
            />

            <p className="text-xs text-red-500 mt-1">{errors.claimAmount?.message}</p>
          </div> */}
        </div>
        {/* <label className="block mt-5 text-slate-500 font-semibold">Description
            </label>

            <textarea
              rows={4}
               {...register("placeOfLoss")}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg 
              focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
            />

            <p className="text-xs text-red-500 mt-1">{errors.claimAmount?.message}</p>
            <div>
              <p className="text-xl font-bold mt-5">Upload Documents</p>
              <p className="text-sm text-slate-500">Upload relevant documents(Max size 10MB each)</p>
              <input type="file"></input>
            </div> */}
      </div>
      <div className="col-span-1 bg-white border border-slate-200 rounded-xl p-6 transition-all duration-500">
        <p className="text-xl font-bold">Claimant Information</p>
        <div className="mt-5">
          <label className="block text-slate-500 font-semibold">Claimant Name
            <span className="text-red-500">*</span>
          </label>
          <input
            {...register("claimantName")}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg 
              focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
          />
           <p className="text-xs text-red-500 mt-1">{errors.claimantName?.message}</p> 
          {/* <label className="block mt-5 text-slate-500 font-semibold">Relationship</label>
          <input
            {...register("claimantName")}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg 
              focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
          />
          <p>{errors.claimantName?.message}</p> 
          <label className="block mt-5 text-slate-500 font-semibold">Contact Number</label>
          <input
            {...register("claimantName")}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg 
              focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
          />
          <p>{errors.claimantName?.message}</p> 
          <label className="block mt-5 text-slate-500 font-semibold">Email</label>
          <input
            {...register("claimantName")}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg 
              focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
          />
           <p>{errors.claimantName?.message}</p> 
          <label className="block mt-5 text-slate-500 font-semibold">Address</label>
          <input
            {...register("claimantName")}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg 
              focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
          />
         <p>{errors.claimantName?.message}</p>  */}
        </div>
      </div>
    </div>
     

      <button
        disabled={isSubmitting}
        className="bg-blue-600 text-white px-4 py-2 rounded"
        onClick={handleSubmit(onValid)}
        // onClick={() => setClaimDialogOpen(true)}
      >
        Create Claim
      </button>

    </form>
      {/* Delete Confirmation Modal */}
          {confirmOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-50 rounded-xl">
                    <AlertCircle size={22} className="text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Raise Claim
                    </h3>
                    <p className="text-xs text-slate-400">
                      This action cannot be undone
                    </p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                  Are you sure you want to raise this claim ?
                </p>
                <div className="flex items-center justify-end gap-3">
                  <button
                  onClick={() => setConfirmOpen(false)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit(onSubmit)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors flex items-center gap-2"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          )}
    </div>
    
  );
}