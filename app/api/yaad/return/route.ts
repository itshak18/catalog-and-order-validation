import { NextRequest, NextResponse } from "next/server"
import { getOrderById } from "@/lib/orders"

/**
 * GET /api/yaad/return
 * Yaad redirect endpoint after payment (success or failure).
 * User browser redirects here after payment attempt.
 * 
 * The authoritative payment confirmation comes from Yaad's server-to-server
 * notification to /api/yaad/notify, but we process this redirect as a courtesy
 * to the user and check the internal order state.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const orderId = searchParams.get("orderId")
  const ccode = searchParams.get("CCode") // Yaad status code
  const status = searchParams.get("status")

  if (!orderId) {
    return NextResponse.redirect(new URL("/checkout?error=missing_order", request.url))
  }

  // Fetch internal order to check state
  const order = getOrderById(orderId)
  if (!order) {
    return NextResponse.redirect(new URL("/checkout?error=order_not_found", request.url))
  }

  // Check if order is already paid (payment confirmed via notify endpoint)
  if (order.status === "paid") {
    return NextResponse.redirect(new URL(`/thank-you?orderId=${orderId}`, request.url))
  }

  // If still pending_payment after redirect, the notify endpoint hasn't fired yet
  // This can happen due to race conditions (browser redirect vs server notify)
  if (order.status === "pending_payment") {
    // Redirect to thank-you anyway - the notify endpoint will confirm payment server-side
    // The user shouldn't wait; they'll see pending/processing state on the thank-you page
    return NextResponse.redirect(new URL(`/thank-you?orderId=${orderId}&processing=true`, request.url))
  }

  // Order is in a terminal failure state (failed, cancelled, refunded)
  return NextResponse.redirect(new URL("/checkout?error=payment_failed", request.url))
}

