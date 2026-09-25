import LoginChallenge from "../models/LoginChallenge.model.js";

export const startLoginChallengeCleanupJob = () => {
  const cleanup = async () => {
    try {
      await LoginChallenge.deleteMany({ expiresAt: { $lte: new Date() } });
    } catch (error) {
      console.error("Login challenge cleanup error:", error.message);
    }
  };

  cleanup();
  setInterval(cleanup, 60 * 1000);
  console.log("🔐 Login challenge cleanup job started");
};