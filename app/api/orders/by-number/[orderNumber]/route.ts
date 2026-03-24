/**
 * GET /api/orders/by-number/[orderNumber]
 * Retrieve order by order number.
 */

import { NextRequest, NextResponse } from "next/server"
import { getOrderByNumber } from "@/lib/orders"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const { orderNumber } = await params

    if (!orderNumber) {
      return NextResponse.json(
        { error: "Order number is required" },
        { status: 400 }
      )
    }

    const order = getOrderByNumber(orderNumber)

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
