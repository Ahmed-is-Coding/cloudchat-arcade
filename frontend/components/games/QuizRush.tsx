"use client";

const QUESTIONS = [
  { q: "What does Kubernetes mainly orchestrate?", choices: ["containers", "databases", "monitors", "routers"] },
  { q: "Which protocol is used for secure web traffic?", choices: ["ftp", "https", "telnet", "smtp"] },
  { q: "PostgreSQL is a ...", choices: ["text editor", "relational database", "hypervisor", "firewall"] },
  { q: "Redis is commonly used for ...", choices: ["gpu mining", "cache", "email hosting", "dns records"] },
];

export function QuizRush({ state, onAction }: { state: any; onAction: (action:string, extra?:any)=>void }) {
  const running = !!state?.running;
  const idx = state?.idx ?? 0;
  const scores = state?.scores || {};
  const q = QUESTIONS[idx];

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-bold">Quiz Rush</div>
          <div className="text-sm text-zinc-400">Fast multi-player quiz. Server stores scores.</div>
        </div>
        <div className="flex gap-2">
          {!running ? (
            <button className="neon-btn" onClick={()=>onAction("start")}>Start</button>
          ) : (
            <button className="neon-btn" onClick={()=>onAction("next")}>Next</button>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-12 gap-3">
        <div className="col-span-8 rounded-xl border border-zinc-800/70 bg-zinc-950/30 p-4">
          {!q ? (
            <div className="text-zinc-400">No question.</div>
          ) : (
            <>
              <div className="text-xl font-bold">{q.q}</div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {q.choices.map((c)=>(
                  <button key={c} className="px-3 py-3 rounded-xl border border-zinc-800/70 hover:border-indigo-400/60 transition bg-zinc-900/30"
                    onClick={()=>onAction("answer", { answer: c.toLowerCase() })}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div className="mt-3 text-sm text-zinc-400">
                Tip: multiple people can answer, but only the first correct answer per user counts.
              </div>
            </>
          )}
        </div>

        <div className="col-span-4 rounded-xl border border-zinc-800/70 bg-zinc-950/30 p-4">
          <div className="font-semibold">Scores</div>
          <div className="mt-3 space-y-2 text-sm">
            {Object.keys(scores).length === 0 ? (
              <div className="text-zinc-400">No scores yet.</div>
            ) : (
              Object.entries(scores).sort((a:any,b:any)=>b[1]-a[1]).map(([uid, sc]: any)=>(
                <div key={uid} className="flex justify-between">
                  <span className="text-zinc-300">User #{uid}</span>
                  <span className="text-green-200 font-semibold">{sc}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
