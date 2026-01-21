"use client";

export function TicTacToe({ state, you, onMove }: { state: any; you: any; onMove: (idx:number)=>void }) {
  const board: string[] = state?.board || Array(9).fill("");
  const turn = state?.turn || "X";
  const winner = state?.winner || "";
  const draw = !!state?.draw;
  const symbol = you?.symbol || "?";

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-bold">Tic-Tac-Toe</div>
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

      <div className="mt-5 grid grid-cols-3 gap-3 max-w-md">
        {board.map((v, i) => (
          <button
            key={i}
            onClick={()=>onMove(i)}
            className="h-24 rounded-xl border border-zinc-700/60 bg-zinc-900/40 hover:border-indigo-400/60 transition text-3xl font-black"
          >
            {v}
          </button>
        ))}
      </div>

      <div className="mt-4 text-sm text-zinc-400">
        Multiplayer is server-validated: turns are enforced and wins are detected in the backend.
      </div>
    </div>
  );
}
