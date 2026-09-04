import axiosInstance from "./axiosInstance.js";

// =========================================================
// LOAD RAZORPAY CHECKOUT SCRIPT
// =========================================================

export const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    // Razorpay already loaded
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");

    script.src =
      "https://checkout.razorpay.com/v1/checkout.js";

    script.onload = () => {
      resolve(true);
    };

    script.onerror = () => {
      resolve(false);
    };

    document.body.appendChild(script);
  });
};

// =========================================================
// CREATE RAZORPAY ORDER
// =========================================================

export const createPaymentOrder = async (planId) => {
  const { data } = await axiosInstance.post(
    "/api/payment/create-order",
    {
      plan: planId,
    },
  );

  if (!data.success || !data.order?.id) {
    throw new Error(
      data.message ||
        "Failed to create Razorpay order.",
    );
  }

  return data;
};

// =========================================================
// VERIFY RAZORPAY PAYMENT
// =========================================================

export const verifyPayment = async (response) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  } = response;

  if (
    !razorpay_order_id ||
    !razorpay_payment_id ||
    !razorpay_signature
  ) {
    throw new Error(
      "Incomplete Razorpay payment response.",
    );
  }

  const { data } = await axiosInstance.post(
    "/api/payment/verify-payment",
    {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    },
  );

  if (!data.success) {
    throw new Error(
      data.message ||
        "Payment verification failed.",
    );
  }

  return data;
};