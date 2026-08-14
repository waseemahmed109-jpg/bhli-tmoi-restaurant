import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import OrderPadClient from "./OrderPadClient";
import "./order.css";

export const dynamic = "force-dynamic";
export default async function OrderPadPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Fetch all menu items
  const menuItems = await prisma.menuItem.findMany({
    orderBy: { category: 'asc' }
  });

  // Group items by category
  const categories: Record<string, typeof menuItems> = {};
  menuItems.forEach((item: any) => {
    const cat = item.category || 'Uncategorized';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(item);
  });

  return (
    <div className="order-page-container">
      <header className="page-header">
        <h1 className="page-title">Order Pad</h1>
      </header>
      
      <OrderPadClient categories={categories} session={session} />
    </div>
  );
}
