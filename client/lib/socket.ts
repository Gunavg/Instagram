import { io } from "socket.io-client";
import useAuthStore from "@/store/authStore";

const SOCKET_URL=process.env.NEXT_PUBLIC_SOCKET_URL||"http://localhost:5000";

export const socket=io(SOCKET_URL,{
  autoConnect:false,
  withCredentials:true,
});

let configuredToken="";
export const connectAuthenticatedSocket=(token?:string)=>{
  if(!token){socket.disconnect();configuredToken="";return;}
  if(configuredToken!==token){socket.auth={token};configuredToken=token;}
  if(!socket.connected)socket.connect();
};
export const disconnectAuthenticatedSocket=()=>{
  configuredToken="";socket.disconnect();
};
