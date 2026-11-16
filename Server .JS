const http=require('http'),fs=require('fs'),path=require('path');
const KEY=process.env.GEMINI_API_KEY, MODEL=process.env.GEMINI_MODEL||'gemini-2.5-flash-lite', PORT=process.env.PORT||3000;
if(!KEY)console.log('WARNING: GEMINI_API_KEY is missing, the AI will not answer');
const CLUES={
 0:'Give a short overview of the whole scene and one hint about where to look first.',
 1:'Clue 1, a half-smoked cigarette about 8 ft from where the body lay. It is dry and clean.',
 2:'Clue 2, a broken heart pendant lying under the grass. It carries a tiny engraved number that is hard to read by eye.',
 3:'Clue 3, a men\'s formal shoe print in the mud near the body. A second, different partial print lies under flattened grass.',
 4:'Clue 4, only a small patch of blood on the grass, although the victim had a deep neck wound.',
 5:'Clue 5, tyre marks with crisp edges that the rain did not wash away.'};
const SYSTEM=`You are a detective assistant in a fictional cold-case training app. Use ONLY this case file and never invent evidence. Give suggestions and hints, not final conclusions; the officer decides.
CASE FILE (fictional): A woman was found dead in a field at dawn. Heavy rain fell from 1:00 AM to 2:30 AM. She had a deep neck wound, but there is only a small patch of blood on the grass. Tyre marks have crisp edges and were not washed away by the rain. A men's formal shoe print is near the body, and a second, different partial print lies under flattened grass. A half-smoked cigarette 8 ft away is dry and clean. A broken pendant carries a tiny engraved number that is hard to read by eye. NEVER state the number. If it comes up, say the officer can read it with the Truth Lens, the magnifier icon in the app. The scene is probably staged.
When asked to analyze a clue: say what it suggests, then give one hint for the next step. Reply in plain simple English, under 60 words, no markdown.`;
const hits=new Map();let day={d:new Date().getDate(),n:0};
function limited(ip){const now=Date.now(),h=hits.get(ip)||{n:0,t:now};if(now-h.t>600000){h.n=0;h.t=now}h.n++;hits.set(ip,h);
 if(day.d!==new Date().getDate())day={d:new Date().getDate(),n:0};day.n++;return h.n>30||day.n>500}
http.createServer((req,res)=>{
 if(req.method==='POST'&&req.url==='/api/analyze'){let b='';req.on('data',c=>{b+=c;if(b.length>2000)req.destroy()});
  req.on('end',async()=>{try{
   const ip=req.headers['x-forwarded-for']||req.socket.remoteAddress;if(limited(ip)){res.writeHead(429);return res.end('{}')}
   const j=JSON.parse(b),t=CLUES[j.clue];if(!t||!KEY){res.writeHead(400);return res.end('{}')}
   const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+MODEL+':generateContent',{method:'POST',headers:{'x-goog-api-key':KEY,'content-type':'application/json'},
    body:JSON.stringify({systemInstruction:{parts:[{text:SYSTEM}]},contents:[{role:'user',parts:[{text:'Officer taps: '+t}]}],generationConfig:{maxOutputTokens:400}})});
   const d=await r.json();const p=d.candidates&&d.candidates[0]&&d.candidates[0].content&&d.candidates[0].content.parts;const a=p&&p.map(x=>x.text||'').join('').trim();
   if(!a){console.log('AI error',r.status,JSON.stringify(d).slice(0,300));res.writeHead(502);return res.end('{}')}
   res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({answer:a}))
  }catch(e){console.log('AI error',e.message);res.writeHead(500);res.end('{}')}});return}
 fs.readFile(path.join(__dirname,'index.html'),(e,d)=>{if(e){res.writeHead(500);return res.end('Error')}res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(d)});
}).listen(PORT,()=>console.log('CrimeLens XR on '+PORT));
