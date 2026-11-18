'use strict';
// Local services only. No provider credentials, entitlement requests or remote theme delivery.
const fs = require('fs');
const path = require('path');
module.exports = function createLocalServices() {
  const available = () => fs.readdirSync(path.join(__dirname, 'public', 'themes')).filter(f => /^[\w-]+\.js$/.test(f)).map(f => f.slice(0,-3));
  const features = () => ({custom:true,ai:false,widgets:true,youtube:true,shop:true,cloud:false,games:true});
  const state = () => ({mode:'local', signedIn:false, user:null, plan:'local', themes:null, localThemes:available(), watermark:false, offlineSince:0, offlineDays:0, error:'', busy:false, site:'', features:features(), promos:{}, locks:{}, comment:{}, skew:0});
  const unavailable = async () => ({ok:false,error:'บริการบัญชีภายนอกถูกถอดออกจากรุ่น Local'});
  return {desktop:false, state, allowedThemes:()=>null, isAllowed:id=>available().includes(id), signedIn:()=>false, features, base:'',
    startLogin:()=>null, handleCallback:unavailable, logout:async()=>state(), refresh:async()=>state(), setFreeTheme:unavailable,
    commentCode:unavailable,commentCheck:unavailable,themeCode:async()=>null,uploadReport:unavailable,getSettings:unavailable,putSettings:unavailable,aiReply:unavailable};
};
