"use client";
import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type CSSProperties,
} from "react";

/* ================= LEVEL WORDS ================= */
const LEVEL_WORDS = [
  "BTC","ETH","NFT","BASE","DEFI",
  "LEDGER","WALLET","OPENXAI","CONTRACT","BLOCKCHAIN"
];

const CELL = 20;
const GRID = 18;

type Screen = "intro" | "game" | "over";
type GameOverReason = "bomb" | "time" | "wall" | "win";

/* ================= BASE TIME ================= */
function getLevelTime(level:number){
  return Math.max(10,26-(level*2));
  // 1→24s | 2→22s | 3→20s | ... >=10s floor
}

/* ================= COMPONENT ================= */
export default function Page(){

/* === STATE === */
const [screen,setScreen]=useState<Screen>("intro");
const [level,setLevel]=useState(1);
const [word,setWord]=useState(LEVEL_WORDS[0]);
const [progress,setProgress]=useState("");
const [countdown,setCountdown]=useState<number|null>(null);
const [timeLeft,setTimeLeft]=useState(getLevelTime(1));
const [gameOverReason,setGameOverReason]=useState<GameOverReason|null>(null);

/* === REFS === */
const canvasRef=useRef<HTMLCanvasElement|null>(null);
const snakeRef=useRef([{x:200,y:200}]);
const lettersRef=useRef<{x:number,y:number,l:string}[]>([]);
const bombsRef=useRef<{x:number,y:number}[]>([]);
const vxRef=useRef(CELL);
const vyRef=useRef(0);

const bombMode = level>=4;

/* ================= RANDOM ================= */
function randomCell(){
  for(let i=0;i<200;i++){
    let x=Math.floor(Math.random()*GRID)*CELL;
    let y=Math.floor(Math.random()*GRID)*CELL;
    if(
      !snakeRef.current.some(p=>p.x===x&&p.y===y) &&
      !lettersRef.current.some(p=>p.x===x&&p.y===y) &&
      !bombsRef.current.some(p=>p.x===x&&p.y===y)
    ) return {x,y};
  }
  return {x:0,y:0};
}

function out(p:{x:number,y:number}){
  return p.x<0||p.y<0||p.x>=GRID*CELL||p.y>=GRID*CELL;
}

/* ================= LETTER/BOMB SPAWN ================= */
const spawnLetter=useCallback((prog:string=progress,w:string=word)=>{
  lettersRef.current=[];
  let i=prog.length, ch=w[i];
  if(!ch) return;
  let c=randomCell();
  lettersRef.current.push({x:c.x,y:c.y,l:ch});
},[progress,word]);

const spawnBomb=()=>bombsRef.current.push(randomCell());

/* ================= GAME OVER ================= */
const gameOver=(r:GameOverReason)=>{
  setGameOverReason(r);
  setScreen("over");
};

/* ================= LEVEL START ================= */
const startLevel=(lv:number)=>{
  lv=Math.min(lv,LEVEL_WORDS.length);
  setLevel(lv);
  setWord(LEVEL_WORDS[lv-1]);
  setProgress("");
  setTimeLeft(getLevelTime(lv));
  setGameOverReason(null);

  snakeRef.current=[{x:200,y:200}];
  vxRef.current=CELL; vyRef.current=0;
  lettersRef.current=[]; bombsRef.current=[];

  setCountdown(3);
  let v=3;
  let t=setInterval(()=>{
    v--; setCountdown(v);
    if(v===0){clearInterval(t); setTimeout(()=>setCountdown(null),300);}
  },1000);
};

const nextLevel=()=> level+1>LEVEL_WORDS.length? gameOver("win") : startLevel(level+1);

/* ================= ROTATION (MOBILE CONTROL) ================= */
function turnLeft(){
  let vx=vxRef.current,vy=vyRef.current;
  if(vx=== CELL&&vy=== 0){vxRef.current=0;vyRef.current=-CELL;} //R→Up
  else if(vx===-CELL&&vy=== 0){vxRef.current=0;vyRef.current= CELL;} //L→Down
  else if(vx=== 0&&vy=== CELL){vxRef.current= CELL;vyRef.current=0;} //D→R
  else if(vx=== 0&&vy===-CELL){vxRef.current=-CELL;vyRef.current=0;} //U→L
}
function turnRight(){
  let vx=vxRef.current,vy=vyRef.current;
  if(vx=== CELL&&vy=== 0){vxRef.current=0;vyRef.current= CELL;} //R→D
  else if(vx===-CELL&&vy=== 0){vxRef.current=0;vyRef.current=-CELL;} //L→U
  else if(vx=== 0&&vy=== CELL){vxRef.current=-CELL;vyRef.current=0;} //D→L
  else if(vx=== 0&&vy===-CELL){vxRef.current= CELL;vyRef.current=0;} //U→R
}

/* ================= GAME TICK ================= */
const updateGame=useCallback(()=>{
  if(countdown!==null) return;

  let s=snakeRef.current;
  let head={x:s[0].x+vxRef.current,y:s[0].y+vyRef.current};

  if(out(head)) return gameOver("wall");
  s.unshift(head);

  if(bombsRef.current.some(b=>b.x===head.x&&b.y===head.y))
    return gameOver("bomb");

  let L=lettersRef.current[0];
  if(L&&L.x===head.x&&L.y===head.y){
    let need=word[progress.length];
    if(L.l===need){

      s.push({...s[s.length-1]}); //grow
      const np=progress+need;
      setProgress(np);

      /* ⭐ LEVEL 6+ BONUS TIME */
      if(level>=6) setTimeLeft(x=>x+1);

      if(np.length===word.length) return nextLevel();
      spawnLetter(np,word);
      if(bombMode) spawnBomb();
    }
  }
  s.pop();
},[countdown,progress,word,level,bombMode,nextLevel,spawnLetter]);

/* ================= DRAW ================= */
const draw=useCallback(()=>{
  const c=canvasRef.current;if(!c) return;
  const ctx=c.getContext("2d");if(!ctx) return;

  ctx.fillStyle="black";ctx.fillRect(0,0,360,360);

  if(countdown!==null){
    ctx.fillStyle="white";ctx.font="70px bold sans-serif";
    let t=countdown===0?"GO!":String(countdown);
    let w=ctx.measureText(t).width;
    ctx.fillText(t,(360-w)/2,200);return;
  }

  ctx.fillStyle="#00ff66";
  snakeRef.current.forEach(p=>ctx.fillRect(p.x,p.y,CELL,CELL));

  ctx.fillStyle="#ffe04b";ctx.font="20px bold monospace";
  lettersRef.current.forEach(l=>ctx.fillText(l.l,l.x+4,l.y+16));

  ctx.font="20px sans-serif";
  bombsRef.current.forEach(b=>ctx.fillText("💣",b.x+2,b.y+18));
},[countdown]);

/* ================= LOOP ================= */
useEffect(()=>{
  if(screen!=="game")return;
  const sp=Math.max(85,170-(level-1)*8);
  let t=setInterval(()=>{updateGame();draw();},sp);
  return()=>clearInterval(t);
},[screen,level,updateGame,draw]);

/* ================= TIMER ================= */
useEffect(()=>{
  if(screen!=="game"||countdown!==null||timeLeft<=0)return;
  let t=setInterval(()=>{
    setTimeLeft(x=>{
      if(x<=1){clearInterval(t);gameOver("time");return 0;}
      return x-1;
    });
  },1000);
  return()=>clearInterval(t);
},[screen,countdown,timeLeft]);

/* ================= FIRST LETTER ================= */
useEffect(()=> {
  if(screen==="game"&&countdown===null&&lettersRef.current.length===0)
    spawnLetter(progress,word);
},[screen,countdown,progress,word,spawnLetter]);

/* ================= KEYBOARD (NO SCROLL) ================= */
useEffect(()=>{
  document.body.style.overflow="hidden";
  const k=(e:KeyboardEvent)=>{
    if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key))
      e.preventDefault();

    if(e.key==="ArrowUp"   &&vyRef.current===0){vxRef.current=0;vyRef.current=-CELL;}
    if(e.key==="ArrowDown" &&vyRef.current===0){vxRef.current=0;vyRef.current= CELL;}
    if(e.key==="ArrowLeft" &&vxRef.current===0){vxRef.current=-CELL;vyRef.current=0;}
    if(e.key==="ArrowRight"&&vxRef.current===0){vxRef.current= CELL;vyRef.current=0;}
  };
  window.addEventListener("keydown",k,{passive:false});
  return()=>window.removeEventListener("keydown",k);
},[]);

/* ================= TOUCH CONTROL ================= */
useEffect(()=>{
  const T=(e:TouchEvent)=>{
    if(screen!=="game"||countdown!==null)return;
    e.preventDefault();
    const c=canvasRef.current;if(!c)return;
    const r=c.getBoundingClientRect(),X=e.touches[0].clientX;
    X<r.left+r.width/2 ? turnLeft() : turnRight();
  };
  document.addEventListener("touchstart",T,{passive:false});
  return()=>document.removeEventListener("touchstart",T);
},[screen,countdown]);

/* ================= SHARE ================= */
const share=`I reached LEVEL ${level} in Catch The Letter! Can you beat me?`;
const XURL=`https://twitter.com/intent/tweet?text=${encodeURIComponent(share)}`;
const FCURL=`https://warpcast.com/~/compose?text=${encodeURIComponent(share)}`;

/* ================= START ================= */
const start=()=>{startLevel(1);setScreen("game");};

/* ================= UI ================= */
return(
<div style={{background:"#000",minHeight:"100vh",color:"#fff",
display:"flex",alignItems:"center",justifyContent:"center"}}>

{screen==="intro"&&(
 <div style={{textAlign:"center",maxWidth:520,padding:20}}>
  <h1 style={{color:"#00ffb7",fontSize:32,textShadow:"0 0 15px #00ffbf"}}>
    Catch The Letter
  </h1>

  <p style={{fontSize:14,lineHeight:"20px",color:"#e5ffef",marginBottom:18}}>
    Collect letters in perfect order to grow.  
    Levels increase difficulty — bombs appear from Level 4.  
    Survive long enough and progress deeper into the chain.
  </p>

  <button style={btnPlay} onClick={start}>PLAY</button>

  <a href="https://warpcast.com/HeisenbergYoYo"
     style={{color:"#00ffe7",fontSize:13,marginTop:12,
     display:"block",textDecoration:"none"}}>
     Designed by <b>HeisenbergYoYo</b>
  </a>
 </div>
)}

{screen==="game"&&(
 <div style={{textAlign:"center"}}>
  <h2 style={{color:"#00ffa7",fontSize:20}}>Level {level} / {LEVEL_WORDS.length}</h2>
  <div style={{fontSize:13,marginBottom:6}}>
    Word:<b>{word}</b> · Progress:<b>{progress}</b> · Time:<b>{timeLeft}s</b>
  </div>
  <canvas ref={canvasRef} width={360} height={360}
    style={{border:"3px solid #00ff95",borderRadius:8,boxShadow:"0 0 10px #00ff9a"}}/>
 </div>
)}

{screen==="over"&&(
 <div style={{textAlign:"center",padding:20,maxWidth:420}}>
  <h1>{gameOverReason==="win"?"YOU WIN 🎉":"GAME OVER ☠️"}</h1>
  <p style={{fontSize:14,marginBottom:16}}>
    {gameOverReason==="bomb"&&"You hit a bomb."}
    {gameOverReason==="time"&&"Time expired."}
    {gameOverReason==="wall"&&"You crashed into a wall."}
    {gameOverReason==="win"&&"All levels completed."}
  </p>
  <p style={{fontSize:13,marginBottom:18}}>{share}</p>

  <div style={{display:"flex",gap:10,justifyContent:"center",marginBottom:18}}>
    <a href={XURL} target="_blank" style={btnShare}>Share on X</a>
    <a href={FCURL}target="_blank" style={btnShare}>Share on Farcaster</a>
  </div>

  <button style={{...btnPlay}} onClick={start}>Play Again</button>
  <button style={{...btnPlay,marginTop:10}}onClick={()=>setScreen("intro")}>
    Back to Intro
  </button>
 </div>
)}
</div>);
}

/* ================= STYLES ================= */
const btnPlay:CSSProperties={
background:"#003820",border:"2px solid #00ffbf",
borderRadius:10,padding:"10px 28px",fontSize:18,
color:"#00ffd2",fontWeight:"bold",
boxShadow:"0 0 12px #00ffa5 inset,0 0 9px #00ff9a",cursor:"pointer"
};

const btnShare:CSSProperties={
padding:"8px 14px",borderRadius:8,border:"1px solid #00ffbf",
fontSize:14,color:"#00ffd2",background:"#00241a",
textDecoration:"none",boxShadow:"0 0 8px #00ff9a"
};
