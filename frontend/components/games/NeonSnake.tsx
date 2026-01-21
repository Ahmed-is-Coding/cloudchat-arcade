"use client";

import { useEffect, useRef, useState } from "react";

type LB = { user_id: number; username: string; best_score: number };

export function NeonSnake({ onScore, leaderboard }: { onScore: (score:number)=>void; leaderboard: LB[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const dir = useRef({ x: 1, y: 0 });
  const snake = useRef<{x:number;y:number}[]>([{x:10,y:10}]);
  const food = useRef({x:15,y:10});
  const timer = useRef<any>(null);

  function reset() {
    dir.current = {x:1,y:0};
    snake.current = [{x:10,y:10}];
    food.current = {x:15,y:10};
    setScore(0);
  }

  function step() {
    const head = snake.current[0];
    const next = { x: head.x + dir.current.x, y: head.y + dir.current.y };
    const size = 20;
    if (next.x < 0 || next.y < 0 || next.x >= size || next.y >= size) {
      end();
      return;
    }
    if (snake.current.some((p, i)=> i>0 && p.x===next.x && p.y===next.y)) {
      end();
      return;
    }
    snake.current.unshift(next);
    if (next.x === food.current.x && next.y === food.current.y) {
      setScore(s=>s+10);
      food.current = { x: Math.floor(Math.random()*size), y: Math.floor(Math.random()*size) };
    } else {
      snake.current.pop();
    }
    draw();
  }

  function draw() {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const px = 18;
    ctx.clearRect(0,0,c.width,c.height);

    // grid background
    ctx.globalAlpha = 0.6;
    for (let i=0;i<20;i++){
      for (let j=0;j<20;j++){
        ctx.strokeRect(i*px, j*px, px, px);
      }
    }
    ctx.globalAlpha = 1;

    // food
    ctx.fillRect(food.current.x*px, food.current.y*px, px, px);

    // snake
    snake.current.forEach((p, i)=>{
      ctx.fillRect(p.x*px, p.y*px, px, px);
    });
  }

  function start() {
    if (running) return;
    reset();
    setRunning(true);
    setTimeout(draw, 50);
    timer.current = setInterval(step, 120);
  }

  function end() {
    if (!running) return;
    setRunning(false);
    clearInterval(timer.current);
    timer.current = null;
    onScore(score);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowUp" && dir.current.y !== 1) dir.current = {x:0,y:-1};
      if (e.key === "ArrowDown" && dir.current.y !== -1) dir.current = {x:0,y:1};
      if (e.key === "ArrowLeft" && dir.current.x !== 1) dir.current = {x:-1,y:0};
      if (e.key === "ArrowRight" && dir.current.x !== -1) dir.current = {x:1,y:0};
      if (e.key === " " && !running) start();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running, score]);

  return (
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-bold">Neon Snake</div>
            <div className="text-sm text-zinc-400">Space to start. Arrow keys to move. Score submits to room leaderboard.</div>
          </div>
          <div className="text-sm">
            Score: <span className="text-green-200 font-semibold">{score}</span>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-zinc-800/70 bg-zinc-950/30 p-3">
          <canvas ref={canvasRef} width={360} height={360} className="w-full rounded-lg border border-zinc-800/70 bg-zinc-950/40" />
          <div className="mt-3 flex gap-2">
            <button className="neon-btn" onClick={start} disabled={running}>Start</button>
            <button className="px-3 py-2 rounded-lg border border-zinc-700/60 hover:border-zinc-500/70" onClick={end} disabled={!running}>End & Submit</button>
          </div>
        </div>
      </div>

      <div className="col-span-4 rounded-xl border border-zinc-800/70 bg-zinc-950/30 p-4">
        <div className="font-semibold">Room Leaderboard</div>
        <div className="mt-3 space-y-2 text-sm">
          {leaderboard?.length ? leaderboard.map((e, i)=>(
            <div key={e.user_id} className="flex justify-between">
              <span className="text-zinc-300">#{i+1} {e.username}</span>
              <span className="text-green-200 font-semibold">{e.best_score}</span>
            </div>
          )) : (
            <div className="text-zinc-400">No scores yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
