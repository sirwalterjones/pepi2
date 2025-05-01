import CbMemoReport from "@/components/reports/CbMemoReport";

export default function CbMemoReportStoryboard() {
  // Sample data for the storyboard
  const sampleData = {
    commanderName: "Adam Mayfield",
    memoDate: "May 1, 2025",
    monthName: "April",
    bookYear: "2025",
    reconciliationDate: "May 1, 2025",
    beginningBalance: 3000,
    totalAgentIssues: 7991.1,
    totalAgentReturns: 200,
    cashOnHand: 1808.9,
    totalExpenditures: 6776.1,
    totalAdditionalUnitIssue: 6600,
    endingBalance: 2823.9,
    ytdExpenditures: 6776.1,
    initialFunding: 6600,
    issuedToAgents: 0,
    spentByAgents: 6776.1,
    returnedByAgents: 200,
    bookBalance: 1808.9,
  };

  return (
    <div className="bg-white min-h-screen p-4">
      <CbMemoReport data={sampleData} />
    </div>
  );
}
