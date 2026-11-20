(function(global){
 'use strict';
 const altar={x:.17,y:.265};
 const slots={prayer:[[.28,.38],[.40,.39],[.28,.44],[.40,.45]],dance:[[.425,.522],[.575,.522],[.425,.548],[.575,.548]]};
 function facingAltar(position){return position.x>=altar.x?'back-left':'back-right';}
 function placement(zone,index){const points=slots[zone];return points?{x:points[index%points.length][0],y:points[index%points.length][1]}:null;}
 function onStage(position){const dx=(position.x-.50)/.20,dy=(position.y-.53)/.036;return dx*dx+dy*dy<=1;}
 const api={altar,slots,facingAltar,placement,onStage};global.FairSceneUsage=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
