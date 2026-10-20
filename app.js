const svg=document.querySelector('#art');
const NS='http://www.w3.org/2000/svg';
const colors=['#bb4e60','#d98492','#e9ded1','#7c283b','#a39ba8','#d2afa8'];
let shapes=[],step=0;
function path(kind,r){const points=[];for(let i=0;i<144;i++){const a=i/144*Math.PI*2;let radius=r;switch(kind){case 0:radius=r*(.84+.16*Math.cos(5*a));break;case 1:radius=r*(.82+.18*Math.cos(3*a));break;case 2:radius=r*(.72+.28*Math.cos(4*a));break;case 3:radius=r*(.9+.09*Math.sin(2*a)+.05*Math.cos(3*a));break;case 4:radius=r*(.86+.14*Math.cos(8*a));break;}points.push(`${i?'L':'M'}${(Math.cos(a)*radius).toFixed(2)},${(Math.sin(a)*radius).toFixed(2)}`)}return points.join(' ')+' Z'}
function add(x,y,r,kind,color){const g=document.createElementNS(NS,'g'),p=document.createElementNS(NS,'path');g.classList.add('shape');p.setAttribute('fill',color);g.append(p);svg.append(g);const s={g,p,x,y,r:r*(svg.getBoundingClientRect().width<600?.62:1),kind,rotation:0};shapes.push(s);draw(s);if(shapes.length>36){shapes.shift().g.remove()}document.querySelector('#count').textContent=String(shapes.length).padStart(2,'0')+' SHAPES / ENDLESS POSSIBILITIES'}
function draw(s){const bounds=svg.getBoundingClientRect();const correction=bounds.width&&bounds.height?(bounds.height/460)/(bounds.width/1200):1;s.g.style.transform=`translate(${s.x}px,${s.y}px) scale(${correction},1) rotate(${s.rotation}deg)`;s.p.setAttribute('d',path(s.kind,s.r))}
function seed(){svg.replaceChildren();shapes=[];step=0;[[160,200,77,0],[355,292,65,3],[530,160,82,2],[737,290,76,1],[930,170,81,4],[1080,305,43,0]].forEach((a,i)=>add(...a,colors[i]))}
function interact(x,y){step++;shapes.forEach((s,i)=>{s.rotation+=45+Math.random()*100;s.kind=(s.kind+1)%5;s.p.setAttribute('fill',colors[(i+step)%colors.length]);draw(s)});add(x,y,35+Math.random()*35,Math.floor(Math.random()*5),colors[step%colors.length])}
svg.addEventListener('click',e=>{const b=svg.getBoundingClientRect();interact((e.clientX-b.left)/b.width*1200,(e.clientY-b.top)/b.height*460)});
svg.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();interact(150+Math.random()*900,110+Math.random()*230)}});
document.querySelector('#reset').addEventListener('click',seed);seed();
const dialog=document.querySelector('#about');document.querySelector('#aboutOpen').onclick=()=>dialog.showModal();dialog.querySelector('.close').onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog){const b=dialog.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)dialog.close()}});
document.querySelectorAll('.socials button').forEach(b=>b.onclick=()=>{const old=b.textContent;b.textContent='…';b.title='Send your profile URL to connect this link';setTimeout(()=>b.textContent=old,1200)});

const dotField=document.querySelector('.dot-field');
for(let i=0;i<80;i++){const dot=document.createElement('i');dot.style.cssText=`left:${(i*37.17)%100}%;top:${(i*23.71)%100}%;--delay:${-(i%17)}s;--duration:${7+i%7}s;--drift:${i%2?12:-12}px`;dotField.append(dot);}

// Hold a circle for two seconds, then unfurl the threads into a four-point sparkle.
const emblem=document.querySelector('#emblem-threads');
const threads=Array.from({length:22},()=>{const p=document.createElementNS(NS,'path');emblem.append(p);return p});
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
function renderEmblem(t){threads.forEach((p,j)=>{const scale=.64+j*.016;let d='';for(let i=0;i<=160;i++){const a=i/160*Math.PI*2;const circleX=Math.cos(a)*105,circleY=Math.sin(a)*105;const sparkleX=145*Math.pow(Math.cos(a),3),sparkleY=145*Math.pow(Math.sin(a),3);const twist=t*(1-t)*(j-10)*.025;const x=(circleX*(1-t)+sparkleX*t)*scale,y=(circleY*(1-t)+sparkleY*t)*scale;d+=(i?'L':'M')+(150+x*Math.cos(twist)-y*Math.sin(twist)).toFixed(2)+','+(175+x*Math.sin(twist)+y*Math.cos(twist)).toFixed(2)}p.setAttribute('d',d+'Z')})}
let emblemStart;function animateEmblem(now){emblemStart??=now;const phase=(now-emblemStart)%8000;let t=phase<2000?0:phase<4000?(phase-2000)/2000:phase<6000?1:1-(phase-6000)/2000;t=t*t*(3-2*t);renderEmblem(t);if(!reduced.matches)requestAnimationFrame(animateEmblem)}renderEmblem(0);if(!reduced.matches)requestAnimationFrame(animateEmblem);

new ResizeObserver(()=>shapes.forEach(draw)).observe(svg);
