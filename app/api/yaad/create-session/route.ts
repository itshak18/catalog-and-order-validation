/**
 * POST /api/yaad/create-session
 * Creates a Yaad Pay payment session using merchant config.
 */

import { NextRequest, NextResponse } from "next/server"
import { getOrderById, attachPaymentProviderId } from "@/lib/orders"

const YAAD_TERMINAL_NUMBER = process.env.YAAD_TERMINAL_NUMBER
const YAAD_API_KEY = process.env.YAAD_API_KEY
const YAAD_ENV = process.env.YAAD_ENV || "sandbox"
const YAAD_RETURN_URL = process.env.YAAD_RETURN_URL
const YAAD_NOTIFY_URL = process.env.YAAD_NOTIFY_URL
const YAAD_API_URL = YAAD_ENV === "production"
  ? "https://icom.yaad.net/p/"
  : "https://sandbox.yaad.net/p/"

interface CreateYaadSessionRequest {
  orderId: string
}

function generateYaadSignature(params: Record<string, string>, passportKey: string): string {
  // Yaad Pay uses a specific signature algorithm
  // Sort params, concatenate, and hash with passport key
  const sortedKeys = Object.keys(params).sort()
  const signatureString = sortedKeys.map((key) => `${key}=${params[key]}`).join("&")
  
  // In production, use crypto.createHmac for proper HMAC-SHA256
  // For now, return a placeholder that would be replaced with actual implementation
  const crypto = require("crypto")
  return crypto.createHmac("sha256", passportKey).update(signatureString).digest("hex")
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateYaadSessionRequest = await request.json()

    if (!body.orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      )
    }

    // Get the internal order
    const order = getOrderById(body.orderId)
    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      )
    }

    // Check if Yaad is configured
    if (!YAAD_TERMINAL_NUMBER || !YAAD_API_KEY) {
      // Return mock response for development
      const mockTransactionId = `YAAD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      
      // Attach mock Yaad ID to order (transitions to payment_processing)
      const result = attachPaymentProviderId(order.id, mockTransactionId)
      
      if (!result.success && !result.alreadyInState) {
        return NextResponse.json(
          { error: result.error || "Failed to initiate payment" },
          { status: 400 }
        )
      }

      const mockRedirectUrl = `/thank-you?orderId=${order.id}&yaadMock=true`

      return NextResponse.json({
        success: true,
        transactionId: mockTransactionId,
        redirectUrl: mockRedirectUrl,
        mock: true,
      })
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const returnUrl = YAAD_RETURN_URL || `${baseUrl}/api/yaad/return?orderId=${order.id}`
    const notifyUrl = YAAD_NOTIFY_URL || `${baseUrl}/api/yaad/notify`

    // Build Yaad Pay parameters
    const yaadParams: Record<string, string> = {
      Masof: YAAD_TERMINAL_NUMBER,
      action: "pay",
      Order: order.orderNumber,
      Info: `Juliris Order ${order.orderNumber}`,
      Amount: order.totals.total.amount.toFixed(2),
      Currency: "1", // 1 = ILS, use appropriate code for your currency
      UTF8: "True",
      UTF8out: "True",
      UserId: order.email,
      ClientName: `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`,
      ClientLName: order.shippingAddress.lastName,
      email: order.email,
      phone: order.shippingAddress.phone || "",
      city: order.shippingAddress.city,
      street: order.shippingAddress.address1,
      zip: order.shippingAddress.postalCode,
      Tash: "1", // Number of payments
      MoreData: "True",
      sendemail: "True",
      // Callback URLs
      SuccessUrl: returnUrl,
      NotifyUrl: notifyUrl, // Server-to-server IPN - authoritative payment confirmation
      ErrorUrl: `${baseUrl}/api/yaad/callback?type=error`,
      CancelUrl: `${baseUrl}/checkout?error=payment_cancelled`,
      // Internal reference
      J5: "False", // Redirect mode
      Postpone: "False",
      PageLang: "ENG",
      tmp: order.id, // Pass internal order ID for callback reference
    }

    // Generate signature
    yaadParams.Sign = generateYaadSignature(yaadParams, YAAD_API_KEY)

    // Build redirect URL
    const queryString = new URLSearchParams(yaadParams).toString()
    const redirectUrl = `${YAAD_API_URL}?${queryString}`

    // Generate a transaction reference and transition to payment_processing
    const transactionId = `YAAD-${order.orderNumber}`
    const attachResult = attachPaymentProviderId(order.id, transactionId)
    
    if (!attachResult.success && !attachResult.alreadyInState) {
      console.error("Failed to attach Yaad transaction ID:", attachResult.error)
      // Continue anyway since we're about to redirect
    }

    return NextResponse.json({
      success: true,
      transactionId,
      redirectUrl,
      params: yaadParams, // Include params for debugging
    })
  } catch (error) {
    console.error("Error creating Yaad session:", error)
    return NextResponse.json(
      { error: "Failed to create Yaad payment session" },
      { status: 500 }
    )
  }
}
