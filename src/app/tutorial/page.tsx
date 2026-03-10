import Link from "next/link";

const stages = [
  {
    title: "Stage 1: Clarify",
    summary: "Define the challenge clearly and turn it into one refined focus question.",
    bullets: [
      "State your wish/challenge.",
      "Gather key facts and constraints.",
      "Pick your hits and lock one focus question.",
    ],
  },
  {
    title: "Stage 2: Ideate",
    summary: "Generate a broad range of idea options before judging them.",
    bullets: [
      "Produce many verb-first ideas.",
      "Select promising idea hits.",
      "Cluster ideas into themes for direction.",
    ],
  },
  {
    title: "Stage 3: Develop",
    summary: "Strengthen top ideas with plusses, potentials, and concern-solving steps.",
    bullets: [
      "Clarify the goal statement.",
      "List concerns and create action steps.",
      "Choose the best hit actions to carry forward.",
    ],
  },
  {
    title: "Stage 4: Implement",
    summary: "Commit to a plan and turn ideas into a timeline with immediate actions.",
    bullets: [
      "Build a practical action list.",
      "Sort steps into short, mid, and long term.",
      "Start 1-3 actions within 24 hours.",
    ],
  },
];

export default function TutorialPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_15%_10%,#f7eed4_0%,#edf2f4_45%,#eaf4eb_100%)] p-4 sm:p-8">
      <main className="mx-auto w-full max-w-5xl rounded-3xl border border-black/10 bg-white/90 p-5 shadow-xl backdrop-blur sm:p-8">
        <header className="rounded-2xl bg-[#1e2a38] p-6 text-[#f8f4e7] sm:p-8">
          <p className="text-xs uppercase tracking-[0.18em] text-[#d4e1eb]">CPS Tutorial</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Creative Problem Solving in 4 Stages</h1>
          <p className="mt-3 max-w-3xl text-base text-[#d9e4eb] sm:text-lg">
            CPS is a structured way to move from a challenge to action. Use each stage in order, then carry your best
            output to the next stage.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex rounded-lg border border-white/35 bg-white/10 px-4 py-2 text-sm font-medium text-[#f8f4e7] hover:bg-white/20"
          >
            Back to Pipeline
          </Link>
        </header>

        <section className="mt-5 grid gap-4 md:grid-cols-2">
          {stages.map((stage) => (
            <article key={stage.title} className="rounded-2xl border border-black/10 bg-[#fbfbf9] p-4 sm:p-5">
              <h2 className="text-xl font-semibold text-[#1e2a38]">{stage.title}</h2>
              <p className="mt-2 text-sm text-[#3f4f5e] sm:text-base">{stage.summary}</p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[#1f2933]">
                {stage.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
