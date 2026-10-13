import ScheduledPost from "../models/ScheduledPost.model.js";
import ScheduledPostError from "../models/ScheduledPostError.model.js";
import { publishScheduledPost } from "../controllers/scheduledPost.controller.js";

// A conditional claim prevents two scheduler instances from publishing the same record.
const run = async () => {
  const due = await ScheduledPost.find({ status:"scheduled", scheduledAt: { $lte:new Date() } }).sort({scheduledAt:1}).limit(50).select("_id");
  for (const candidate of due) {
    const claimed = await ScheduledPost.findOneAndUpdate(
      { _id:candidate._id, status:"scheduled", scheduledAt:{$lte:new Date()} },
      { $set:{status:"publishing", lastError:""}, $inc:{attempts:1} },
      { new:true }
    );
    if (!claimed) continue;
    try {
      await publishScheduledPost(claimed);
    } catch (error) {
      const message = String(error?.message || "Scheduled publication failed").slice(0,2000);
      await ScheduledPostError.create({post:claimed._id,user:claimed.user,attempt:claimed.attempts,error:message,stack:String(error?.stack||"").slice(0,8000)});
      await ScheduledPost.updateOne(
        { _id:claimed._id, status:"publishing" },
        { $set:{lastError:message,status:claimed.attempts>=3?"failed":"scheduled"} }
      );
      console.error("Scheduled post publish failed:", message);
    }
  }
};
export const startScheduledPostJob = () => {
  let running=false;
  const tick=async()=>{if(running)return;running=true;try{await run();}catch(e){console.error("Scheduled post job:",e.message);}finally{running=false;}};
  void tick();setInterval(tick,60*1000);console.log("Scheduled post job started");
};
