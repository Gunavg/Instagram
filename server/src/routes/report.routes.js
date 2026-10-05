import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { createReport, getMyReports } from "../controllers/report.controller.js";

const r = express.Router();
r.use(protect);
r.post("/", createReport);
r.get("/mine", getMyReports);
export default r;
