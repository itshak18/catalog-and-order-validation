/**
 * POST /api/paypal/capture-order
 * Captures an approved PayPal order and marks the internal order as paid.
 *
 * Idempotency: Safe to call multiple times with the same paypalOrderId.
 * Double-capture protection via order state machine.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getOrderById,
  isPaymentTerminal,
  markOrderFailed,
  markOrderPaid,
} from "@/lib/orders";

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_ENV = process.env.PAYPAL_ENV || "sandbox";
const PAYPAL_API_URL = PAYPAL_ENV === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

interface CapturePayPalOrderRequest {
  paypalOrderId: string;
  orderId: string;
}

async function getPayPalAccessToken(): Promise<string> {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error("PayPal credentials not configured");
  }

  const auth = Buffer.from(
    `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`,
  ).toString("base64");

  const response = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error("Failed to get PayPal access token");
  }

  const data = await response.json();
  return data.access_token;
}

export async function POST(request: NextRequest) {
  try {
    const body: CapturePayPalOrderRequest = await request.json();

    if (!body.paypalOrderId || !body.orderId) {
      return NextResponse.json(
        { error: "PayPal order ID and internal order ID are required" },
        { status: 400 },
      );
    }

    // Get the internal order
    const order = getOrderById(body.orderId);
    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 },
      );
    }

    // Idempotency: already paid with this PayPal order
    if (
      order.status === "paid" &&
      order.providerRefs.orderId === body.paypalOrderId
    ) {
      return NextResponse.json({
        success: true,
        idempotent: true,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
        },
        message: "Order was already captured successfully.",
      });
    }

    // Guard: terminal state and this is a new capture attempt
    if (isPaymentTerminal(order)) {
      return NextResponse.json(
        {
          error: "Order is already in a terminal payment state",
          orderStatus: order.status,
        },
        { status: 400 },
      );
    }

    // Verify PayPal order ID matches stored reference
    if (
      order.providerRefs.orderId &&
      order.providerRefs.orderId !== body.paypalOrderId
    ) {
      return NextResponse.json(
        { error: "PayPal order ID mismatch" },
        { status: 400 },
      );
    }

    // Dev-mode mock when credentials missing
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      const result = markOrderPaid(order.id, {
        providerTransactionId: body.paypalOrderId,
        providerCaptureId: `MOCK_CAPTURE_${Date.now()}`,
        providerStatus: "COMPLETED",
        rawResponse: { mock: true, timestamp: new Date().toISOString() },
      });

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 },
        );
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
      });
    }

    // Real PayPal capture
    const accessToken = await getPayPalAccessToken();

    const idempotencyKey = `capture-${order.id}-${body.paypalOrderId}`;

    const response = await fetch(
      `${PAYPAL_API_URL}/v2/checkout/orders/${body.paypalOrderId}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "PayPal-Request-Id": idempotencyKey,
        },
      },
    );

    let captureData: any = null;
    try {
      captureData = await response.json();
    } catch {
      captureData = null;
    }

    // Error branch from PayPal
    if (!response.ok) {
      console.error("PayPal capture error:", captureData);

      // First set of errorName/errorDetails used for ORDER_ALREADY_CAPTURED handling
      const errorName = captureData?.name;
      const errorDetails = captureData?.details?.[0]?.issue;

      // ORDER_ALREADY_CAPTURED path
      if (
        errorName === "UNPROCESSABLE_ENTITY" &&
        errorDetails === "ORDER_ALREADY_CAPTURED"
      ) {
        const orderResponse = await fetch(
          `${PAYPAL_API_URL}/v2/checkout/orders/${body.paypalOrderId}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        );

        const orderData = await orderResponse.json();

        if (orderData.status === "COMPLETED") {
          const capture = orderData.purchase_units?.[0]?.payments?.captures
            ?.[0];
          const captureId = capture?.id;
          const capturedAmount = capture?.amount?.value;
          const capturedCurrency = capture?.amount?.currency_code;

          const internalAmount = (order.totals.total.amount / 100).toFixed(2);
          const internalCurrency = order.totals.total.currency;

          if (!capturedAmount || !capturedCurrency) {
            console.error(
              "PayPal ORDER_ALREADY_CAPTURED: Missing amount/currency",
              { captureId, orderData },
            );
            markOrderFailed(order.id, {
              providerTransactionId: body.paypalOrderId,
              providerStatus: "MISSING_AMOUNT_CURRENCY",
              rawResponse: orderData,
            });

            return NextResponse.json(
              {
                error:
                  "PayPal response missing amount/currency. Cannot reconcile. Order marked failed.",
              },
              { status: 400 },
            );
          }

          if (
            capturedAmount !== internalAmount ||
            capturedCurrency !== internalCurrency
          ) {
            console.error("PayPal ORDER_ALREADY_CAPTURED: Amount mismatch", {
              expected: { amount: internalAmount, currency: internalCurrency },
              captured: { amount: capturedAmount, currency: capturedCurrency },
              orderId: order.id,
            });

            markOrderFailed(order.id, {
              providerTransactionId: body.paypalOrderId,
              providerStatus: "AMOUNT_MISMATCH",
              rawResponse: {
                ...orderData,
                reconciliation: {
                  expected: {
                    amount: internalAmount,
                    currency: internalCurrency,
                  },
                  captured: {
                    amount: capturedAmount,
                    currency: capturedCurrency,
                  },
                },
              },
            });

            return NextResponse.json(
              {
                error:
                  "Amount mismatch between PayPal and internal order. Order marked failed for manual review.",
                reconciliation: {
                  expected: {
                    amount: internalAmount,
                    currency: internalCurrency,
                  },
                  captured: {
                    amount: capturedAmount,
                    currency: capturedCurrency,
                  },
                },
              },
              { status: 400 },
            );
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
          });

          if (!result.success && !result.alreadyInState) {
            console.error(
              "PayPal ORDER_ALREADY_CAPTURED but state transition failed:",
              {
                error: result.error,
                orderId: order.id,
                paypalOrderId: body.paypalOrderId,
                captureId,
              },
            );

            return NextResponse.json(
              {
                success: false,
                error:
                  "Payment was captured by PayPal but order state update failed. Requires manual reconciliation.",
                reconciliationRequired: true,
                captureDetails: {
                  captureId,
                  amount: capturedAmount,
                  currency: capturedCurrency,
                  paypalOrderId: body.paypalOrderId,
                },
              },
              { status: 500 },
            );
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
          });
        }
      }

      // Reuse errorName/errorDetails here instead of redeclaring
      const isProviderIssue = errorName === "SERVICE_UNAVAILABLE" ||
        errorName === "INTERNAL_SERVER_ERROR" ||
        errorName === "REQUEST_TIMEOUT" ||
        captureData?.message?.toLowerCase?.().includes("timeout") ||
        captureData?.message?.toLowerCase?.().includes("temporarily") ||
        captureData?.message?.toLowerCase?.().includes("service");

      const isCustomerFailure =
        errorDetails?.includes?.("INSTRUMENT_DECLINED") ||
        errorDetails?.includes?.("INSUFFICIENT_FUNDS") ||
        errorDetails?.includes?.("AUTHENTICATION_REQUIRED");

      markOrderFailed(order.id, {
        providerTransactionId: body.paypalOrderId,
        providerStatus: errorName || "FAILED",
        isProviderError: isProviderIssue && !isCustomerFailure,
        rawResponse: captureData,
      });

      return NextResponse.json(
        {
          error: "Failed to capture PayPal payment",
          details: captureData,
          isProviderError: isProviderIssue && !isCustomerFailure,
          retryable: isProviderIssue && !isCustomerFailure,
        },
        { status: 400 },
      );
    }

    // Success path
    const capture = captureData?.purchase_units?.[0]?.payments?.captures?.[0];
    const captureId = capture?.id;
    const captureStatus = capture?.status;
    const capturedAmount = capture?.amount?.value;
    const capturedCurrency = capture?.amount?.currency_code;

    if (
      captureData?.status === "COMPLETED" &&
      captureStatus === "COMPLETED"
    ) {
      const internalAmount = (order.totals.total.amount / 100).toFixed(2);
      const internalCurrency = order.totals.total.currency;

      if (!capturedAmount || !capturedCurrency) {
        console.error(
          "PayPal capture: Missing amount/currency in response",
          { captureId, captureData },
        );
        markOrderFailed(order.id, {
          providerTransactionId: body.paypalOrderId,
          providerStatus: "MISSING_AMOUNT_CURRENCY",
          rawResponse: captureData,
        });

        return NextResponse.json(
          {
            error:
              "PayPal response missing amount/currency. Cannot reconcile. Order marked failed.",
          },
          { status: 400 },
        );
      }

      if (
        capturedAmount !== internalAmount ||
        capturedCurrency !== internalCurrency
      ) {
        console.error("PayPal capture: Amount mismatch", {
          expected: { amount: internalAmount, currency: internalCurrency },
          captured: { amount: capturedAmount, currency: capturedCurrency },
          orderId: order.id,
        });

        markOrderFailed(order.id, {
          providerTransactionId: body.paypalOrderId,
          providerStatus: "AMOUNT_MISMATCH",
          rawResponse: {
            ...captureData,
            reconciliation: {
              expected: {
                amount: internalAmount,
                currency: internalCurrency,
              },
              captured: {
                amount: capturedAmount,
                currency: capturedCurrency,
              },
            },
          },
        });

        return NextResponse.json(
          {
            error:
              "Amount mismatch between PayPal and internal order. Order marked failed for manual review.",
            reconciliation: {
              expected: {
                amount: internalAmount,
                currency: internalCurrency,
              },
              captured: {
                amount: capturedAmount,
                currency: capturedCurrency,
              },
            },
          },
          { status: 400 },
        );
      }

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
      });

      if (!result.success && !result.alreadyInState) {
        console.error("PayPal captured but state transition failed:", {
          error: result.error,
          orderId: order.id,
          paypalOrderId: body.paypalOrderId,
          captureId,
        });

        return NextResponse.json(
          {
            success: false,
            error:
              "Payment captured by PayPal but order state update failed. Requires manual reconciliation.",
            reconciliationRequired: true,
            captureDetails: {
              captureId,
              amount: capturedAmount,
              currency: capturedCurrency,
              paypalOrderId: body.paypalOrderId,
            },
          },
          { status: 500 },
        );
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
      });
    } else {
      const isProviderIssue = captureData?.status === "PENDING" ||
        captureStatus?.includes?.("PENDING") ||
        captureData?.message?.toLowerCase?.().includes("timeout") ||
        captureData?.message?.toLowerCase?.().includes("service");

      markOrderFailed(order.id, {
        providerTransactionId: body.paypalOrderId,
        providerStatus: captureData?.status,
        isProviderError: isProviderIssue,
        rawResponse: captureData,
      });

      return NextResponse.json(
        {
          error: `Payment not completed. Status: ${captureData?.status}`,
          isProviderIssue,
          retryable: isProviderIssue,
        },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("Error capturing PayPal order:", error);
    return NextResponse.json(
      { error: "Failed to capture PayPal order" },
      { status: 500 },
    );
  }
}
