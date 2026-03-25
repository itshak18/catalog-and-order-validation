/**
 * POST /api/paypal/create-order
 * Creates a PayPal order for checkout.
 */

import { NextRequest, NextResponse } from "next/server"
import { getOrderById, attachPaymentProviderId } from "@/lib/orders"

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET
const PAYPAL_ENV = process.env.PAYPAL_ENV || "sandbox"
const PAYPAL_API_URL = PAYPAL_ENV === "live" 
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com"

interface CreatePayPalOrderRequest {
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
    const body: CreatePayPalOrderRequest = await request.json()

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

    // Check if PayPal is configured BEFORE attempting token fetch
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      // Return mock response for development
      const mockPayPalOrderId = `PAYPAL-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      
      // Attach mock PayPal ID to order (transitions to payment_processing)
      const result = attachPaymentProviderId(order.id, mockPayPalOrderId)
      
      if (!result.success && !result.alreadyInState) {
        return NextResponse.json(
          { error: result.error || "Failed to initiate payment" },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        paypalOrderId: mockPayPalOrderId,
        approvalUrl: null, // No approval URL in mock mode
        mock: true,
      })
    }

    // Get PayPal access token (credentials already validated above)
    const accessToken = await getPayPalAccessToken()

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

    // Create PayPal order using the current v2 Orders API structure
    // Note: amounts are already in dollars from the pricing module
    const paypalOrder = {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: order.id,
          description: `Juliris Order ${order.orderNumber}`,
          amount: {
            currency_code: order.totals.total.currency,
            value: order.totals.total.amount.toFixed(2),
            breakdown: {
              item_total: {
                currency_code: order.totals.subtotal.currency,
                value: order.totals.subtotal.amount.toFixed(2),
              },
              shipping: {
                currency_code: order.totals.shipping.currency,
                value: order.totals.shipping.amount.toFixed(2),
              },
              discount: {
                currency_code: order.totals.discount.currency,
                value: order.totals.discount.amount.toFixed(2),
              },
              tax_total: {
                currency_code: order.totals.tax.currency,
                value: order.totals.tax.amount.toFixed(2),
              },
            },
          },
          items: order.lines.map((line) => ({
            name: line.name,
            description: line.description.slice(0, 127),
            quantity: line.quantity.toString(),
            unit_amount: {
              currency_code: "USD",
              value: line.unitPrice.toFixed(2),
            },
          })),
        },
      ],
      // Use payment_source.paypal.experience_context per current PayPal v2 Orders API spec
      // application_context is deprecated and URLs may be ignored
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: "Juliris",
            landing_page: "NO_PREFERENCE",
            user_action: "PAY_NOW",
            return_url: `${baseUrl}/api/paypal/return?orderId=${order.id}`,
            cancel_url: `${baseUrl}/api/paypal/cancel?orderId=${order.id}`,
          },
        },
      },
    }

    // Use internal order ID as idempotency key to prevent duplicate PayPal orders
    // If this request is retried, PayPal returns the same order instead of creating a new one
    const idempotencyKey = `create-${order.id}`

    const response = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": idempotencyKey,
      },
      body: JSON.stringify(paypalOrder),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("PayPal create order error:", errorData)
      throw new Error("Failed to create PayPal order")
    }

    const paypalResponse = await response.json()

    // Attach PayPal order ID to internal order (transitions to payment_processing)
    const attachResult = attachPaymentProviderId(order.id, paypalResponse.id)
    
    if (!attachResult.success && !attachResult.alreadyInState) {
      // Attach failed but PayPal order was already created
      // This is a critical inconsistency - return error for reconciliation
      console.error("Failed to attach PayPal order ID to internal order:", {
        error: attachResult.error,
        orderId: order.id,
        paypalOrderId: paypalResponse.id,
        storedProviderId: order.providerRefs.orderId,
      })

      // If the stored provider ID is different from what PayPal returned, this is a real error
      if (order.providerRefs.orderId && order.providerRefs.orderId !== paypalResponse.id) {
        return NextResponse.json(
          {
            error: "PayPal order created but internal state update failed. Requires manual reconciliation.",
            reconciliationRequired: true,
            paypalOrderId: paypalResponse.id,
            internalOrderId: order.id,
            storedPayPalOrderId: order.providerRefs.orderId,
          },
          { status: 500 }
        )
      }

      // If stored ID matches PayPal ID, it was idempotent - continue
      if (order.providerRefs.orderId === paypalResponse.id) {
        console.info("Attach was idempotent - same PayPal order ID already stored")
      } else {
        // No stored ID but attach failed for another reason - don't proceed
        return NextResponse.json(
          {
            error: "Failed to link PayPal order to internal order.",
            reconciliationRequired: true,
            paypalOrderId: paypalResponse.id,
          },
          { status: 500 }
        )
      }
    }

    // Find approval URL
    const approvalUrl = paypalResponse.links?.find(
      (link: { rel: string; href: string }) => link.rel === "approve"
    )?.href

    return NextResponse.json({
      success: true,
      paypalOrderId: paypalResponse.id,
      approvalUrl,
    })
  } catch (error) {
    console.error("Error creating PayPal order:", error)
    return NextResponse.json(
      { error: "Failed to create PayPal order" },
      { status: 500 }
    )
  }
}
