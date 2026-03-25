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

    // Use combination of internal order ID and PayPal order ID as idempotency key
    // This ensures retried capture requests return the same result from PayPal
    const idempotencyKey = `capture-${order.id}-${body.paypalOrderId}`

    // Capture the PayPal order
    const response = await fetch(
      `${PAYPAL_API_URL}/v2/checkout/orders/${body.paypalOrderId}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "PayPal-Request-Id": idempotencyKey,
        },
      }
    )

    const captureData = await response.json()

    // Handle PayPal response
    if (!response.ok) {
      console.error("PayPal capture error:", captureData)

      const errorName = captureData.name
      const errorDetails = captureData.details?.[0]?.issue

      // If PayPal says order already captured, apply same reconciliation as fresh capture
      if (errorName === "UNPROCESSABLE_ENTITY" && errorDetails === "ORDER_ALREADY_CAPTURED") {
        const orderResponse = await fetch(
          `${PAYPAL_API_URL}/v2/checkout/orders/${body.paypalOrderId}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        )
        const orderData = await orderResponse.json()

        if (orderData.status === "COMPLETED") {
          const captureId = orderData.purchase_units?.[0]?.payments?.captures?.[0]?.id
          const capturedAmount = orderData.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value
          const capturedCurrency = orderData.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.currency_code

          // CRITICAL: Same amount/currency reconciliation as fresh capture
          // Note: amounts are already in dollars from the pricing module
          const internalAmount = order.totals.total.amount.toFixed(2)
          const internalCurrency = order.totals.total.currency

          if (!capturedAmount || !capturedCurrency) {
            console.error("PayPal ORDER_ALREADY_CAPTURED: Missing amount/currency", { captureId, orderData })
            markOrderFailed(order.id, {
              providerTransactionId: body.paypalOrderId,
              providerStatus: "MISSING_AMOUNT_CURRENCY",
              rawResponse: orderData,
            })

            return NextResponse.json(
              { error: "PayPal response missing amount/currency. Cannot reconcile. Order marked failed." },
              { status: 400 }
            )
          }

          if (capturedAmount !== internalAmount || capturedCurrency !== internalCurrency) {
            console.error("PayPal ORDER_ALREADY_CAPTURED: Amount mismatch", {
              expected: { amount: internalAmount, currency: internalCurrency },
              captured: { amount: capturedAmount, currency: capturedCurrency },
              orderId: order.id,
            })

            markOrderFailed(order.id, {
              providerTransactionId: body.paypalOrderId,
              providerStatus: "AMOUNT_MISMATCH",
              rawResponse: {
                ...orderData,
                reconciliation: {
                  expected: { amount: internalAmount, currency: internalCurrency },
                  captured: { amount: capturedAmount, currency: capturedCurrency },
                },
              },
            })

            return NextResponse.json(
              { 
                error: "Amount mismatch between PayPal and internal order. Order marked failed for manual review.",
                reconciliation: {
                  expected: { amount: internalAmount, currency: internalCurrency },
                  captured: { amount: capturedAmount, currency: capturedCurrency },
                },
              },
              { status: 400 }
            )
          }

          const result = markOrderPaid(order.id, {
            providerTransactionId: body.paypalOrderId,
            providerCaptureId: captureId,
            providerStatus: "COMPLETED",
            rawResponse: {
              ...orderData,
              capturedAmount,
              capturedCurrency,
            },
          })

          // Check if internal transition succeeded
          if (!result.success && !result.alreadyInState) {
            console.error("PayPal ORDER_ALREADY_CAPTURED but state transition failed:", {
              error: result.error,
              orderId: order.id,
              paypalOrderId: body.paypalOrderId,
              captureId,
            })

            return NextResponse.json(
              {
                success: false,
                error: "Payment was captured by PayPal but order state update failed. Requires manual reconciliation.",
                reconciliationRequired: true,
                captureDetails: {
                  captureId,
                  amount: capturedAmount,
                  currency: capturedCurrency,
                  paypalOrderId: body.paypalOrderId,
                },
              },
              { status: 500 }
            )
          }

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

      // Determine if this is a customer/payment failure or provider/API error
      const isProviderIssue =
        errorName === "SERVICE_UNAVAILABLE" ||
        errorName === "INTERNAL_SERVER_ERROR" ||
        errorName === "REQUEST_TIMEOUT" ||
        captureData.message?.toLowerCase().includes("timeout") ||
        captureData.message?.toLowerCase().includes("temporarily") ||
        captureData.message?.toLowerCase().includes("service")

      // Customer failures: INSTRUMENT_DECLINED, INSUFFICIENT_FUNDS, etc.
      const isCustomerFailure =
        errorDetails?.includes("INSTRUMENT_DECLINED") ||
        errorDetails?.includes("INSUFFICIENT_FUNDS") ||
        errorDetails?.includes("AUTHENTICATION_REQUIRED")

      markOrderFailed(order.id, {
        providerTransactionId: body.paypalOrderId,
        providerStatus: errorName || "FAILED",
        isProviderError: isProviderIssue && !isCustomerFailure,
        rawResponse: captureData,
      })

      return NextResponse.json(
        {
          error: "Failed to capture PayPal payment",
          details: captureData,
          isProviderError: isProviderIssue && !isCustomerFailure,
          retryable: isProviderIssue && !isCustomerFailure,
        },
        { status: 400 }
      )
    }

    // Extract capture details
    const captureId = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id
    const captureStatus = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.status
    const capturedAmount = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value
    const capturedCurrency = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.currency_code

    // Check capture status
    if (captureData.status === "COMPLETED" && captureStatus === "COMPLETED") {
      // CRITICAL: Reconcile captured amount and currency against internal order
      // Note: amounts are already in dollars from the pricing module
      const internalAmount = order.totals.total.amount.toFixed(2)
      const internalCurrency = order.totals.total.currency

      if (!capturedAmount || !capturedCurrency) {
        console.error("PayPal capture: Missing amount/currency in response", { captureId, captureData })
        markOrderFailed(order.id, {
          providerTransactionId: body.paypalOrderId,
          providerStatus: "MISSING_AMOUNT_CURRENCY",
          rawResponse: captureData,
        })

        return NextResponse.json(
          { error: "PayPal response missing amount/currency. Cannot reconcile. Order marked failed." },
          { status: 400 }
        )
      }

      if (capturedAmount !== internalAmount || capturedCurrency !== internalCurrency) {
        console.error("PayPal capture: Amount mismatch", {
          expected: { amount: internalAmount, currency: internalCurrency },
          captured: { amount: capturedAmount, currency: capturedCurrency },
          orderId: order.id,
        })

        markOrderFailed(order.id, {
          providerTransactionId: body.paypalOrderId,
          providerStatus: "AMOUNT_MISMATCH",
          rawResponse: {
            ...captureData,
            reconciliation: {
              expected: { amount: internalAmount, currency: internalCurrency },
              captured: { amount: capturedAmount, currency: capturedCurrency },
            },
          },
        })

        return NextResponse.json(
          { 
            error: "Amount mismatch between PayPal and internal order. Order marked failed for manual review.",
            reconciliation: {
              expected: { amount: internalAmount, currency: internalCurrency },
              captured: { amount: capturedAmount, currency: capturedCurrency },
            },
          },
          { status: 400 }
        )
      }

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
          capturedAmount,
          capturedCurrency,
        },
      })

      // Check if internal transition succeeded
      if (!result.success && !result.alreadyInState) {
        // PayPal captured money but state transition failed - this is a critical issue
        console.error("PayPal captured but state transition failed:", {
          error: result.error,
          orderId: order.id,
          paypalOrderId: body.paypalOrderId,
          captureId,
        })

        return NextResponse.json(
          {
            success: false,
            error: "Payment captured by PayPal but order state update failed. Requires manual reconciliation.",
            reconciliationRequired: true,
            captureDetails: {
              captureId,
              amount: capturedAmount,
              currency: capturedCurrency,
              paypalOrderId: body.paypalOrderId,
            },
          },
          { status: 500 }
        )
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
      // Determine if this is a customer failure or provider error
      const isProviderIssue =
        captureData.status === "PENDING" ||
        captureStatus?.includes("PENDING") ||
        captureData.message?.toLowerCase().includes("timeout") ||
        captureData.message?.toLowerCase().includes("service")

      markOrderFailed(order.id, {
        providerTransactionId: body.paypalOrderId,
        providerStatus: captureData.status,
        isProviderError: isProviderIssue,
        rawResponse: captureData,
      })

      return NextResponse.json(
        { 
          error: `Payment not completed. Status: ${captureData.status}`,
          isProviderIssue,
          retryable: isProviderIssue,
        },
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
