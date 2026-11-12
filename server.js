const http=require('http'),fs=require('fs'),path=require('path');
const KEY=process.env.ANTHROPIC_API_KEY, PORT=process.env.PORT||3000;
const QS=['What does this clue tell us?','Which clues contradict each other?','Was she killed in this field?','What should we check next?'];
const CLUES={1:'Cigarette: half-smoked, dry and clean, about 8 ft from the body, so likely dropped after the rain ended at 2:30 AM. Sent to lab.',2:'Broken heart pendant under the grass with a tiny engraved number 4471, not yet checked against old cases.',3:'Mens formal shoe print in mud near the body, plus a second different partial print under flattened grass.',4:'Only a small patch of blood on the grass.',5:'Tyre marks with crisp edges, not washed away by rain.'};
const SYSTEM=`You are a detective assistant in a fictional cold-case training app. Answer using ONLY this case file. Never invent evidence. Offer suggestions, not final conclusions; the officer decides.
CASE FILE (fictional): Woman found dead in a field at dawn (found about 6:10 AM). Wristwatch stopped at 11:47 PM. Heavy rain fell 1:00 AM to 2:30 AM. Autopsy: body temperature suggests death around 3:00 AM. Deep neck wound, but only a small patch of blood on the grass. Tyre marks have crisp edges, not washed by rain. Mens formal shoe prints near the body and a second different partial print under flattened grass. Half-smoked cigarette 8 ft away, dry and clean. Broken pendant with engraved number 4471, linked to a missing-person file from three years ago. Likely a staged scene.
Reply in plain simple English, under 70 words, no markdown.`;
const hits=new Map();let day={d:new Date().getDate(),n:0};
function limited(ip){const now=Date.now(),h=hits.get(ip)||{n:0,t:now};if(now-h.t>600000){h.n=0;h.t=now}h.n++;hits.set(ip,h);
 if(day.d!==new Date().getDate())day={d:new Date().getDate(),n:0};day.n++;return h.n>20||day.n>500}
http.createServer((req,res)=>{
 if(req.method==='POST'&&req.url==='/api/ask'){let b='';req.on('data',c=>{b+=c;if(b.length>2000)req.destroy()});
  req.on('end',async()=>{try{
   const ip=req.headers['x-forwarded-for']||req.socket.remoteAddress;if(limited(ip)){res.writeHead(429);return res.end('{}')}
   const j=JSON.parse(b),q=QS[j.q];if(!q||!KEY){res.writeHead(400);return res.end('{}')}
   const clue=CLUES[j.clue]?'Clue being inspected: '+CLUES[j.clue]+'\n':'';
   const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'x-api-key':KEY,'anthropic-version':'2023-06-01','content-type':'application/json'},
    body:JSON.stringify({model:'claude-haiku-5-5',max_tokens:300,system:SYSTEM,messages:[{role:'user',content:clue+"Officer's question: "+q}]})});
   const d=await r.json();const a=d.content&&d.content[0]&&d.content[0].text;if(!a){res.writeHead(502);return res.end('{}')}
   res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({answer:a}))
  }catch(e){res.writeHead(500);res.end('{}')}});return}
 fs.readFile(path.join(__dirname,'index.html'),(e,d)=>{if(e){res.writeHead(500);return res.end('Error')}res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(d)});
}).listen(PORT,()=>console.log('CrimeLens XR on '+PORT));
