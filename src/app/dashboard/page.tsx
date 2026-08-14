import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import OrderForm from "@/components/OrderForm";
import TicketRail from "@/components/TicketRail";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";
export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const userRole = session.user.role?.toLowerCase() || "";
  const isStaffOrManager = userRole === "staff" || userRole === "manager";

  // Fetch all orders for the TicketRail
  const allOrders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { waiter: true, items: true },
    take: 50,
  });

  const activeOrders = allOrders.filter(o => ["OPEN", "PENDING", "ORDER_TAKEN", "IN_PROGRESS"].includes(o.status)).length;
  
  // Need to add data attribute to body in layout or client component? We'll just add it to a wrapper div for now to match CSS styling logic if possible, or just apply classes.
  // The CSS uses body.role-staff etc. We'll simulate it by wrapping everything in a div with that class.
  const roleClass = `role-${userRole}`;

  return (
    <div className={roleClass} data-staff-user={session.user.name}>
      <div id="alerts" className="alerts-container" aria-live="polite"></div>

      <header>
        <div className="brand">
          <img className={`brand-photo photo-${session.user.name?.toLowerCase()}`} src="/placeholder.jpg" alt={session.user.name || "Staff"} style={{ display: 'none' }} />
          <div>
            <h1 className="display">BHLI-TMOI <span>Restaurant</span></h1>
            <p className="header-subtitle-default">Front-of-House Order Board & Ticket Log</p>
          </div>
        </div>
        <div className="header-right">
          <p className="header-subtitle-arabic">مطعم بهلي-تموي</p>
          <div id="clock">
            {/* Clock logic would go here if client component, static for now */}
            <span>00:00 PM</span>
            <span>Fri, Aug 14, 2026</span>
            <strong>Signed in as {session.user.name}</strong>
            <span className="session-badge">
              <span className="role-pill">{userRole}</span>
              <LogoutButton />
            </span>
          </div>
        </div>
      </header>

      {/* Admin/Owner dash will be handled elsewhere or conditionally rendered, we focus on Staff/Manager */}
      {isStaffOrManager && (
        <div className="metrics">
          <div className="stub">
            <div>
              <div className="num">0</div>
              <div className="lbl">My Tickets Generated</div>
            </div>
          </div>
          <div className="stub stub-order-taken">
            <div>
              <div className="num">{activeOrders}</div>
              <div className="lbl">Order Taken</div>
            </div>
          </div>
        </div>
      )}

      <main>
        {isStaffOrManager && (
          <OrderForm sessionUser={session.user} />
        )}
        
        <TicketRail orders={allOrders} sessionUser={session.user} />
      </main>
    </div>
  );
}
