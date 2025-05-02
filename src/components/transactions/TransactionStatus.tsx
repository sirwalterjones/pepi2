"use client";

import { TransactionStatus as TStatus } from "@/types/schema";
import { Badge } from "../ui/badge";
import { CheckCircle, Clock, XCircle } from "lucide-react";

interface TransactionStatusProps {
  status: TStatus;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

export default function TransactionStatus({
  status,
  size = "md",
  showIcon = true,
}: TransactionStatusProps) {
  const getStatusBadge = () => {
    const sizeClasses = {
      sm: "text-xs py-0 px-2",
      md: "text-sm py-0.5 px-2.5",
      lg: "text-base py-1 px-3",
    };

    const iconSize = {
      sm: 12,
      md: 14,
      lg: 16,
    };

    switch (status) {
      case "pending":
        return (
          <Badge
            variant="outline"
            className={`bg-orange-100 text-orange-800 hover:bg-orange-100 ${sizeClasses[size]}`}
          >
            {showIcon && (
              <Clock
                className={`mr-1 h-${iconSize[size] / 4} w-${iconSize[size] / 4}`}
              />
            )}
            Pending Review
          </Badge>
        );
      case "approved":
        return (
          <Badge
            variant="success"
            className={`bg-green-100 text-green-800 hover:bg-green-100 ${sizeClasses[size]}`}
          >
            {showIcon && (
              <CheckCircle
                className={`mr-1 h-${iconSize[size] / 4} w-${iconSize[size] / 4}`}
              />
            )}
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className={sizeClasses[size]}>
            {showIcon && (
              <XCircle
                className={`mr-1 h-${iconSize[size] / 4} w-${iconSize[size] / 4}`}
              />
            )}
            Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  return getStatusBadge();
}
