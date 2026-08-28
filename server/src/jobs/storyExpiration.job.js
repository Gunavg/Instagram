import Story from "../models/Story.model.js";

const expireStories = async () => {
  try {
    const now = new Date();

    const result =
      await Story.updateMany(
        {
          status: "active",
          expiresAt: {
            $lte: now,
          },
        },
        {
          $set: {
            status: "archived",
            archivedAt: now,
          },
        }
      );

    if (result.modifiedCount > 0) {
      console.log(
        `⏰ Archived ${result.modifiedCount} expired story/stories`
      );
    }
  } catch (error) {
    console.error(
      "Story expiration job error:",
      error.message
    );
  }
};

export const startStoryExpirationJob =
  () => {
    expireStories();

    setInterval(
      expireStories,
      60 * 1000
    );

    console.log(
      "⏰ Story expiration job started"
    );
  };