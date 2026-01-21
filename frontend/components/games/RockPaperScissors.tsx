"use client";

export function RockPaperScissors({ state, you, onPick }: { state: any; you: any; onPick: (choice: string)=>void }) {
  const scores = state?.scores || {};
  const last = state?.last;
  const me = String(you?.user_id || "");
  const myScore = scores[me] || 0;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-bold">Rock • Paper • Scissors</div>
          <div className="text-sm text-zinc-400">Quick 1v1 rounds. Your score: <span className="text-emerald-200 font-semibold">{myScore}</span></div>
        </div>
        <div className="text-xs text-zinc-500">Pick, wait for opponent, repeat.</div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {["rock","paper","scissors"].map((c)=>(
          <button key={c} onClick={()=>onPick(c)} className="neon-btn px-5 py-3 text-sm">
            {c.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="mt-6 p-3 rounded-xl border border-zinc-800/70 bg-zinc-900/30">
        <div className="text-sm font-semibold">Last round</div>
        {!last ? (
          <div className="text-sm text-zinc-400 mt-1">No round yet.</div>
        ) : (
          <div className="text-sm text-zinc-300 mt-1">
            A: <span className="font-semibold">{String(last.a).toUpperCase()}</span> · B: <span className="font-semibold">{String(last.b).toUpperCase()}</span>
            <div className="text-xs text-zinc-500 mt-1">
              Winner: {last.winner ? `User #${last.winner}` : "Draw"}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6">
        <div className="text-sm font-semibold mb-2">Scoreboard</div>
        <div className="grid gap-2 max-w-md">
          {Object.keys(scores).length === 0 ? (
            <div className="text-sm text-zinc-400">No scores yet.</div>
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
