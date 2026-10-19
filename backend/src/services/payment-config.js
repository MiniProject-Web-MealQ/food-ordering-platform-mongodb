// Payment behavior is independent of NODE_ENV: the deployed demo must remain a demo.
function demoPaymentsEnabled() {
  return (process.env.PAYMENT_MODE || "demo") === "demo";
}

function paymentCapabilities() {
  const demo = demoPaymentsEnabled();
  return {
    paymentMode: demo ? "sandbox" : "wallet",
    paymentMethods: demo ? ["wallet", "promptpay"] : ["wallet"],
    sandboxTopup: demo,
  };
}

module.exports = { demoPaymentsEnabled, paymentCapabilities };
