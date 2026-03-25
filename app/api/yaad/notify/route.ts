/**
 * POST /api/yaad/notify
 * 
 * Server-to-server IPN endpoint for Yaad payment notifications.
 * This is the authoritative payment confirmation - the browser redirect is only for UX.
 * 
 * This route reuses the same processing logic as /api/yaad/callback POST handler.
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
 * Process Yaad payment result (server-to-server notification).
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
  const callbackAmount = params.get("Amount")
  const yaadPayload = extractYaadPayload(params)

  // IDEMPOTENCY CHECK: If already paid with this transaction, return success
  if (order.status === "paid") {
    if (order.providerRefs.orderId === transactionId) {
      return { success: true, idempotent: true }
    }
    console.warn("Yaad notify received for already-paid order with different transaction", {
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

  // Process based on Yaad status code (CCode === "0" means success)
  if (status === "0") {
    // CRITICAL: Amount field is mandatory for success
    if (!callbackAmount) {
      console.error("Yaad notify: Success callback missing Amount field", {
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
    // Note: amounts are in dollars, Yaad sends amount in agorot (cents) for ILS
    // For USD amounts, we compare directly
    const internalAmount = order.totals.total.amount.toFixed(2)
    const yaadAmount = parseFloat(callbackAmount).toFixed(2)

    if (yaadAmount !== internalAmount) {
      console.error("Yaad notify: Amount mismatch", {
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
        source: "yaad_notify",
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
 * POST /api/yaad/notify
 * Server-to-server IPN notification from Yaad.
 * This is the authoritative payment confirmation.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const params = new URLSearchParams(body)

    const orderId = params.get("tmp") || params.get("orderId")

    if (!orderId) {
      console.error("Yaad notify: Missing order ID", { params: Object.fromEntries(params) })
      return NextResponse.json(
        { error: "Missing order ID" },
        { status: 400 }
      )
    }

    const order = getOrderById(orderId)
    if (!order) {
      console.error("Yaad notify: Order not found", orderId)
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      )
    }

    // Verify signature (mandatory for server-to-server)
    let signatureValid = false
    if (YAAD_API_KEY) {
      signatureValid = verifyYaadSignature(params, YAAD_API_KEY)
      if (!signatureValid) {
        console.error("Yaad notify: Invalid signature", {
          orderId,
          params: Object.fromEntries(params),
        })
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 400 }
        )
      }
    } else {
      // In development without API key, log warning but continue
      console.warn("Yaad notify: No API key configured, skipping signature verification")
      signatureValid = true
    }

    const result = processYaadPayment(order, params, signatureValid)

    if (result.success) {
      return NextResponse.json({
        success: true,
        orderId: order.id,
        orderNumber: order.orderNumber,
        idempotent: result.idempotent,
      })
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error("Error processing Yaad notify:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
