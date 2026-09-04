const LockedFeature = ({
  title,
  description,
  requiredPlan = "Starter",
}) => {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
        <span className="text-xl">🔒</span>
      </div>

      <h3 className="text-lg font-semibold text-gray-800">
        {title}
      </h3>

      <p className="mt-2 text-sm text-gray-500">
        {description}
      </p>

      <button
        type="button"
        className="mt-4 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        onClick={() => {
          window.location.href = "/pricing";
        }}
      >
        Upgrade to {requiredPlan}
      </button>
    </div>
  );
};

export default LockedFeature;