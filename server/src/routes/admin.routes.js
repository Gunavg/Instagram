import express from "express";
import { requireAdmin } from "../middleware/admin.middleware.js";
import { dashboard,getUsers,createUser,updateUser,deleteUser,updatePost,deletePost,getStories,updateStory,deleteStory,getSubscriptions,updateSubscription,getScheduledPosts,getAuditLogs,getScheduledPostErrors } from "../controllers/admin.controller.js";
import { getPostsAdvanced,getComments,createAdminComment,updateComment,deleteComment,getReports,updateReport,deleteReport } from "../controllers/adminExtras.controller.js";

const r=express.Router();
r.use(...requireAdmin);
r.get("/dashboard",dashboard);
r.get("/users",getUsers);r.post("/users",createUser);r.patch("/users/:id",updateUser);r.delete("/users/:id",deleteUser);
r.get("/posts",getPostsAdvanced);r.patch("/posts/:id",updatePost);r.delete("/posts/:id",deletePost);
r.get("/stories",getStories);r.patch("/stories/:id",updateStory);r.delete("/stories/:id",deleteStory);
r.get("/subscriptions",getSubscriptions);r.patch("/subscriptions/:id",updateSubscription);
r.get("/scheduled-posts",getScheduledPosts);r.get("/scheduled-post-errors",getScheduledPostErrors);r.get("/audit-logs",getAuditLogs);
r.get("/comments",getComments);r.post("/comments",createAdminComment);r.patch("/comments/:id",updateComment);r.delete("/comments/:id",deleteComment);
r.get("/reports",getReports);r.patch("/reports/:id",updateReport);r.delete("/reports/:id",deleteReport);
export default r;
