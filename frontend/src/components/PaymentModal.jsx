import { AnimatePresence, motion } from "motion/react";

const PaymentModal = ({
  isOpen,
  result,
  onClose,
}) => {
  if (!result) return null;

  const isSuccess = result.type === "success";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.85,
              y: 30,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              scale: 0.85,
              y: 30,
            }}
            transition={{
              duration: 0.3,
              ease: "easeOut",
            }}
            className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            {/* ================================= */}
            {/* TOP SECTION */}
            {/* ================================= */}

            <div
              className={`relative px-6 pb-8 pt-8 text-center ${
                isSuccess
                  ? "bg-linear-to-br from-blue-600 to-indigo-600"
                  : "bg-linear-to-br from-red-500 to-rose-600"
              }`}
            >
              {/* CLOSE BUTTON */}

              <motion.button
                type="button"
                onClick={onClose}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
                aria-label="Close"
              >
                ✕
              </motion.button>

              {/* ICON */}

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  delay: 0.15,
                  duration: 0.4,
                  type: "spring",
                }}
                className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-lg"
              >
                <span
                  className={`text-4xl font-bold ${
                    isSuccess
                      ? "text-blue-600"
                      : "text-red-500"
                  }`}
                >
                  {isSuccess ? "✓" : "!"}
                </span>
              </motion.div>

              {/* TITLE */}

              <motion.h2
                initial={{
                  opacity: 0,
                  y: 10,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  delay: 0.25,
                }}
                className="mt-5 text-2xl font-bold text-white"
              >
                {isSuccess
                  ? "Payment Successful!"
                  : "Payment Failed"}
              </motion.h2>

              {/* DESCRIPTION */}

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{
                  delay: 0.35,
                }}
                className="mt-2 text-sm leading-6 text-white/80"
              >
                {isSuccess
                  ? "Your Prep Pilot credits have been added successfully."
                  : result.message ||
                    "We couldn't complete your payment."}
              </motion.p>
            </div>

            {/* ================================= */}
            {/* CONTENT */}
            {/* ================================= */}

            <div className="px-6 py-6">
              {isSuccess ? (
                <>
                  {/* CREDIT DETAILS */}

                  <div className="grid grid-cols-2 gap-4">
                    <motion.div
                      initial={{
                        opacity: 0,
                        x: -20,
                      }}
                      animate={{
                        opacity: 1,
                        x: 0,
                      }}
                      transition={{
                        delay: 0.2,
                      }}
                      className="rounded-2xl bg-blue-50 p-4 text-center"
                    >
                      <p className="text-xs font-medium text-gray-500">
                        Credits Added
                      </p>

                      <p className="mt-1 text-2xl font-bold text-blue-600">
                        +{result.creditsAdded}
                      </p>
                    </motion.div>

                    <motion.div
                      initial={{
                        opacity: 0,
                        x: 20,
                      }}
                      animate={{
                        opacity: 1,
                        x: 0,
                      }}
                      transition={{
                        delay: 0.2,
                      }}
                      className="rounded-2xl bg-indigo-50 p-4 text-center"
                    >
                      <p className="text-xs font-medium text-gray-500">
                        Total Credits
                      </p>

                      <p className="mt-1 text-2xl font-bold text-indigo-600">
                        {result.totalCredits}
                      </p>
                    </motion.div>
                  </div>

                  {/* SUCCESS MESSAGE */}

                  <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 text-center">
                    <p className="text-sm leading-6 text-gray-600">
                      You can now use your credits to
                      start AI-powered mock interviews.
                    </p>
                  </div>
                </>
              ) : (
                /* ================================= */
                /* FAILURE MESSAGE */
                /* ================================= */

                <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-center">
                  <p className="text-sm leading-6 text-gray-600">
                    Your payment could not be completed.
                    Please try again.
                  </p>
                </div>
              )}

              {/* ================================= */}
              {/* ACTION BUTTON */}
              {/* ================================= */}

              <motion.button
                type="button"
                onClick={onClose}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className={`mt-6 w-full rounded-xl py-3 font-semibold text-white shadow-md transition ${
                  isSuccess
                    ? "bg-linear-to-r from-blue-600 to-indigo-500 hover:from-blue-700 hover:to-indigo-600"
                    : "bg-red-500 hover:bg-red-600"
                }`}
              >
                {isSuccess
                  ? "Continue to Prep Pilot"
                  : "Close"}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PaymentModal;