"use client";

import { useRef, useState } from "react";
import { CalendarClock, ImagePlus, X, Video } from "lucide-react";
import axiosInstance from "@/lib/axios";
import { toast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n";

type MediaItem = { url: string; publicId?: string; type: "image" | "video"; width?: number; height?: number; duration?: number };

export default function ScheduledPostCreator({ onClose, onCreated }: { onClose:()=>void; onCreated:()=>void }) {
  const [file,setFile]=useState<File|null>(null);
  const [preview,setPreview]=useState("");
  const [caption,setCaption]=useState("");
  const [hashtags,setHashtags]=useState("");
  const [taggedUsers,setTaggedUsers]=useState("");
  const [location,setLocation]=useState("");
  const [scheduledAt,setScheduledAt]=useState("");
  const [visibility,setVisibility]=useState("public");
  const [saving,setSaving]=useState(false);
  const input=useRef<HTMLInputElement>(null);

  const pick=(next:File)=>{
    const accepted=next.type.startsWith("image/")||next.type.startsWith("video/");
    if(!accepted){toast.add({type:"error",title:t("selectMediaFirst")});return;}
    if(next.size>50*1024*1024){toast.add({type:"error",title:t("mediaMaxSize")});return;}
    if(preview)URL.revokeObjectURL(preview);
    setFile(next);
    setPreview(URL.createObjectURL(next));
  };

  const submit=async()=>{
    if(!file)return toast.add({type:"error",title:t("selectMediaFirst")});
    if(!scheduledAt||new Date(scheduledAt).getTime()<=Date.now())return toast.add({type:"error",title:t("scheduleFutureRequired")});
    setSaving(true);
    try{
      const form=new FormData();
      form.append("media",file);
      const uploaded=await axiosInstance.post("/api/scheduled-posts/upload",form,{headers:{"Content-Type":"multipart/form-data"}});
      const media:MediaItem=uploaded.data.media;
      const r=await axiosInstance.post("/api/scheduled-posts",{
        media:[media],caption,
        hashtags:hashtags.split(/[ ,]+/).map(v=>v.replace(/^#/,"")).filter(Boolean),
        taggedUsernames:taggedUsers.split(/[ ,]+/).map(v=>v.replace(/^@/,"")).filter(Boolean),
        location,visibility,scheduledAt:new Date(scheduledAt).toISOString()
      });
      toast.add({type:"success",title:r.data.message||"Post scheduled successfully"});
      onCreated();onClose();
    }catch(e:any){toast.add({type:"error",title:e?.response?.data?.message||e?.message||"Unable to schedule post"});}
    finally{setSaving(false);}
  };

  const min=new Date(Date.now()+60*1000).toISOString().slice(0,16);
  return <div className="fixed inset-0 z-160 bg-black/60 flex items-center justify-center p-4"><div className="bg-white rounded-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto"><div className="flex items-center justify-between border-b p-4"><div className="flex items-center gap-2 font-semibold"><CalendarClock size={18}/>Create Scheduled Post</div><button type="button" onClick={onClose} aria-label="Close"><X size={20}/></button></div><div className="p-5 space-y-4">
   <button type="button" onClick={()=>input.current?.click()} className="w-full border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:bg-zinc-50">{preview?(file?.type.startsWith("video/")?<video src={preview} controls className="mx-auto max-h-56 rounded-lg"/>:<img src={preview} alt="Preview" className="mx-auto max-h-56 rounded-lg object-contain"/>):<>{/* media selector */}{<ImagePlus className="mx-auto mb-2"/>}<p className="font-medium">{t("chooseMedia")}</p><p className="text-xs text-zinc-500">{t("mediaMaxSize")} {t("mediaHiddenUntilPublish")}</p></>}<input ref={input} type="file" accept="image/*,video/mp4,video/webm,video/quicktime" className="hidden" onChange={e=>e.target.files?.[0]&&pick(e.target.files[0])}/></button>
   {file?.type.startsWith("video/")&&<p className="flex items-center gap-2 text-xs text-zinc-600"><Video size={14}/>{file.name}</p>}
   <textarea value={caption} onChange={e=>setCaption(e.target.value)} rows={4} maxLength={2200} placeholder={t("captionPlaceholder")} className="w-full border rounded-lg p-3"/>
   <input value={hashtags} onChange={e=>setHashtags(e.target.value)} placeholder="#hashtags (separated by spaces or commas)" className="w-full border rounded-lg p-3"/>
   <input value={taggedUsers} onChange={e=>setTaggedUsers(e.target.value)} placeholder={t("taggedUsersPlaceholder")} className="w-full border rounded-lg p-3"/>
   <input value={location} onChange={e=>setLocation(e.target.value)} placeholder={t("locationPlaceholder")} className="w-full border rounded-lg p-3"/>
   <div className="grid grid-cols-2 gap-3"><input type="datetime-local" min={min} value={scheduledAt} onChange={e=>setScheduledAt(e.target.value)} className="border rounded-lg p-3"/><select value={visibility} onChange={e=>setVisibility(e.target.value)} className="border rounded-lg p-3"><option value="public">{t("publicVisibility")}</option><option value="followers">{t("followersVisibility")}</option></select></div>
   <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg">{t("cancel")}</button><button type="button" disabled={saving} onClick={submit} className="px-5 py-2 bg-black text-white rounded-lg disabled:opacity-50">{saving?"Uploading and scheduling…":"Schedule Post"}</button></div>
  </div></div></div>;
}
