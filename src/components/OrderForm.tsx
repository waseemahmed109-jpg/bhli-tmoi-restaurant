"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  rate: number;
  amount: number;
}

export default function OrderForm({ sessionUser }: { sessionUser: any }) {
  const router = useRouter();
  const [customerName, setCustomerName] = useState("");
  const [table, setTable] = useState("");
  const [salesType, setSalesType] = useState("DineIn");
  const [items, setItems] = useState<OrderItem[]>([
    { id: Date.now().toString(), name: "", quantity: 1, rate: 0, amount: 0 },
  ]);
  const [parcelCharge, setParcelCharge] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [status, setStatus] = useState("COMPLETED"); // Default completed in HTML
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [waiter, setWaiter] = useState(sessionUser.role?.toLowerCase() === "staff" ? sessionUser.username : "");
  const [chef, setChef] = useState("");
  const [remarks, setRemarks] = useState("");
  const [guestSignature, setGuestSignature] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derived values
  const isTakeAway = salesType === "Take Away";
  const isNC = salesType === "NC";

  const subtotal = useMemo(() => {
    return items.reduce((acc, item) => acc + item.amount, 0);
  }, [items]);

  const gst = useMemo(() => {
    return isNC ? 0 : subtotal * 0.05;
  }, [subtotal, isNC]);

  const totalAmount = useMemo(() => {
    return Math.max(0, subtotal + gst + (isTakeAway ? parcelCharge : 0) - discount);
  }, [subtotal, gst, parcelCharge, discount, isTakeAway]);

  const handleAddItem = () => {
    setItems([
      ...items,
      { id: Date.now().toString(), name: "", quantity: 1, rate: 0, amount: 0 },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof OrderItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === "quantity" || field === "rate") {
            updated.amount = (updated.quantity || 0) * (updated.rate || 0);
          }
          return updated;
        }
        return item;
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !table || items.length === 0 || !items[0].name) {
      alert("Please fill in customer name, table, and at least one item.");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          table,
          salesType,
          items,
          subtotal,
          gst,
          parcelCharge: isTakeAway ? parcelCharge : 0,
          discount,
          totalAmount,
          status,
          paymentMethod,
          waiterId: sessionUser.id,
          chef,
          remarks,
          guestSignature: isNC ? guestSignature : "",
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save order");
      }

      // Reset form
      setCustomerName("");
      if (salesType !== "Take Away") setTable("");
      setItems([{ id: Date.now().toString(), name: "", quantity: 1, rate: 0, amount: 0 }]);
      setParcelCharge(0);
      setDiscount(0);
      setChef("");
      setRemarks("");
      setGuestSignature("");

      router.refresh();
      
    } catch (error) {
      alert("Error saving order: " + (error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="pad" onSubmit={handleSubmit}>
      <h2>New Ticket</h2>

      <div className="field">
        <label>Customer Name</label>
        <input
          type="text"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          required
        />
      </div>

      <div className="field">
        <label>
          {isTakeAway ? "Area" : "Table Number"}
        </label>
        {isTakeAway ? (
          <input
            type="text"
            value={table}
            onChange={(e) => setTable(e.target.value)}
            required
            placeholder="e.g. Counter / Zone A"
          />
        ) : (
          <select
            value={table}
            onChange={(e) => setTable(e.target.value)}
            required
          >
            <option value="" disabled>Select...</option>
            <option>Table Number-1</option>
            <option>Table Number-2</option>
            <option>Table Number-3</option>
            <option>Table Number-4</option>
            <option>Table Number-5</option>
            <option>Table Number-6</option>
            <option>Table Number-7</option>
            <option>Table Number-8</option>
            <option>Table Number-9</option>
            <option>Buffet-Breakfast</option>
            <option>Buffet-Lunch</option>
            <option>Buffet-Dinner</option>
            <option>Party</option>
          </select>
        )}
      </div>

      <div className="field">
        <label>Sales Type</label>
        <select
          value={salesType}
          onChange={(e) => setSalesType(e.target.value)}
        >
          <option>DineIn</option>
          <option>Room Service</option>
          <option>Take Away</option>
          <option>NC</option>
          <option>Staff</option>
          <option>B2B</option>
        </select>
      </div>

      <div className="field">
        <label>Items Ordered</label>
        <div className="item-rows">
          <div className="item-row-header">
            <span className="h-name">Item Name</span>
            <span className="h-qty">Qty</span>
            <span className="h-rate">Rate ₹</span>
            <span className="h-amount">Amount ₹</span>
            <span className="h-spacer"></span>
          </div>
          {items.map((item) => (
            <div className="item-row" key={item.id}>
              <div className="item-name-wrap">
                <input
                  className="item-name"
                  type="text"
                  value={item.name}
                  onChange={(e) => updateItem(item.id, "name", e.target.value)}
                  required
                />
              </div>
              <input
                className="item-qty"
                type="number"
                value={item.quantity || ""}
                onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value))}
                min="1"
                required
              />
              <input
                className="item-rate"
                type="number"
                value={item.rate || ""}
                onChange={(e) => updateItem(item.id, "rate", parseFloat(e.target.value))}
                min="0"
                step="0.01"
                required
              />
              <span className="item-amount">
                ₹{item.amount.toFixed(2)}
              </span>
              <button
                type="button"
                className="item-row-remove"
                onClick={() => handleRemoveItem(item.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="btn-add-item"
          onClick={handleAddItem}
        >
          + ADD ITEM
        </button>
      </div>

      <div className="totals-block">
        <div className="totals-row">
          <span>Subtotal</span>
          <span>₹{subtotal.toFixed(2)}</span>
        </div>
        {!isNC && (
          <div className="totals-row">
            <span>GST (5%)</span>
            <span>₹{gst.toFixed(2)}</span>
          </div>
        )}
        {isTakeAway && (
          <div className="totals-row">
            <span>Parcel Charges</span>
            <div className="totals-input">
              <span className="currency-prefix">₹</span>
              <input
                type="number"
                value={parcelCharge}
                onChange={(e) => setParcelCharge(parseFloat(e.target.value) || 0)}
                min="0"
              />
            </div>
          </div>
        )}
        <div className="totals-row">
          <span>Discount</span>
          <div className="totals-input">
            <span className="currency-prefix">₹</span>
            <input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
              min="0"
            />
          </div>
        </div>
      </div>
      
      <div className="field">
        <label>
          TOTAL AMOUNT <span className="optional-tag">(auto, incl. GST, less discount)</span>
        </label>
        <div className="currency-field">
          <span className="currency-prefix">₹</span>
          <input
            type="text"
            value={totalAmount.toFixed(2)}
            readOnly
          />
        </div>
      </div>

      <div className="field">
        <label>Status</label>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="OPEN">Pending</option>
          <option value="ORDER_TAKEN">Order Taken</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {status === "COMPLETED" && (
        <div className="field">
          <label>Payment Method</label>
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            <option>Cash</option>
            <option>Card</option>
            <option>UPI</option>
            <option>Online</option>
            <option>Other</option>
          </select>
        </div>
      )}

      <div className="field">
        <label>Waiter</label>
        <input 
          type="text" 
          value={waiter} 
          onChange={(e) => setWaiter(e.target.value)} 
          readOnly={sessionUser.role === "STAFF"}
        />
      </div>

      <div className="field">
        <label>Chef</label>
        <input 
          type="text" 
          value={chef} 
          onChange={(e) => setChef(e.target.value)} 
          placeholder="e.g. Suresh"
        />
      </div>

      {isNC && (
        <div className="field">
          <label>Guest Signature</label>
          <input 
            type="text" 
            value={guestSignature} 
            onChange={(e) => setGuestSignature(e.target.value)} 
            placeholder="Sign here"
          />
        </div>
      )}

      <div className="field">
        <label>Remarks <span className="optional-tag">(optional)</span></label>
        <textarea 
          value={remarks} 
          onChange={(e) => setRemarks(e.target.value)} 
          rows={2} 
          placeholder="Notes about this order"
        />
      </div>

      <div className="pad-actions">
        <button 
          type="submit" 
          className="btn-primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving..." : "Save Ticket"}
        </button>
      </div>
    </form>
  );
}
