import { redirect } from "next/navigation";
import { createClient } from "../../../../supabase/server";
import ReceiptManager from "@/components/receipts/ReceiptManager";

export default async function ReceiptsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  return (
    <main className="w-full">
      <div className="container mx-auto px-4 py-8 flex flex-col gap-8">
        <header className="flex flex-col gap-4">
          <h1 className="text-3xl font-bold">Receipts</h1>
          <p className="text-muted-foreground">
            View, print, and manage transaction receipts.
          </p>
        </header>

        <ReceiptManager />
      </div>
    </main>
  );
}
