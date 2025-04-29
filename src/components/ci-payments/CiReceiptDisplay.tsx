"use client";

import React from "react";
import { CiPayment } from "@/types/schema"; // Assuming schema types are correctly defined
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import { Upload } from "lucide-react";
import Image from "next/image";
import PrintReceiptButton from "@/app/dashboard/ci-payments/[paymentId]/receipt/PrintReceiptButton"; // Adjust path if needed

type CiReceiptDisplayProps = {
  payment: CiPayment;
  inModal?: boolean; // New prop to adjust styling when in modal
};

// Helper function for consistent date formatting
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "N/A";
  try {
    const date = parseISO(dateString);
    return format(date, "PPP p"); // e.g., Jan 1, 2023, 1:00:00 PM
  } catch (e) {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid Date";
      return format(date, "PPP p");
    } catch (e2) {
      return "Invalid Date";
    }
  }
};

// Helper function for currency formatting
const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

export default function CiReceiptDisplay({
  payment,
  inModal = false,
}: CiReceiptDisplayProps) {
  if (!payment) {
    // Optional: Render a loading or error state if payment is somehow null/undefined
    return <p>Payment data is not available.</p>;
  }

  // Basic Receipt Structure (Moved from page.tsx)
  return (
    <div
      className={`container mx-auto ${inModal ? "p-0" : "py-8 px-4 md:px-6"} print:p-0`}
    >
      <Card
        className={`${inModal ? "shadow-none border-0" : "max-w-2xl mx-auto"} print:shadow-none print:border-none`}
      >
        <CardHeader className="text-center print:text-left print:pb-2">
          <CardTitle className="text-2xl print:text-xl">
            Confidential Informant Payment Receipt
          </CardTitle>
          <CardDescription className="print:text-sm">
            Receipt Number: {payment.receipt_number || "N/A"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 print:space-y-2">
          <div className="grid grid-cols-2 gap-4 print:gap-2 border-b pb-4 print:pb-2">
            <div className="print:text-sm">
              <span className="font-semibold">Date Paid:</span>{" "}
              {formatDate(payment.date)}
            </div>
            <div className="print:text-sm">
              <span className="font-semibold">Amount Paid:</span>{" "}
              {formatCurrency(payment.amount_paid)}
            </div>
            <div className="print:text-sm">
              <span className="font-semibold">Paid To:</span>{" "}
              {payment.paid_to || "N/A"}
            </div>
            <div className="print:text-sm">
              <span className="font-semibold">Case #:</span>{" "}
              {payment.case_number || "N/A"}
            </div>
            <div className="print:text-sm">
              <span className="font-semibold">Paying Agent:</span>{" "}
              {payment.paying_agent?.name ||
                payment.paying_agent_printed_name ||
                "N/A"}
            </div>
            <div className="print:text-sm">
              <span className="font-semibold">Badge #:</span>{" "}
              {payment.paying_agent?.badge_number || "N/A"}
            </div>
            <div className="print:text-sm">
              <span className="font-semibold">PEPI Rec #:</span>{" "}
              {payment.pepi_receipt_number || "N/A"}
            </div>
          </div>

          <h3 className="font-semibold text-lg pt-2 print:text-base print:pt-1">
            Signatures
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:gap-2 text-center print:grid-cols-3">
            <div className="border p-2 rounded print:p-1">
              <p className="text-sm font-medium mb-2 print:mb-1 print:text-xs">
                CI Signature
              </p>
              {payment.ci_signature ? (
                <Image
                  src={payment.ci_signature}
                  alt="CI Signature"
                  width={150}
                  height={75}
                  className="mx-auto print:w-[100px] print:h-[50px]"
                />
              ) : (
                <p className="text-xs text-muted-foreground">N/A</p>
              )}
            </div>
            <div className="border p-2 rounded print:p-1">
              <p className="text-sm font-medium mb-2 print:mb-1 print:text-xs">
                Paying Agent Signature
              </p>
              {payment.paying_agent_signature ? (
                <Image
                  src={payment.paying_agent_signature}
                  alt="Agent Signature"
                  width={150}
                  height={75}
                  className="mx-auto print:w-[100px] print:h-[50px]"
                />
              ) : (
                <p className="text-xs text-muted-foreground">N/A</p>
              )}
            </div>
            <div className="border p-2 rounded print:p-1">
              <p className="text-sm font-medium mb-2 print:mb-1 print:text-xs">
                Witness Signature
              </p>
              {payment.witness_signature ? (
                <Image
                  src={payment.witness_signature}
                  alt="Witness Signature"
                  width={150}
                  height={75}
                  className="mx-auto print:w-[100px] print:h-[50px]"
                />
              ) : (
                <p className="text-xs text-muted-foreground">N/A</p>
              )}
              {payment.witness_printed_name && (
                <p className="text-xs mt-1 print:mt-0">
                  ({payment.witness_printed_name})
                </p>
              )}
            </div>
          </div>

          <div className="border p-2 rounded mt-4 print:mt-2 text-center print:p-1">
            <p className="text-sm font-medium mb-2 print:mb-1 print:text-xs">
              Commander Approval Signature
            </p>
            {payment.commander_signature ? (
              <Image
                src={payment.commander_signature}
                alt="Commander Signature"
                width={150}
                height={75}
                className="mx-auto print:w-[100px] print:h-[50px]"
              />
            ) : (
              <p className="text-xs text-muted-foreground">N/A</p>
            )}
            <p className="text-xs mt-1 print:mt-0">
              Approved By: {payment.reviewer?.name || "N/A"}
            </p>
            <p className="text-xs">
              Approved At: {formatDate(payment.reviewed_at)}
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end print:hidden">
          <PrintReceiptButton />
        </CardFooter>
      </Card>
      {/* Basic Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
            font-size: 10pt;
            color: black;
          }
          .container {
            padding: 0 !important;
            max-width: 100% !important;
          }
          header,
          footer,
          nav,
          aside,
          button,
          .print\\:hidden {
            display: none !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:border-none {
            border: none !important;
          }
          .print\\:text-left {
            text-align: left !important;
          }
          .print\\:text-sm {
            font-size: 10pt !important;
          }
          .print\\:text-xs {
            font-size: 8pt !important;
          }
          .print\\:text-base {
            font-size: 12pt !important;
          }
          .print\\:text-xl {
            font-size: 14pt !important;
          }
          .print\\:grid-cols-3 {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }
          .print\\:w-\\[100px\\] {
            width: 100px !important;
            height: auto !important;
          }
          .print\\:h-\\[50px\\] {
            height: 50px !important;
          }
          .card {
            page-break-inside: avoid;
            border: 1px solid #ddd !important;
          }
          img {
            max-width: 100px !important;
            height: auto !important;
          }

          /* Hide everything except the receipt when printing from the modal */
          body.printing-receipt * {
            visibility: hidden;
          }
          body.printing-receipt .dialog-content {
            visibility: visible;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          body.printing-receipt .dialog-content * {
            visibility: visible;
          }
          body.printing-receipt .dialog-footer {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
