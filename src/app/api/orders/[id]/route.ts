import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const id = parseInt(params.id, 10);
    const body = await req.json();
    
    // For now we only support updating status
    if (body.status) {
      const order = await prisma.order.update({
        where: { id },
        data: { status: body.status },
      });
      return NextResponse.json(order);
    }

    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  } catch (error) {
    console.error("Failed to update order:", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
