export const SUBSCRIPTION_PLANS = {
  free: {
    name: "Free Plan",
    amount: 0,
    postingLimit: 1,
  },
  bronze: {
    name: "Bronze Plan",
    amount: 100,
    postingLimit: 3,
  },
  silver: {
    name: "Silver Plan",
    amount: 300,
    postingLimit: 5,
  },
  gold: {
    name: "Gold Plan",
    amount: 1000,
    postingLimit: Infinity,
  },
};

export const PAID_PLAN_KEYS = Object.keys(SUBSCRIPTION_PLANS).filter(
  (key) => key !== "free",
);