/**
 * GET /api/orders/[orderId]
 * Retrieve order by internal ID.
 */

import { NextRequest, NextResponse } from "next/server"
import { getOrderById } from "@/lib/orders"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      )
    }

    const order = getOrderById(orderId)

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      )
    }

    // Return order without sensitive payment event details
    return NextResponse.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        email: order.email,
        status: order.status,
        paymentProvider: order.paymentProvider,
        lines: order.lines,
        shippingAddress: order.shippingAddress,
        totals: order.totals,
        createdAt: order.createdAt,
        paidAt: order.paidAt,
        shippedAt: order.shippedAt,
        deliveredAt: order.deliveredAt,
      },
    })
  } catch (error) {
    console.error("Error fetching order:", error)
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    )
  }
}
