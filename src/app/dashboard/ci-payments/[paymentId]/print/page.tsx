import { redirect } from "next/navigation";
import { createClient } from "../../../../../../supabase/server";
import CiReceiptDisplay from "@/components/ci-payments/CiReceiptDisplay";

export default async function CiPaymentPrintPage({
  params,
}: {
  params: { paymentId: string };
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Fetch the payment data
  const { data: payment, error } = await supabase
    .from("ci_payments")
    .select(
      "*, paying_agent:paying_agent_id(id, name, badge_number), reviewer:reviewed_by(id, name)",
    )
    .eq("id", params.paymentId)
    .single();

  if (error || !payment) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-700">
            {error?.message || "Payment not found"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="print:p-0 print:m-0">
      <CiReceiptDisplay payment={payment} />
    </div>
  );
}
