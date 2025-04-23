import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Add a simple currency formatter
export function formatCurrency(amount: number | null | undefined, currency: string = 'USD'): string {
    if (amount === null || amount === undefined) {
        return 'N/A'; // Or return $0.00 or an empty string based on preference
    }
    return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: currency,
        // You might want to add options like minimumFractionDigits: 2
    }).format(amount);
}
