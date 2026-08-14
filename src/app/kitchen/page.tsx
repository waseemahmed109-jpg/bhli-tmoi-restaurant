import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import KitchenClient from "./KitchenClient";
import "./kitchen.css";

export const revalidate = 0; // Disable static caching for real-time data
export const dynamic = "force-dynamic";

export default async function KitchenPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Fetch all open orders with their items and waiter details
  const openOrders = await prisma.order.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "asc" }, // Oldest first
    include: { 
      items: true,
      waiter: true
    },
  });

  return (
    <div className="kitchen-page-container">
      <header className="page-header">
        <h1 className="page-title">Kitchen Ticket Rail</h1>
        <p className="page-subtitle">{openOrders.length} Open Orders</p>
      </header>
      
      <KitchenClient initialOrders={openOrders} />
    </div>
  );
}
