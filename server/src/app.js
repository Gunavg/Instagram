import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import postRoutes from "./routes/post.routes.js";
import storyRoutes from "./routes/story.routes.js";
import followRoutes from "./routes/follow.routes.js";
import likesRoutes from "./routes/like.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import conversationRoutes from "./routes/conv.route.js";
import closeFriendRoutes from "./routes/closeFriend.routes.js";
import storyHighlightRoutes from "./routes/storyHighlight.routes.js";
import languageRoutes from "./routes/language.routes.js";

dotenv.config();
const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://instagram-clone-pink.vercel.app",
    ],
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/story-highlights", storyHighlightRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/language", languageRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/stories", storyRoutes);
app.use("/api/follow", followRoutes);
app.use("/api/likes", likesRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/conversation", conversationRoutes);
app.use("/api/close-friends", closeFriendRoutes);
app.get("/", (req, res) => {
  res.status(200).json({ success: true, message: "Instagram Clone API is running 🚀" });
});
export default app;
