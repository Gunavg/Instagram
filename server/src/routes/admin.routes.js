import express from "express";
import {requireAdmin} from "../middleware/admin.middleware.js";
import {dashboard,getUsers,updateUser,deleteUser,getPosts,updatePost,deletePost,getStories,deleteStory,getSubscriptions,updateSubscription,getScheduledPosts,getAuditLogs} from "../controllers/admin.controller.js";
const r=express.Router(); r.use(...requireAdmin);
r.get("/dashboard",dashboard); r.get("/users",getUsers); r.patch("/users/:id",updateUser); r.delete("/users/:id",deleteUser);
r.get("/posts",getPosts); r.patch("/posts/:id",updatePost); r.delete("/posts/:id",deletePost);
r.get("/stories",getStories); r.delete("/stories/:id",deleteStory);
r.get("/subscriptions",getSubscriptions); r.patch("/subscriptions/:id",updateSubscription);
r.get("/scheduled-posts",getScheduledPosts); r.get("/audit-logs",getAuditLogs); export default r;