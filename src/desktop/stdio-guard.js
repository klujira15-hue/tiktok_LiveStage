'use strict';
const fs=require('fs');
module.exports=function install({stdout=process.stdout,stderr=process.stderr,logFile}={}){for(const stream of [stdout,stderr]){if(!stream||stream.__liveStagePipeGuard)continue;stream.__liveStagePipeGuard=true;stream.on('error',error=>{if(error.code!=='EPIPE')throw error;if(logFile){try{fs.appendFileSync(logFile,new Date().toISOString()+' Output pipe closed; application continued.\n');}catch{}}});}};
