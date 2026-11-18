'use strict';
module.exports=function streakDelta(map,key,repeat,ended,now=Date.now()){
 const previous=map.get(key);const valid=previous&&now-previous.at<120000;const startsAgain=valid&&previous.ended&&!ended&&repeat<=1;const done=valid&&!startsAgain?previous.count:0;
 map.set(key,{count:Math.max(done,repeat),ended:!!ended,at:now});
 if(map.size>1000)for(const[k,v]of map){if(now-v.at>=120000||map.size>1000)map.delete(k);if(map.size<=1000)break;}
 return Math.max(0,repeat-done);
};
