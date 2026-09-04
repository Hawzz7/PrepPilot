import crypto from "crypto";
import Payment from "../models/payment.model.js";
import razorpay from "../config/razorpay.js";
import { PLANS, PLAN_LEVELS } from "../config/plans.js";

export const createOrder = async (req, res) => {
  try {
    // ==========================================
    // CHECK AUTHENTICATED USER
    // ==========================================

    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    // ==========================================
    // GET PLAN FROM FRONTEND
    // ==========================================

    const { plan } = req.body;

    if (!plan || !PLANS[plan]) {
      return res.status(400).json({
        success: false,
        message: "Invalid plan.",
      });
    }

    // ==========================================
    // GET PLAN DETAILS FROM SERVER
    // ==========================================

    const selectedPlan = PLANS[plan];

    // Razorpay amount is in paise
    const amountInPaise = selectedPlan.amount * 100;

    // ==========================================
    // CREATE RAZORPAY ORDER
    // ==========================================

    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        userId: user._id.toString(),
        plan: plan,
        credits: selectedPlan.credits.toString(),
      },
    };

    const order = await razorpay.orders.create(options);

    await Payment.create({
      userId: user._id,
      razorpayOrderId: order.id,
      plan,
      amount: selectedPlan.amount,
      credits: selectedPlan.credits,
      status: "created",
    });

    console.log("========== RAZORPAY ORDER CREATED ==========");
    console.log("Order ID:", order.id);
    console.log("User ID:", user._id);
    console.log("Plan:", plan);
    console.log("Amount:", selectedPlan.amount);
    console.log("Credits:", selectedPlan.credits);

    // ==========================================
    // SEND ORDER TO FRONTEND
    // ==========================================

    return res.status(200).json({
      success: true,

      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      },

      plan: {
        name: selectedPlan.name,
        amount: selectedPlan.amount,
        credits: selectedPlan.credits,
      },

      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Create Razorpay Order Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create payment order.",
    });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const user = req.user;

    // ==========================================
    // CHECK AUTHENTICATED USER
    // ==========================================

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    // ==========================================
    // VALIDATE PAYMENT RESPONSE
    // ==========================================

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        message: "Incomplete payment details.",
      });
    }

    // ==========================================
    // FIND PAYMENT IN DATABASE
    // ==========================================

    const payment = await Payment.findOne({
      razorpayOrderId: razorpay_order_id,
      userId: user._id,
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found.",
      });
    }

    // ==========================================
    // PREVENT DUPLICATE CREDIT ALLOCATION
    // ==========================================

    if (payment.status === "paid") {
      return res.status(200).json({
        success: true,
        message: "Payment already verified.",
        credits: payment.credits,
        plan: user.plan,
        planExpiresAt: user.planExpiresAt,
      });
    }

    // ==========================================
    // GENERATE SIGNATURE
    // ==========================================

    const generatedSignature = crypto
      .createHmac(
        "sha256",
        process.env.RAZORPAY_KEY_SECRET,
      )
      .update(
        `${razorpay_order_id}|${razorpay_payment_id}`,
      )
      .digest("hex");

    // ==========================================
    // VERIFY SIGNATURE
    // ==========================================

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed.",
      });
    }

    // ==========================================
    // UPDATE PAYMENT
    // ==========================================

    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.status = "paid";

    await payment.save();

    // ==========================================
    // ADD CREDITS
    // ==========================================

    user.credits += payment.credits;

    // ==========================================
    // PLAN / EXPIRY LOGIC
    // ==========================================

    const purchasedPlan = payment.plan;

    const currentPlan = user.plan || "free";

    const currentPlanLevel =
      PLAN_LEVELS[currentPlan];

    const purchasedPlanLevel =
      PLAN_LEVELS[purchasedPlan];

    const now = new Date();

    // Determine whether the current paid plan
    // is still active.
    const currentPlanIsActive =
      currentPlan !== "free" &&
      user.planExpiresAt &&
      user.planExpiresAt > now;

    // ==========================================
    // STARTER PURCHASE
    // ==========================================

    if (purchasedPlan === "starter") {
      /*
       * If the user currently has an active Pro plan,
       * don't downgrade them.
       *
       * They still receive the Starter credits.
       * Their existing Pro expiry remains unchanged.
       */
      if (
        currentPlan === "pro" &&
        currentPlanIsActive
      ) {
        console.log(
          "Active Pro plan preserved after Starter purchase.",
        );
      } else {
        /*
         * User is Free, Starter, or has an expired plan.
         *
         * Give them Starter access for 30 days.
         */
        user.plan = "starter";

        user.planExpiresAt = new Date(
          now.getTime() +
            PLANS.starter.durationDays *
              24 *
              60 *
              60 *
              1000,
        );
      }
    }

    // ==========================================
    // PRO PURCHASE
    // ==========================================

    if (purchasedPlan === "pro") {
      /*
       * Option A:
       *
       * Every Pro purchase starts a fresh
       * 30-day Pro feature-access period.
       *
       * This applies whether the user is:
       *
       * Free → Pro
       * Starter → Pro
       * Pro → Pro
       * Expired Pro → Pro
       */
      user.plan = "pro";

      user.planExpiresAt = new Date(
        now.getTime() +
          PLANS.pro.durationDays *
            24 *
            60 *
            60 *
            1000,
      );
    }

    await user.save();

    // ==========================================
    // LOG PAYMENT
    // ==========================================

    console.log("========== PAYMENT VERIFIED ==========");
    console.log("User:", user._id);
    console.log("Order ID:", razorpay_order_id);
    console.log("Payment ID:", razorpay_payment_id);
    console.log("Plan Purchased:", purchasedPlan);
    console.log("Previous Plan:", currentPlan);
    console.log("Current Plan:", user.plan);
    console.log("Plan Active:", currentPlanIsActive);
    console.log("Plan Expires:", user.planExpiresAt);
    console.log("Credits Added:", payment.credits);
    console.log("Total Credits:", user.credits);
    console.log("======================================");

    // ==========================================
    // SEND RESPONSE
    // ==========================================

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully.",

      creditsAdded: payment.credits,
      credits: user.credits,

      plan: user.plan,
      planExpiresAt: user.planExpiresAt,
    });
  } catch (error) {
    console.error(
      "Payment Verification Error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Payment verification failed.",
    });
  }
};