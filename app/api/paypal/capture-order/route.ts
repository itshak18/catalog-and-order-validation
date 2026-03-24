/**
 * POST /api/paypal/capture-order
 * Captures an approved PayPal order and marks the internal order as paid.
 * 
 * Idempotency: Safe to call multiple times with the same paypalOrderId.
 * Double-capture protection via order state machine.
 */

import { NextRequest, NextResponse } from "next/server"
import {
  getOrderById,
  markOrderPaid,
  markOrderFailed,
  isPaymentTerminal,
} from "@/lib/orders"

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET
const PAYPAL_ENV = process.env.PAYPAL_ENV || "sandbox"
const PAYPAL_API_URL = PAYPAL_ENV === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com"

interface CapturePayPalOrderRequest {
  paypalOrderId: string
  orderId: string
}

async function getPayPalAccessToken(): Promise<string> {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error("PayPal credentials not configured")
  }

  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64")

  const response = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  })

  if (!response.ok) {
    throw new Error("Failed to get PayPal access token")
  }

  const data = await response.json()
  return data.access_token
}

export async function POST(request: NextRequest) {
  try {
    const body: CapturePayPalOrderRequest = await request.json()

    if (!body.paypalOrderId || !body.orderId) {
      return NextResponse.json(
        { error: "PayPal order ID and internal order ID are required" },
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

    // IDEMPOTENCY CHECK: If order is already paid with this PayPal order, return success
    if (order.status === "paid" && order.providerRefs.orderId === body.paypalOrderId) {
      return NextResponse.json({
        success: true,
        idempotent: true,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
        },
        message: "Order was already captured successfully.",
      })
    }

    // GUARD: Reject if order is in a terminal state and this is a new capture attempt
    if (isPaymentTerminal(order)) {
      return NextResponse.json(
        { 
          error: "Order is already in a terminal payment state",
          orderStatus: order.status,
        },
        { status: 400 }
      )
    }

    // Verify the PayPal order ID matches what we stored
    if (order.providerRefs.orderId && order.providerRefs.orderId !== body.paypalOrderId) {
      return NextResponse.json(
        { error: "PayPal order ID mismatch" },
        { status: 400 }
      )
    }

    // Check if PayPal is configured
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      // Mock capture for development
      const result = markOrderPaid(order.id, {
        providerTransactionId: body.paypalOrderId,
        providerCaptureId: `MOCK_CAPTURE_${Date.now()}`,
        providerStatus: "COMPLETED",
        rawResponse: { mock: true, timestamp: new Date().toISOString() },
      })

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        order: {
          id: result.order?.id,
          orderNumber: result.order?.orderNumber,
          status: result.order?.status,
        },
        mock: true,
        idempotent: result.alreadyInState,
      })
    }

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken()

    // Capture the PayPal order
    const response = await fetch(
      `${PAYPAL_API_URL}/v2/checkout/orders/${body.paypalOrderId}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    )

    const captureData = await response.json()

    // Handle PayPal response
    if (!response.ok) {
      console.error("PayPal capture error:", captureData)

      // Check if it's already captured (INSTRUMENT_DECLINED or ORDER_NOT_APPROVED means different things)
      const errorName = captureData.name
      const errorDetails = captureData.details?.[0]?.issue

      // If PayPal says order already captured, treat as idempotent success
      if (errorName === "UNPROCESSABLE_ENTITY" && errorDetails === "ORDER_ALREADY_CAPTURED") {
        // Order was already captured - fetch the order to confirm status
        const orderResponse = await fetch(
          `${PAYPAL_API_URL}/v2/checkout/orders/${body.paypalOrderId}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        )
        const orderData = await orderResponse.json()

        if (orderData.status === "COMPLETED") {
          // Extract capture ID from the order
          const captureId = orderData.purchase_units?.[0]?.payments?.captures?.[0]?.id

          const result = markOrderPaid(order.id, {
            providerTransactionId: body.paypalOrderId,
            providerCaptureId: captureId,
            providerStatus: "COMPLETED",
            rawResponse: orderData,
          })

          return NextResponse.json({
            success: true,
            idempotent: true,
            order: {
              id: result.order?.id,
              orderNumber: result.order?.orderNumber,
              status: result.order?.status,
            },
            paypalStatus: "COMPLETED",
            message: "Order was already captured by PayPal.",
          })
        }
      }

      // Mark internal order as failed
      markOrderFailed(order.id, {
        providerTransactionId: body.paypalOrderId,
        providerStatus: errorName || "FAILED",
        rawResponse: captureData,
      })

      return NextResponse.json(
        { error: "Failed to capture PayPal payment", details: captureData },
        { status: 400 }
      )
    }

    // Extract capture details
    const captureId = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id
    const captureStatus = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.status

    // Check capture status
    if (captureData.status === "COMPLETED" && captureStatus === "COMPLETED") {
      // Mark internal order as paid through state machine
      const result = markOrderPaid(order.id, {
        providerTransactionId: body.paypalOrderId,
        providerCaptureId: captureId,
        providerStatus: captureData.status,
        rawResponse: {
          orderId: captureData.id,
          status: captureData.status,
          captureId,
          captureStatus,
          payerEmail: captureData.payer?.email_address,
          payerId: captureData.payer?.payer_id,
          createTime: captureData.create_time,
          updateTime: captureData.update_time,
        },
      })

      if (!result.success) {
        // State transition failed but PayPal captured - this shouldn't happen
        // Log for investigation but return success since money was captured
        console.error("PayPal captured but state transition failed:", result.error)
      }

      return NextResponse.json({
        success: true,
        order: {
          id: result.order?.id,
          orderNumber: result.order?.orderNumber,
          status: result.order?.status,
        },
        paypalStatus: captureData.status,
        idempotent: result.alreadyInState,
      })
    } else {
      // Payment not completed (PENDING, DECLINED, etc.)
      markOrderFailed(order.id, {
        providerTransactionId: body.paypalOrderId,
        providerStatus: captureData.status,
        rawResponse: captureData,
      })

      return NextResponse.json(
        { error: `Payment not completed. Status: ${captureData.status}` },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error("Error capturing PayPal order:", error)
    return NextResponse.json(
      { error: "Failed to capture PayPal order" },
      { status: 500 }
    )
  }
}
