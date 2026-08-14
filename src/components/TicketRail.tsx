"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function TicketRail({ orders, sessionUser }: { orders: any[], sessionUser: any }) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filteredOrders = orders.filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.id.toString().includes(q) ||
      (o.customerName || "").toLowerCase().includes(q) ||
      (o.table || "").toLowerCase().includes(q)
    );
  });

  const handleDelete = async (id: number) => {
    if (sessionUser.role?.toLowerCase() !== "admin" && sessionUser.role?.toLowerCase() !== "manager") {
      alert("Only Admin or Manager can delete tickets.");
      return;
    }
    if (confirm("Delete ticket #" + id + "? This cannot be undone.")) {
      try {
        const res = await fetch(`/api/orders?id=${id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed to delete order");
        router.refresh();
      } catch (error) {
        alert((error as Error).message);
      }
    }
  };

  const handleStatusUpdate = async (id: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/orders?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      router.refresh();
    } catch (error) {
      alert((error as Error).message);
    }
  };

  return (
    <div>
      <div className="rail-toolbar">
        <input
          type="search"
          placeholder="Search by customer, table, or order ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="rail">
        {filteredOrders.length === 0 ? (
          <div className="empty">
            <div className="display">No matches</div>
          </div>
        ) : (
          filteredOrders.map((o) => {
            const statusClass = o.status.toLowerCase().replace(/_/g, '');

            return (
              <div key={o.id} className="ticket-wrap">
                <div className={`ticket ${statusClass}`}>
                  <div className="row1">
                    <span className="oid">#{o.id}</span>
                    <span className="odate">{new Date(o.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="meta"><b>Customer:</b> {o.customerName}</div>
                  <div className="meta"><b>Table:</b> {o.table}</div>
                  <div className="meta"><b>Sales Type:</b> {o.salesType || 'DineIn'}</div>
                  
                  <div className="items">
                    {o.items?.map((it: any) => (
                      <div key={it.id} className="item-line">
                        <span>{it.name} <span className="iq">×{it.quantity}</span></span>
                        <span className="iamt">₹{it.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {o.gst > 0 && <div className="meta" style={{ textAlign: 'right' }}>GST (5%): ₹{o.gst.toFixed(2)}</div>}
                  {o.parcelCharge > 0 && <div className="meta" style={{ textAlign: 'right' }}>Parcel Charges: ₹{o.parcelCharge.toFixed(2)}</div>}
                  {o.discount > 0 && <div className="meta" style={{ textAlign: 'right' }}>Discount: -₹{o.discount.toFixed(2)}</div>}
                  
                  <div className="total">
                    ₹{o.totalAmount.toFixed(2)}
                  </div>

                  <div style={{ marginTop: '6px' }}>
                    <span className={`badge ${statusClass}`}>
                      {o.status.replace(/_/g, ' ')}
                    </span>
                    {o.waiter?.username && <span className="meta" style={{ display: 'inline', marginLeft: '8px' }}>Waiter: {o.waiter.username}</span>}
                  </div>

                  {(o.status === "OPEN" || o.status === "ORDER_TAKEN" || o.status === "IN_PROGRESS" || o.status === "PENDING") && (
                    <div className="order-actions-row">
                      <button 
                        type="button" 
                        className="icon-btn btn-complete-order"
                        onClick={() => handleStatusUpdate(o.id, "COMPLETED")}
                      >
                        Complete Order
                      </button>
                    </div>
                  )}

                  <div className="ticket-actions">
                    {(sessionUser.role?.toLowerCase() === "admin" || sessionUser.role?.toLowerCase() === "manager") && (
                      <button 
                        type="button" 
                        className="icon-btn danger"
                        onClick={() => handleDelete(o.id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
