import { NextRequest, NextResponse } from "next/server"
import { getOrderById } from "@/lib/orders"

/**
 * GET /api/paypal/return
 * 
 * Return URL after user approves PayPal order.
 * This endpoint captures the PayPal order and transitions to thank-you.
 * If capture fails, it returns to checkout with an error.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get("orderId")
    const paypalOrderId = searchParams.get("token") // PayPal sends token as query param

    if (!orderId || !paypalOrderId) {
      console.error("PayPal return: Missing orderId or token", { orderId, paypalOrderId })
      return NextResponse.redirect(
        new URL("/checkout?error=missing_order", request.url)
      )
    }

    // Fetch the order to confirm it exists
    const order = getOrderById(orderId)
    if (!order) {
      console.error("PayPal return: Order not found", orderId)
      return NextResponse.redirect(
        new URL("/checkout?error=order_not_found", request.url)
      )
    }

    // GUARD: If order is already paid, redirect to thank-you without calling PayPal
    // This prevents unnecessary API calls on URL replay or browser refresh
    if (order.status === "paid") {
      console.info("PayPal return: Order already paid, skipping capture", { orderId })
      return NextResponse.redirect(
        new URL(`/thank-you?orderId=${orderId}&orderNumber=${order.orderNumber}`, request.url)
      )
    }

    // Capture the PayPal order by calling the capture endpoint
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const captureResponse = await fetch(`${baseUrl}/api/paypal/capture-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId,
        paypalOrderId,
      }),
    })

    const captureData = await captureResponse.json()

    if (!captureResponse.ok || !captureData.success) {
      console.error("PayPal return: Capture failed", captureData)
      return NextResponse.redirect(
        new URL(`/checkout?error=payment_failed&code=capture_failed`, request.url)
      )
    }

    // Payment captured successfully - redirect to thank you page
    return NextResponse.redirect(
      new URL(`/thank-you?orderId=${orderId}&orderNumber=${order.orderNumber}`, request.url)
    )
  } catch (error) {
    console.error("Error processing PayPal return:", error)
    return NextResponse.redirect(
      new URL("/checkout?error=callback_error", request.url)
    )
  }
}
