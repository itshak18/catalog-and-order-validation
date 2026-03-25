/**
 * Yaad callback handlers for both redirect (GET) and IPN (POST).
 * 
 * Idempotency: Both handlers check order state before transitioning.
 * A paid order remains paid regardless of callback replay.
 */

import { NextRequest, NextResponse } from "next/server"
import {
  getOrderById,
  markOrderPaid,
  markOrderFailed,
  markOrderCancelled,
  isPaymentTerminal,
} from "@/lib/orders"

const YAAD_API_KEY = process.env.YAAD_API_KEY

/**
 * Verify Yaad signature.
 */
function verifyYaadSignature(params: URLSearchParams, apiKey: string): boolean {
  const receivedSignature = params.get("Sign") || params.get("signature")
  if (!receivedSignature) return false

  const verifyParams = new URLSearchParams(params)
  verifyParams.delete("Sign")
  verifyParams.delete("signature")

  const sortedKeys = Array.from(verifyParams.keys()).sort()
  const signatureString = sortedKeys.map((key) => `${key}=${verifyParams.get(key)}`).join("&")

  const crypto = require("crypto")
  const expectedSignature = crypto.createHmac("sha256", apiKey).update(signatureString).digest("hex")

  return receivedSignature.toLowerCase() === expectedSignature.toLowerCase()
}

/**
 * Extract relevant data from Yaad callback params for audit logging.
 */
function extractYaadPayload(params: URLSearchParams): Record<string, unknown> {
  return {
    transactionId: params.get("Id") || params.get("trans_id"),
    status: params.get("CCode") || params.get("status"),
    errorCode: params.get("Rone") || params.get("error_code"),
    amount: params.get("Amount"),
    orderId: params.get("Order"),
    internalOrderId: params.get("tmp") || params.get("orderId"),
    authNumber: params.get("AuthNum"),
    cardMask: params.get("CardMask"),
    timestamp: new Date().toISOString(),
  }
}

/**
 * Process Yaad payment result.
 * Unified logic for both GET redirect and POST IPN.
 */
function processYaadPayment(
  order: ReturnType<typeof getOrderById>,
  params: URLSearchParams,
  signatureValid: boolean
): { success: boolean; error?: string; idempotent: boolean } {
  if (!order) {
    return { success: false, error: "Order not found", idempotent: false }
  }

  const status = params.get("CCode") || params.get("status")
  const transactionId = params.get("Id") || params.get("trans_id")
  const callbackAmount = params.get("Amount") // Amount from Yaad callback
  const yaadPayload = extractYaadPayload(params)

  // IDEMPOTENCY CHECK: If already paid with this transaction, return success
  if (order.status === "paid") {
    if (order.providerRefs.orderId === transactionId) {
      return { success: true, idempotent: true }
    }
    // Different transaction on already-paid order - suspicious but don't change state
    console.warn("Yaad callback received for already-paid order with different transaction", {
      orderId: order.id,
      existingTransaction: order.providerRefs.orderId,
      newTransaction: transactionId,
    })
    return { success: true, idempotent: true }
  }

  // GUARD: Don't process if order is in terminal state
  if (isPaymentTerminal(order)) {
    return { success: true, idempotent: true }
  }

  // Process based on Yaad status code
  // CCode === "0" means success in Yaad
  if (status === "0") {
    // CRITICAL: Amount field is mandatory for success
    if (!callbackAmount) {
      console.error("Yaad success callback missing Amount field", {
        orderId: order.id,
        transactionId,
        payload: yaadPayload,
      })

      markOrderFailed(order.id, {
        providerTransactionId: transactionId || undefined,
        providerStatus: "MISSING_AMOUNT",
        rawResponse: yaadPayload,
      })

      return { 
        success: false, 
        error: "Payment success reported but amount is missing. Order marked failed for manual review.",
        idempotent: false,
      }
    }

    // CRITICAL: Reconcile callback amount against internal order total
    // Yaad sends amount in cents, so convert internal total from cents
    const internalAmount = (order.totals.total.amount / 100).toFixed(2)
    const yaadAmount = (parseFloat(callbackAmount) / 100).toFixed(2)

    if (yaadAmount !== internalAmount) {
      console.error("Yaad amount mismatch", {
        orderId: order.id,
        expected: internalAmount,
        received: yaadAmount,
        transactionId,
      })

      markOrderFailed(order.id, {
        providerTransactionId: transactionId || undefined,
        providerStatus: "AMOUNT_MISMATCH",
        rawResponse: {
          ...yaadPayload,
          reconciliation: {
            expected: internalAmount,
            received: yaadAmount,
          },
        },
      })

      return { 
        success: false, 
        error: `Amount mismatch: expected ${internalAmount}, received ${yaadAmount}`,
        idempotent: false,
      }
    }

    const result = markOrderPaid(order.id, {
      providerTransactionId: transactionId || undefined,
      providerStatus: "COMPLETED",
      rawResponse: {
        ...yaadPayload,
        signatureValid,
        source: "yaad_callback",
      },
    })

    if (!result.success && !result.alreadyInState) {
      return { success: false, error: result.error || "Failed to mark order paid", idempotent: false }
    }

    return { success: true, idempotent: result.alreadyInState }
  } else {
    // Payment failed - determine if it's a failure or cancellation
    const errorCode = params.get("Rone") || params.get("error_code")
    const isCancellation = errorCode === "999" || status === "cancelled"

    if (isCancellation) {
      markOrderCancelled(order.id, {
        providerTransactionId: transactionId || undefined,
        rawResponse: yaadPayload,
      })
    } else {
      markOrderFailed(order.id, {
        providerTransactionId: transactionId || undefined,
        providerStatus: `FAILED_${status}`,
        rawResponse: yaadPayload,
      })
    }

    return { 
      success: false, 
      error: `Payment ${isCancellation ? "cancelled" : "failed"}: ${errorCode || status}`,
      idempotent: false,
    }
  }
}

/**
 * GET /api/yaad/callback
 * Success/error redirect callback from Yaad.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const orderId = searchParams.get("tmp") || searchParams.get("orderId")

    // Handle mock mode for development
    if (searchParams.get("yaadMock") === "true" && orderId) {
      const order = getOrderById(orderId)
      if (order) {
        const result = markOrderPaid(order.id, {
          providerTransactionId: `YAAD_MOCK_${Date.now()}`,
          providerStatus: "COMPLETED",
          rawResponse: { mock: true, timestamp: new Date().toISOString() },
        })
        
        // Return success even if already paid (idempotent)
        if (result.success || result.alreadyInState) {
          return NextResponse.redirect(
            new URL(`/thank-you?orderId=${orderId}`, request.url)
          )
        }
      }
      return NextResponse.redirect(
        new URL("/checkout?error=mock_failed", request.url)
      )
    }

    if (!orderId) {
      console.error("Yaad callback: Missing order ID")
      return NextResponse.redirect(
        new URL("/checkout?error=missing_order", request.url)
      )
    }

    const order = getOrderById(orderId)
    if (!order) {
      console.error("Yaad callback: Order not found", orderId)
      return NextResponse.redirect(
        new URL("/checkout?error=order_not_found", request.url)
      )
    }

    // Verify signature if configured
    let signatureValid = true
    if (YAAD_API_KEY) {
      signatureValid = verifyYaadSignature(searchParams, YAAD_API_KEY)
      if (!signatureValid) {
        console.warn("Yaad callback: Invalid signature on redirect", { 
          orderId, 
          params: Object.fromEntries(searchParams),
          note: "IPN will be authoritative confirmation"
        })
        
        // Do NOT fail the order on signature mismatch from browser redirect
        // The POST/IPN is the authoritative payment confirmation
        // Invalid redirect signature could be tampering, but the user hasn't paid yet at this point
        // Wait for the server-to-server IPN to confirm payment status
        
        return NextResponse.redirect(
          new URL("/checkout?error=invalid_signature", request.url)
        )
      }
    }

    // Process the payment
    const result = processYaadPayment(order, searchParams, signatureValid)

    if (result.success) {
      return NextResponse.redirect(
        new URL(`/thank-you?orderId=${order.id}&orderNumber=${order.orderNumber}`, request.url)
      )
    } else {
      const errorCode = searchParams.get("Rone") || searchParams.get("error_code") || "unknown"
      return NextResponse.redirect(
        new URL(`/checkout?error=payment_failed&code=${errorCode}`, request.url)
      )
    }
  } catch (error) {
    console.error("Error processing Yaad redirect callback:", error)
    return NextResponse.redirect(
      new URL("/checkout?error=callback_error", request.url)
    )
  }
}

/**
 * POST /api/yaad/callback
 * Server-to-server IPN notification from Yaad.
 * This is the authoritative payment confirmation.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const params = new URLSearchParams(body)

    const orderId = params.get("tmp") || params.get("orderId")
    const transactionId = params.get("Id") || params.get("trans_id")

    console.log("Yaad IPN received:", { orderId, transactionId, status: params.get("CCode") })

    if (!orderId) {
      return NextResponse.json(
        { error: "Missing order ID" },
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

    // Verify signature - IPN signature verification is critical
    let signatureValid = true
    if (YAAD_API_KEY) {
      signatureValid = verifyYaadSignature(params, YAAD_API_KEY)
      if (!signatureValid) {
        console.error("Yaad IPN: Invalid signature", { orderId, transactionId })
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 400 }
        )
      }
    }

    // Process the payment
    const result = processYaadPayment(order, params, signatureValid)

    if (result.success) {
      return NextResponse.json({
        success: true,
        status: order.status,
        idempotent: result.idempotent,
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
        status: order.status,
      })
    }
  } catch (error) {
    console.error("Error processing Yaad IPN:", error)
    return NextResponse.json(
      { error: "Failed to process notification" },
      { status: 500 }
    )
  }
}
