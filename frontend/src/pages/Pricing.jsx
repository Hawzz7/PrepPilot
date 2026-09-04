import { motion } from "motion/react";
import { FaCheck, FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import PaymentModal from "../components/PaymentModal.jsx";
import {
  loadRazorpayScript,
  createPaymentOrder,
  verifyPayment,
} from "../services/paymentServices.js";
import { setUserData } from "../redux/userSlice";

const Pricing = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { userData } = useSelector((state) => state.user);

  // =========================================================
  // PAYMENT STATE
  // =========================================================

  const [processingPlan, setProcessingPlan] = useState(null);

  const [paymentResult, setPaymentResult] = useState(null);

  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // =========================================================
  // PLANS
  // =========================================================

  const plans = [
    {
      name: "Free",
      price: "₹0",
      credits: "100 Credits",
      description: "Perfect for beginners starting interview preparation.",
      badge: "Default",
      features: [
        "100 AI Interview Credits",
        "Basic Performance Report",
        "Voice Interview Access",
        "Limited History Tracking",
      ],
      buttonText: "Current Plan",
      disabled: true,
    },

    {
      name: "Starter Pack",
      price: "₹100",
      credits: "150 Credits",
      description: "Great for focused practice and skill improvement.",
      features: [
        "150 AI Interview Credits",
        "Detailed Feedback",
        "Performance Analytics",
        "Full Interview History",
      ],
      buttonText: "Select Plan",
      planId: "starter",
    },

    {
      name: "Pro Pack",
      price: "₹500",
      credits: "650 Credits",
      description: "Best value for serious job preparation.",
      badge: "Best Value",
      features: [
        "650 AI Interview Credits",
        "Advanced AI Feedback",
        "Skill Trend Analysis",
        "Priority AI Processing",
      ],
      buttonText: "Proceed to Pay",
      highlighted: true,
      planId: "pro",
    },
  ];

  // =========================================================
  // HANDLE PAYMENT MODAL CLOSE
  // =========================================================

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setPaymentResult(null);
  };

  // =========================================================
  // HANDLE PAYMENT
  // =========================================================

  const handlePayment = async (planId) => {
    if (processingPlan) return;

    try {
      setProcessingPlan(planId);

      console.log("========== STARTING PAYMENT ==========");
      console.log("Plan:", planId);

      // =====================================================
      // LOAD RAZORPAY
      // =====================================================

      const razorpayLoaded = await loadRazorpayScript();

      if (!razorpayLoaded) {
        throw new Error(
          "Razorpay Checkout failed to load. Please check your internet connection and try again.",
        );
      }

      // =====================================================
      // CREATE ORDER
      // =====================================================

      console.log("Creating Razorpay order...");

      const orderData = await createPaymentOrder(planId);

      console.log("Razorpay order response:", orderData);

      // =====================================================
      // RAZORPAY CHECKOUT OPTIONS
      // =====================================================

      const options = {
        key: orderData.keyId,

        amount: orderData.order.amount,

        currency: orderData.order.currency,

        name: "Prep Pilot",

        description: `${orderData.plan.name} - ${orderData.plan.credits}`,

        order_id: orderData.order.id,

        theme: {
          color: "#2563EB",
        },

        modal: {
          confirm_close: true,
          escape: true,
          backdropclose: false,
          animation: true,

          ondismiss: () => {
            console.log("Razorpay Checkout closed.");

            setProcessingPlan(null);
          },
        },

        // ===================================================
        // PAYMENT SUCCESS
        // ===================================================

        handler: async (response) => {
          try {
            console.log("========== RAZORPAY PAYMENT SUCCESS ==========");

            console.log("Razorpay Response:", response);

            // ===============================================
            // VERIFY PAYMENT
            // ===============================================

            console.log("Verifying payment on backend...");

            const verificationData = await verifyPayment(response);

            console.log("Payment verification response:", verificationData);

            // ===============================================
            // PAYMENT VERIFIED
            // ===============================================

            console.log("========== PAYMENT VERIFIED ==========");

            console.log("Credits Added:", verificationData.creditsAdded);

            console.log("Total Credits:", verificationData.credits);

            // ===============================================
            // UPDATE REDUX USER DATA
            // ===============================================

            if (userData) {
              dispatch(
                setUserData({
                  ...userData,
                  credits: verificationData.credits,
                }),
              );
            }

            // ===============================================
            // SHOW SUCCESS MODAL
            // ===============================================

            setPaymentResult({
              type: "success",

              creditsAdded: verificationData.creditsAdded,

              totalCredits: verificationData.credits,
            });

            setShowPaymentModal(true);
          } catch (error) {
            console.error(
              "Payment verification failed:",
              error.response?.data || error.message,
            );

            setPaymentResult({
              type: "failed",

              message:
                error.response?.data?.message ||
                error.message ||
                "Payment verification failed. Please contact support.",
            });

            setShowPaymentModal(true);
          } finally {
            setProcessingPlan(null);
          }
        },
      };

      // =====================================================
      // CREATE RAZORPAY INSTANCE
      // =====================================================

      console.log("Opening Razorpay Checkout...");

      const razorpay = new window.Razorpay(options);

      // =====================================================
      // PAYMENT FAILED
      // =====================================================

      razorpay.on("payment.failed", (response) => {
        console.error("========== RAZORPAY PAYMENT FAILED ==========");

        console.error(response);

        setPaymentResult({
          type: "failed",

          message:
            response.error?.description || "Payment failed. Please try again.",
        });

        setShowPaymentModal(true);

        setProcessingPlan(null);
      });

      // =====================================================
      // OPEN RAZORPAY
      // =====================================================

      razorpay.open();

      /*
       * Don't reset processingPlan here.
       *
       * Razorpay Checkout is still open.
       *
       * processingPlan will be reset when:
       *
       * 1. Payment succeeds
       * 2. Verification finishes
       * 3. Payment fails
       * 4. User closes Checkout
       */
    } catch (error) {
      console.error("Payment Error:", error.response?.data || error.message);

      setPaymentResult({
        type: "failed",

        message:
          error.response?.data?.message ||
          error.message ||
          "Unable to start payment.",
      });

      setShowPaymentModal(true);

      setProcessingPlan(null);
    }
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-indigo-100 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        {/* =============================================== */}
        {/* HEADER */}
        {/* =============================================== */}

        <div className="relative mb-12 text-center">
          {/* BACK BUTTON */}

          <motion.button
            type="button"
            onClick={() => navigate("/")}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:text-blue-600"
            title="Back to Home"
          >
            <FaArrowLeft size={15} />
          </motion.button>

          {/* HEADING */}

          <motion.h1
            initial={{
              opacity: 0,
              y: -20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.5,
            }}
            className="text-3xl font-bold text-gray-800 sm:text-4xl"
          >
            Choose Your Plan
          </motion.h1>

          <motion.p
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.5,
              delay: 0.1,
            }}
            className="mt-3 text-sm text-gray-500 sm:text-base"
          >
            Flexible pricing to match your interview preparation goals.
          </motion.p>
        </div>

        {/* =============================================== */}
        {/* PRICING CARDS */}
        {/* =============================================== */}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{
                opacity: 0,
                y: 40,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.5,
                delay: index * 0.15,
              }}
              whileHover={{
                y: -6,
              }}
              className={`relative flex min-h-[430px] flex-col rounded-3xl border bg-white p-6 shadow-sm transition sm:p-7 ${
                plan.highlighted
                  ? "border-blue-400 shadow-lg shadow-blue-100"
                  : "border-gray-200"
              }`}
            >
              {/* ========================================= */}
              {/* BADGE */}
              {/* ========================================= */}

              {plan.badge && (
                <div
                  className={`absolute right-5 top-5 rounded-full px-3 py-1 text-xs font-semibold ${
                    plan.highlighted
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {plan.badge}
                </div>
              )}

              {/* PLAN NAME */}

              <h2 className="text-lg font-semibold text-gray-800">
                {plan.name}
              </h2>

              {/* PRICE */}

              <div className="mt-4">
                <span className="text-3xl font-bold text-blue-600">
                  {plan.price}
                </span>
              </div>

              {/* CREDITS */}

              <p className="mt-1 text-sm text-gray-500">{plan.credits}</p>

              {/* DESCRIPTION */}

              <p className="mt-5 min-h-[48px] text-sm leading-6 text-gray-500">
                {plan.description}
              </p>

              {/* FEATURES */}

              <div className="mt-6 flex-1 space-y-4">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white">
                      <FaCheck size={9} />
                    </span>

                    <span className="text-sm text-gray-600">{feature}</span>
                  </div>
                ))}
              </div>

              {/* BUTTON */}

              <motion.button
                type="button"
                disabled={plan.disabled || processingPlan !== null}
                onClick={() => {
                  if (plan.planId) {
                    handlePayment(plan.planId);
                  }
                }}
                whileHover={
                  !plan.disabled
                    ? {
                        scale: 1.02,
                      }
                    : {}
                }
                whileTap={
                  !plan.disabled
                    ? {
                        scale: 0.97,
                      }
                    : {}
                }
                className={`mt-7 w-full rounded-xl py-3 font-semibold transition ${
                  plan.highlighted
                    ? "bg-linear-to-r from-blue-600 to-indigo-500 text-white shadow-md hover:from-blue-700 hover:to-indigo-600"
                    : plan.disabled
                      ? "cursor-not-allowed bg-gray-100 text-gray-500"
                      : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                }`}
              >
                {processingPlan === plan.planId
                  ? "Processing..."
                  : plan.buttonText}
              </motion.button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* =============================================== */}
      {/* PAYMENT MODAL */}
      {/* =============================================== */}

      <PaymentModal
        isOpen={showPaymentModal}
        result={paymentResult}
        onClose={handleClosePaymentModal}
      />
    </div>
  );
};

export default Pricing;
