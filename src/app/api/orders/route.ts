import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { 
      customerName, table, salesType, items, subtotal, gst, 
      parcelCharge, discount, totalAmount, status, paymentMethod, 
      waiterId, chef, remarks, guestSignature 
    } = body;

    // Create the order with nested items
    const order = await prisma.order.create({
      data: {
        customerName,
        table,
        salesType,
        subtotal,
        gst,
        parcelCharge,
        discount,
        totalAmount,
        status,
        paymentMethod,
        waiterId,
        chef,
        remarks,
        guestSignature,
        items: {
          create: items.map((item: any) => ({
            name: item.name,
            quantity: item.quantity,
            rate: item.rate,
            amount: item.amount,
          })),
        },
      },
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error("Order creation error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const body = await request.json();
    
    const updatedOrder = await prisma.order.update({
      where: { id: parseInt(id) },
      data: { status: body.status },
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error("Order update error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    await prisma.order.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Order deletion error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
