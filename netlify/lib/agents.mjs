// ---------------------------------------------------------------------------
// Licensed professionals that leads are routed to.
//
// EDIT THIS LIST with your real agents before launch.
//   states:     two-letter codes the agent is licensed in, or ["*"] for any state
//   npn:        National Producer Number (shown in the confirmation email)
//   photo:      absolute URL or a path under /public (e.g. "/assets/agents/jane.jpg")
//   bookingUrl: optional calendar link (Calendly, Cal.com, GHL, etc.)
//
// Routing: the lead goes to an agent licensed in their state. If several
// agents match, one is picked consistently from the lead's email, so leads
// are spread evenly and a repeat submission goes to the same person.
// If nobody matches the state, the DEFAULT agent (first with ["*"]) is used.
// ---------------------------------------------------------------------------

export const AGENTS = [
  {
    id: "default",
    name: "The RetireFlow Team",
    title: "Licensed Insurance Professional",
    npn: "",
    email: "team@getretireflow.com",
    phone: "",
    photo: "",
    bookingUrl: "",
    states: ["*"],
  },
  // Example: copy, fill in, and remove the comment markers.
  // {
  //   id: "jane-smith",
  //   name: "Jane Smith",
  //   title: "Licensed Retirement Specialist",
  //   npn: "12345678",
  //   email: "jane@getretireflow.com",
  //   phone: "(555) 555-1234",
  //   photo: "/assets/agents/jane-smith.jpg",
  //   bookingUrl: "https://calendly.com/jane-retireflow/intro",
  //   states: ["TX", "FL", "GA"],
  // },
];

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

export function assignAgent(state, email, agents = AGENTS) {
  const st = String(state || "").toUpperCase();
  const licensed = agents.filter((a) => a.states.includes(st));
  const pool = licensed.length ? licensed : agents.filter((a) => a.states.includes("*"));
  const candidates = pool.length ? pool : agents;
  return candidates[hash(String(email || "").toLowerCase()) % candidates.length];
}
