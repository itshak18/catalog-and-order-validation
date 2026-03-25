import { NextRequest, NextResponse } from "next/server"

/**
 * PayPal cancel handler.
 * User clicked "Cancel and return to store" on PayPal approval page.
 * Redirect back to checkout with a user-friendly message.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const orderId = searchParams.get("orderId") ?? ""

  // Build redirect URL with cancellation flag
  const params = new URLSearchParams()
  params.set("cancelled", "true")
  if (orderId) {
    params.set("orderId", orderId)
  }

  return NextResponse.redirect(
    new URL(`/checkout?${params.toString()}`, req.url)
  )
}
