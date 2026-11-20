'use strict';
// Replace expensive gifts, eight paid activities; sangha is a chat command. Prices come from the supplied gift screenshots.
const gifts=[
 {name:'Rose',diamonds:1,effect:'g1',image:'/characters/fair-v1/gifts/rose.webp',aliases:['กุหลาบ']},
 {name:'แท่งเรืองแสง',diamonds:1,effect:'g2',image:'/characters/fair-v1/gifts/glow-stick.webp',aliases:['Glow Stick','Glow Sticks']},
 {name:'Finger Heart',diamonds:5,effect:'g3',image:'/characters/fair-v1/gifts/finger-heart.webp',aliases:['หัวใจนิ้ว']},
 {name:'GG',diamonds:1,effect:'g4',image:'/characters/fair-v1/gifts/gg.webp',aliases:[]},
 {name:'ชิ้นเค้ก',diamonds:1,effect:'g5',image:'/characters/fair-v1/gifts/cake-slice.webp',aliases:['Cake Slice','Birthday Cake']},
 {name:'Rosa',diamonds:10,effect:'g6',image:'/characters/fair-v1/gifts/rosa.webp',aliases:['โรซ่า']},
 {name:'ฉันรักคุณ',diamonds:10,effect:'g8',image:'/characters/fair-v1/gifts/i-love-you.webp',aliases:['I Love You']},
 {name:'ไดโนเสาร์จิ๋ว',diamonds:10,effect:'g9',image:'/characters/fair-v1/gifts/tiny-diny.webp',aliases:['Tiny Diny','Tiny Dino']}
];
function normalize(list){const input=Array.isArray(list)?list:[];return gifts.map(base=>{const old=input.find(g=>g?.effect===base.effect),price=Number(old?.diamonds);return old&&Number.isInteger(price)&&price===base.diamonds?{...structuredClone(base),...old,diamonds:price,aliases:old.aliases||((old.name===base.name)?base.aliases:[])}:structuredClone(base);});}
module.exports={gifts,normalize};
