"use client";

import { useParams } from "next/navigation";
import PremiumPaymentForm from "@/features/premiumPayments/PremiumPaymentForm";

export default function EditPremiumPaymentPage() {
  const params = useParams();
  const id = params.id as string;


  return <PremiumPaymentForm mode="edit" paymentId = {id} />;
}
