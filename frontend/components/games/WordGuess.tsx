"use client";

export function WordGuess({ state, onGuess, onNew }: { state: any; onGuess: (letter: string)=>void; onNew: ()=>void }) {
  const masked: string[] = state?.masked || [];
  const guessed: string[] = state?.guessed || [];
  const misses: number = state?.misses || 0;
  const max: number = state?.max_misses || 6;
  const done: boolean = !!state?.done;
  const answer: string | undefined = state?.answer;
  const scores = state?.scores || {};

  const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-bold">Word Guess</div>
          <div className="text-sm text-zinc-400">Guess the word before the neon shield breaks.</div>
        </div>
        <button className="neon-btn px-4 py-2 text-sm" onClick={onNew}>New Word</button>
      </div>

      <div className="mt-6 flex items-center gap-4">
        <div className="text-3xl tracking-widest font-black">
          {masked.join(" ")}
        </div>
        <div className="text-sm text-zinc-400">
          Misses: <span className="font-semibold text-pink-200">{misses}</span> / {max}
          {done && (
            <div className="mt-1 text-xs text-zinc-500">
              {answer ? <>Answer: <span className="font-semibold text-emerald-200">{answer}</span></> : "Game over."}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-13 gap-2">
        {alpha.map((ch)=> {
          const used = guessed.includes(ch) || done;
          return (
            <button
              key={ch}
              disabled={used}
              onClick={()=>onGuess(ch)}
              className={`px-0 py-2 rounded-md border text-xs font-semibold transition
                ${used ? "opacity-30 border-zinc-800/60" : "border-indigo-400/30 hover:border-indigo-300/70 bg-indigo-500/10"}
              `}
            >
              {ch}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        <div className="text-sm font-semibold mb-2">Winners</div>
        <div className="grid gap-2 max-w-md">
          {Object.keys(scores).length === 0 ? (
            <div className="text-sm text-zinc-400">No wins yet.</div>
          ) : (
            Object.entries(scores).sort((a:any,b:any)=>Number(b[1])-Number(a[1])).map(([uid,sc]:any)=>(
              <div key={uid} className="flex items-center justify-between px-3 py-2 rounded-lg border border-zinc-800/70 bg-zinc-950/20">
                <div className="text-sm text-zinc-300">User #{uid}</div>
                <div className="text-sm font-semibold text-emerald-200">{sc}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
