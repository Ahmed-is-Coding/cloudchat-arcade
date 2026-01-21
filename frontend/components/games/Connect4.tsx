"use client";

function Cell({ v }: { v: string }) {
  const cls =
    v === "R" ? "bg-red-500/80" :
    v === "Y" ? "bg-yellow-300/90" :
    "bg-zinc-950/40";
  return <div className={`w-10 h-10 rounded-full border border-zinc-700/60 ${cls}`} />;
}

export function Connect4({ state, you, onDrop }: { state: any; you:any; onDrop: (col:number)=>void }) {
  const grid: string[][] = state?.grid || Array.from({length:6}, ()=>Array(7).fill(""));
  const turn = state?.turn || "R";
  const winner = state?.winner || "";
  const draw = !!state?.draw;
  const symbol = you?.symbol || "?";

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-bold">Connect-4</div>
          <div className="text-sm text-zinc-400">You are: <span className="text-indigo-200 font-semibold">{symbol}</span></div>
        </div>
        <div className="text-sm">
          {winner ? (
            <span className="text-green-200 font-semibold">Winner: {winner}</span>
          ) : draw ? (
            <span className="text-yellow-200 font-semibold">Draw</span>
          ) : (
            <span className="text-zinc-300">Turn: <span className="font-semibold">{turn}</span></span>
          )}
        </div>
      </div>

      <div className="mt-4 max-w-xl">
        <div className="grid grid-cols-7 gap-2 mb-3">
          {Array.from({length:7}).map((_, col)=>(
            <button key={col} className="neon-btn" onClick={()=>onDrop(col)}>Drop</button>
          ))}
        </div>

        <div className="p-4 rounded-xl border border-zinc-800/70 bg-zinc-950/30">
          <div className="grid grid-rows-6 gap-2">
            {grid.map((row, r)=>(
              <div key={r} className="grid grid-cols-7 gap-2">
                {row.map((v,c)=><Cell key={c} v={v} />)}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 text-sm text-zinc-400">
        Drop is validated on the server (gravity + win detection).
      </div>
    </div>
  );
}
