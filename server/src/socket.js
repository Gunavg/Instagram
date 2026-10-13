import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import Conversation from "./models/Conversation.model.js";
import Message from "./models/message.model.js";
import User from "./models/User.model.js";
import Story from "./models/Story.model.js";

let io;
export const initSocket=(server)=>{
 const allowedOrigins=[process.env.CLIENT_URL,"http://localhost:3000"].filter(Boolean);
 io=new Server(server,{cors:{origin:allowedOrigins,credentials:true}});
 io.use(async(socket,next)=>{
  try{
   const header=socket.handshake.auth?.token||socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i,"");
   if(!header)return next(new Error("Authentication required"));
   const decoded=jwt.verify(header,process.env.JWT_SECRET);
   const user=await User.findById(decoded.id).select("_id role status").lean();
   if(!user||user.status!=="active")return next(new Error("Invalid or inactive session"));
   socket.data.userId=user._id.toString();socket.data.role=user.role;
   next();
  }catch(e){next(new Error("Socket authentication failed"));}
 });
 io.on("connection",(socket)=>{
  console.log("Connected:",socket.id);
  socket.on("setup",(userId)=>{if(userId&&String(userId)===socket.data.userId)socket.join(socket.data.userId);});
  socket.on("join-story-analytics",async(storyId)=>{
   try{const story=await Story.findOne({_id:storyId,user:socket.data.userId,status:{$in:["active","archived"]}}).select("_id").lean();if(story)socket.join("story-analytics:"+storyId);else socket.emit("story-analytics-error",{message:"Only the story owner may subscribe to its analytics."});}catch(e){socket.emit("story-analytics-error",{message:"Unable to subscribe to story analytics."});}
  });
  socket.on("leave-story-analytics",(storyId)=>{if(storyId)socket.leave("story-analytics:"+storyId);});
  socket.on("join-conversation",(conversationId)=>{if(conversationId)socket.join(conversationId);});
  socket.on("leave-conversation",(conversationId)=>{if(conversationId)socket.leave(conversationId);});
  socket.on("send-message",async(data)=>{
   try{
    const {conversationId,text,media}=data||{};
    const ConversationModel=(await import("./models/Conversation.model.js")).default;
    const conversation=await ConversationModel.findById(conversationId).select("participants users members");
    if(!conversation)return;
    const memberIds=[...(conversation.participants||[]),...(conversation.users||[]),...(conversation.members||[])].map(x=>String(x?._id||x));
    if(!memberIds.includes(socket.data.userId))return;
    const message=await Message.create({conversation:conversationId,sender:socket.data.userId,text,media});
    await ConversationModel.findByIdAndUpdate(conversationId,{lastMessage:message._id,lastMessageAt:new Date()});
    const populated=await Message.findById(message._id).populate("sender","username fullName profilePicture");
    io.to(String(conversationId)).emit("receive-message",populated);
   }catch(error){console.error("Socket message error:",error.message);}
  });
  socket.on("typing",async({conversationId})=>{if(conversationId)socket.to(String(conversationId)).emit("typing",socket.data.userId);});
  socket.on("stop-typing",async({conversationId})=>{if(conversationId)socket.to(String(conversationId)).emit("stop-typing",socket.data.userId);});
  socket.on("disconnect",()=>console.log("Disconnected:",socket.id));
 });
};
export {io};
