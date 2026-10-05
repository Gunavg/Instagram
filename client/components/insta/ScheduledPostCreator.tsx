"use client";

import { useRef, useState } from "react";
import { CalendarClock, ImagePlus, X } from "lucide-react";
import axiosInstance from "@/lib/axios";
import { uploadImage } from "@/lib/imgbb.service";
import { toast } from "@/components/ui/toast";

export default function ScheduledPostCreator({ onClose, onCreated }: { onClose:()=>void; onCreated:()=>void }) {
  const [file,setFile]=useState<File|null>(null); const [preview,setPreview]=useState(""); const [caption,setCaption]=useState(""); const [hashtags,setHashtags]=useState(""); const [taggedUsers,setTaggedUsers]=useState(""); const [location,setLocation]=useState(""); const [scheduledAt,setScheduledAt]=useState(""); const [visibility,setVisibility]=useState("public"); const [saving,setSaving]=useState(false); const input=useRef<HTMLInputElement>(null);
  const pick=(next:File)=>{if(!next.type.startsWith("image/")){toast.add({type:"error",title:"Please select an image"});return;}setFile(next);setPreview(URL.createObjectURL(next));};
  const submit=async()=>{if(!file)return toast.add({type:"error",title:"Select an image first"});if(!scheduledAt)return toast.add({type:"error",title:"Choose a future date and time"});setSaving(true);try{const media=await uploadImage(file);const r=await axiosInstance.post("/api/scheduled-posts",{media:[media],caption,hashtags:hashtags.split(/[ ,]+/).filter(Boolean),taggedUsernames:taggedUsers.split(/[ ,]+/).filter(Boolean),location,visibility,scheduledAt:new Date(scheduledAt).toISOString()});toast.add({type:"success",title:r.data.message||"Post scheduled successfully"});onCreated();onClose()}catch(e:any){toast.add({type:"error",title:e?.response?.data?.message||e?.message||"Unable to schedule post"})}finally{setSaving(false)}};
  const min=new Date(Date.now()+60*1000).toISOString().slice(0,16);
  return <div className="fixed inset-0 z-[160] bg-black/60 flex items-center justify-center p-4"><div className="bg-white rounded-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto"><div className="flex items-center justify-between border-b p-4"><div className="flex items-center gap-2 font-semibold"><CalendarClock size={18}/>Create Scheduled Post</div><button type="button" onClick={onClose}><X size={20}/></button></div><div className="p-5 space-y-4">
   <div onClick={()=>input.current?.click()} className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:bg-zinc-50">{preview?<img src={preview} alt="Preview" className="mx-auto max-h-56 rounded-lg object-contain"/>:<><ImagePlus className="mx-auto mb-2"/><p className="font-medium">Choose an image</p><p className="text-xs text-zinc-500">The post remains hidden until publication.</p></>}<input ref={input} type="file" accept="image/*" className="hidden" onChange={e=>e.target.files?.[0]&&pick(e.target.files[0])}/></div>
   <textarea value={caption} onChange={e=>setCaption(e.target.value)} rows={4} placeholder="Caption" className="w-full border rounded-lg p-3"/>
   <input value={hashtags} onChange={e=>setHashtags(e.target.value)} placeholder="#hashtags" className="w-full border rounded-lg p-3"/>
   <input value={taggedUsers} onChange={e=>setTaggedUsers(e.target.value)} placeholder="Tagged usernames (comma separated)" className="w-full border rounded-lg p-3"/>
   <input value={location} onChange={e=>setLocation(e.target.value)} placeholder="Location" className="w-full border rounded-lg p-3"/>
   <div className="grid grid-cols-2 gap-3"><input type="datetime-local" min={min} value={scheduledAt} onChange={e=>setScheduledAt(e.target.value)} className="border rounded-lg p-3"/><select value={visibility} onChange={e=>setVisibility(e.target.value)} className="border rounded-lg p-3"><option value="public">Public</option><option value="followers">Followers</option></select></div>
   <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg">Cancel</button><button type="button" disabled={saving} onClick={submit} className="px-5 py-2 bg-black text-white rounded-lg disabled:opacity-50">{saving?"Scheduling…":"Schedule Post"}</button></div>
  </div></div></div>;
}
