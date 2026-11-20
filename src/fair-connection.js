'use strict';
const validRoom=id=>/^[1-9]\d{8,24}$/.test(String(id||''));
async function resolveRoom({username,fetchApi,fetchSaved}){
 const savedPending=Promise.resolve().then(()=>fetchSaved?.(username)).catch(()=>null);let data=null;try{data=(await fetchApi(username))?.data}catch{}
 const room=String(data?.user?.roomId||'');
 // The LIVE API is fresher than the last room embedded in the profile HTML.
 if(validRoom(room)&&data?.liveRoom?.status!==4)return{roomId:room,source:'api'};
 const savedRoom=String(await savedPending||'');
 if(validRoom(savedRoom)&&savedRoom!==room)return{roomId:savedRoom,source:'saved-session'};
 if(validRoom(room)&&data?.liveRoom?.status===4){const e=new Error('The requested user is not live (official room status 4)');e.name='UserOfflineError';throw e;}
 return{roomId:validRoom(savedRoom)?savedRoom:null,source:validRoom(savedRoom)?'saved-session':'connector'};
}
function keepWatching({theme,wanted,autoConnect,current=true}){return theme==='templefair'&&current&&wanted&&autoConnect;}
function retryMs(theme){return theme==='templefair'?10000:20000;}
module.exports={resolveRoom,keepWatching,retryMs};
