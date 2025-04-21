"use client";

import DashboardNavbar from "@/components/dashboard-navbar";

export default function DashboardLayoutStoryboard() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <DashboardNavbar />
      <main className="flex-1 p-4">
        <div className="border-2 border-dashed border-gray-300 p-6 rounded-md text-center">
          <h2 className="text-xl font-semibold mb-2">Dashboard Content Area</h2>
          <p className="text-muted-foreground">
            This is where page content appears
          </p>
          <p className="text-sm mt-4">
            The DashboardNavbar is rendered once in the layout.tsx file
          </p>
        </div>
      </main>
    </div>
  );
}
