import { TransactionWithAgent } from "@/types/schema";

/**
 * Generates a printable receipt HTML for a transaction
 */
export function generateReceiptHTML(transaction: TransactionWithAgent): string {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return `
    <html>
      <head>
        <title>Receipt #${transaction.receipt_number}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .receipt { max-width: 400px; margin: 0 auto; border: 1px solid #ccc; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; }
          .title { font-size: 24px; font-weight: bold; }
          .info { margin: 15px 0; }
          .info-row { display: flex; justify-content: space-between; margin: 5px 0; }
          .label { font-weight: bold; }
          .amount { font-size: 20px; font-weight: bold; margin: 15px 0; text-align: center; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; }
          @media print {
            body { margin: 0; padding: 0; }
            .receipt { border: none; max-width: 100%; }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <div class="title">PEPI Money Tracker</div>
            <div>Official Receipt</div>
          </div>
          
          <div class="info">
            <div class="info-row">
              <span class="label">Receipt #:</span>
              <span>${transaction.receipt_number}</span>
            </div>
            <div class="info-row">
              <span class="label">Date:</span>
              <span>${formatDate(transaction.created_at)}</span>
            </div>
            <div class="info-row">
              <span class="label">Transaction Type:</span>
              <span>${transaction.transaction_type.charAt(0).toUpperCase() + transaction.transaction_type.slice(1)}</span>
            </div>
            ${
              transaction.agent
                ? `
            <div class="info-row">
              <span class="label">Agent:</span>
              <span>${transaction.agent.name} ${transaction.agent.badge_number ? `(${transaction.agent.badge_number})` : ""}</span>
            </div>`
                : ""
            }
            ${
              transaction.description
                ? `
            <div class="info-row">
              <span class="label">Description:</span>
              <span>${transaction.description}</span>
            </div>`
                : ""
            }
          </div>
          
          <div class="amount">
            ${formatCurrency(transaction.amount)}
          </div>
          
          <div class="footer">
            <p>Thank you for using PEPI Money Tracker</p>
            <p>This is an official receipt for task force financial records.</p>
          </div>
        </div>
        <script>
          // Auto-print when loaded
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;
}

/**
 * Opens a new window with the receipt and triggers printing
 */
export function printReceipt(transaction: TransactionWithAgent): void {
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(generateReceiptHTML(transaction));
    printWindow.document.close();
  }
}
