import { Server } from "socket.io";
import Conversation from "./models/Conversation.model.js";
import Message from "./models/message.model.js";

let io;

export const initSocket = (server) => {
  const allowedOrigins = [
    process.env.CLIENT_URL,
    "http://localhost:3000",
  ].filter(Boolean);

  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("Connected:", socket.id);

    socket.on("setup", (userId) => {
      if (userId) socket.join(userId.toString());
    });

    socket.on("join-story-analytics", (storyId) => {
      if (storyId) socket.join(`story-analytics:${storyId}`);
    });

    socket.on("leave-story-analytics", (storyId) => {
      if (storyId) socket.leave(`story-analytics:${storyId}`);
    });

    socket.on("join-conversation", (conversationId) => {
      if (conversationId) socket.join(conversationId);
    });

    socket.on("leave-conversation", (conversationId) => {
      if (conversationId) socket.leave(conversationId);
    });

    socket.on("send-message", async (data) => {
      try {
        const { conversationId, senderId, text, media } = data;

        const message = await Message.create({
          conversation: conversationId,
          sender: senderId,
          text,
          media,
        });

        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: message._id,
          lastMessageAt: new Date(),
        });

        const populatedMessage = await Message.findById(message._id).populate(
          "sender",
          "username fullName profilePicture"
        );

        io.to(conversationId).emit("receive-message", populatedMessage);
      } catch (error) {
        console.error("Socket message error:", error.message);
      }
    });

    socket.on("typing", ({ conversationId, userId }) => {
      socket.to(conversationId).emit("typing", userId);
    });

    socket.on("stop-typing", ({ conversationId, userId }) => {
      socket.to(conversationId).emit("stop-typing", userId);
    });

    socket.on("disconnect", () => {
      console.log("Disconnected:", socket.id);
    });
  });
};

export { io };