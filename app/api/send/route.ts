import { NextRequest, NextResponse } from "next/server";
import { getQuote } from "@lifi/sdk";
import { createConfig, EVM } from "@lifi/sdk";

// Initialize LI.FI SDK
let initialized = false;
function ensureInitialized() {
  if (initialized) return;
  createConfig({
    integrator: process.env.NEXT_PUBLIC_LIFI_INTEGRATOR || "payflow-hackathon",
    providers: [EVM()],
  });
  initialized = true;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      fromChain,
      toChain,
      fromToken,
      toToken,
      fromAmount,
      toAmount, // For "receive exact" mode
      fromAddress,
      toAddress,
      slippage = 0.005, // 0.5% default slippage
    } = body;

    // Validate required fields - need either fromAmount or toAmount
    if (!fromChain || !toChain || !fromToken || !toToken || !fromAddress) {
      return NextResponse.json(
        { error: "Missing required fields: fromChain, toChain, fromToken, toToken, fromAddress" },
        { status: 400 }
      );
    }

    if (!fromAmount && !toAmount) {
      return NextResponse.json(
        { error: "Either fromAmount or toAmount is required" },
        { status: 400 }
      );
    }

    ensureInitialized();

    // Build quote params - use toAmount for "receive exact" mode, otherwise fromAmount
    const baseParams = {
      fromChain,
      toChain,
      fromToken,
      toToken,
      fromAddress,
      toAddress: toAddress || fromAddress,
      slippage,
    };

    // Get quote from LI.FI
    const quote = toAmount
      ? await getQuote({ ...baseParams, toAmount })
      : await getQuote({ ...baseParams, fromAmount });

    // Extract the key information for the frontend
    const response = {
      // Quote identification
      id: quote.id,
      type: quote.type,
      tool: quote.tool,

      // Action details
      action: {
        fromChainId: quote.action.fromChainId,
        toChainId: quote.action.toChainId,
        fromToken: quote.action.fromToken,
        toToken: quote.action.toToken,
        fromAmount: quote.action.fromAmount,
        toAddress: quote.action.toAddress,
      },

      // Estimate (what the user will receive)
      estimate: {
        toAmount: quote.estimate.toAmount,
        toAmountMin: quote.estimate.toAmountMin,
        approvalAddress: quote.estimate.approvalAddress,
        executionDuration: quote.estimate.executionDuration,
        feeCosts: quote.estimate.feeCosts,
        gasCosts: quote.estimate.gasCosts,
      },

      // Transaction to execute (this is what gets sent to the wallet)
      transactionRequest: quote.transactionRequest,

      // For cross-chain status tracking
      toolDetails: quote.toolDetails,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Send quote error:", error);

    // Handle LI.FI specific errors
    if (error instanceof Error) {
      if (error.message.includes("No available quotes")) {
        return NextResponse.json(
          { error: "No route found for this transfer. Try a different token pair or amount." },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to get quote" },
      { status: 500 }
    );
  }
}
