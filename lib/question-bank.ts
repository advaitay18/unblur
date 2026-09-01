// lib/question-bank.ts
// Ported from the production Unblur quiz (unblur_master-2.html), sliced to a
// linear 25-question flow (5 per section x 5 sections) from the original
// 35-question adaptive pool. Trait dimensions are Unblur's actual 8-axis
// model (not RIASEC/OCEAN) — see route.ts for how these feed the Gemini
// scoring prompt.

export type TraitKey =
  | "analytical"
  | "creative"
  | "social"
  | "curiosity"
  | "independence"
  | "authority"
  | "peer"
  | "risk";

export type TraitDeltaMap = Partial<Record<TraitKey, number>>;

export interface QuestionOption {
  id: string;
  text: string;
  traitDeltas: TraitDeltaMap;
}

export interface SliderScoring {
  lowLabel: string;
  highLabel: string;
  // mirrors the original v>6 / v<4 / else branching, 1-10 scale
  highThreshold: number;
  lowThreshold: number;
  high: TraitDeltaMap;
  low: TraitDeltaMap;
  mid: TraitDeltaMap;
}

export interface Question {
  id: string;
  section: number; // 0-4
  sectionName: string;
  type: "pair" | "choice" | "slider";
  context: string;
  text: string;
  options?: QuestionOption[]; // pair | choice
  slider?: SliderScoring; // slider only
}

export const SECTION_NAMES = [
  "Instinct",
  "Thinking Style",
  "Self-Awareness",
  "Pressure & Identity",
  "Vision",
];

// Resolves a slider's 1-10 value into trait deltas using the same
// high/low/mid threshold logic as the original app.
export function scoreSlider(value: number, s: SliderScoring): TraitDeltaMap {
  if (value > s.highThreshold) return s.high;
  if (value < s.lowThreshold) return s.low;
  return s.mid;
}

export const QUESTION_BANK: Question[] = [

  {
    id: "q1",
    section: 0,
    sectionName: "Instinct",
    type: "pair",
    context: "Picture this…",
    text: "It's a long weekend. Your phone dies. By evening, what did you honestly end up doing?",
    options: [
      { id: "q1-a", text: "🔧 Took something apart to see how it works", traitDeltas: {"analytical":2,"curiosity":1} },
      { id: "q1-b", text: "🎨 Made something — drew, wrote, built, created", traitDeltas: {"creative":2} },
      { id: "q1-c", text: "📱 Found people and spent time with them", traitDeltas: {"social":2} },
      { id: "q1-d", text: "📖 Deep-dived into a topic I'd been curious about", traitDeltas: {"curiosity":2,"analytical":1} },
    ],
  },
  {
    id: "q2",
    section: 0,
    sectionName: "Instinct",
    type: "choice",
    context: "Scenario…",
    text: "Your class needs to pick a project topic. No teacher, no marks. What actually happens?",
    options: [
      { id: "q2-a", text: "I pitch something I've been thinking about", traitDeltas: {"independence":2,"curiosity":1} },
      { id: "q2-b", text: "I go with whatever gets the most votes", traitDeltas: {"peer":2,"social":1} },
      { id: "q2-c", text: "I wait to see what the teacher would approve of", traitDeltas: {"authority":2} },
      { id: "q2-d", text: "I suggest whatever seems most logical and achievable", traitDeltas: {"analytical":2} },
    ],
  },
  {
    id: "q3",
    section: 0,
    sectionName: "Instinct",
    type: "slider",
    context: "Be honest here…",
    text: "When someone asks \"what do you want to do with your life\" — how does it feel inside?",
    slider: {
      lowLabel: "😰 Stresses me out completely",
      highLabel: "😄 I have ideas and feel excited",
      highThreshold: 6,
      lowThreshold: 4,
      high: {"curiosity":2,"independence":1},
      low: {"authority":1},
      mid: {},
    },
  },
  {
    id: "q4",
    section: 0,
    sectionName: "Instinct",
    type: "choice",
    context: "Real talk…",
    text: "You get a disappointing result. Your honest first reaction?",
    options: [
      { id: "q4-a", text: "I immediately think about how my parents will react", traitDeltas: {"authority":2} },
      { id: "q4-b", text: "I feel bad, then start figuring out what to do differently", traitDeltas: {"analytical":1,"independence":1} },
      { id: "q4-c", text: "It bothers me but fades quickly — one result doesn't define me", traitDeltas: {"risk":2} },
      { id: "q4-d", text: "I go quiet and avoid thinking about it", traitDeltas: {"peer":1} },
    ],
  },
  {
    id: "q5",
    section: 0,
    sectionName: "Instinct",
    type: "pair",
    context: "No right answer…",
    text: "Your school needs help with an event. Which role do you naturally drift toward?",
    options: [
      { id: "q5-a", text: "📋 Planning — making sure everything is organised", traitDeltas: {"analytical":2,"independence":1} },
      { id: "q5-b", text: "🎭 Performing or presenting in front of people", traitDeltas: {"creative":2,"social":1} },
      { id: "q5-c", text: "🤝 Taking care of people, making sure everyone's okay", traitDeltas: {"social":2} },
      { id: "q5-d", text: "💡 Coming up with new ideas to do it better", traitDeltas: {"creative":2,"curiosity":1} },
    ],
  },
  {
    id: "q6",
    section: 1,
    sectionName: "Thinking Style",
    type: "choice",
    context: "Think back…",
    text: "Two classmates solve the same puzzle. One uses steps. One tries random combinations until something clicks. Which sounds more like you?",
    options: [
      { id: "q6-a", text: "The steps person — I need to understand why each move works", traitDeltas: {"analytical":2} },
      { id: "q6-b", text: "The random combinations person — I learn by doing and failing", traitDeltas: {"creative":2,"risk":1} },
      { id: "q6-c", text: "Both, depending on mood and type of problem", traitDeltas: {"analytical":1,"creative":1} },
    ],
  },
  {
    id: "q7",
    section: 1,
    sectionName: "Thinking Style",
    type: "pair",
    context: "Imagine this…",
    text: "You need to explain something complex to younger kids. What do you naturally do?",
    options: [
      { id: "q7-a", text: "📊 Draw a chart — visuals work better than words", traitDeltas: {"analytical":2} },
      { id: "q7-b", text: "📖 Tell a story that makes it feel real and emotional", traitDeltas: {"creative":2,"social":1} },
      { id: "q7-c", text: "🎮 Create a game so they experience it themselves", traitDeltas: {"creative":1,"social":2} },
      { id: "q7-d", text: "📝 List the key facts — keep it simple and accurate", traitDeltas: {"analytical":1} },
    ],
  },
  {
    id: "q8",
    section: 1,
    sectionName: "Thinking Style",
    type: "slider",
    context: "Scale yourself…",
    text: "When working on something, how much do you prefer figuring it out alone vs. talking it through with others?",
    slider: {
      lowLabel: "🧘 Solo — I think better alone",
      highLabel: "🗣️ Together — I process by talking",
      highThreshold: 6,
      lowThreshold: 4,
      high: {"social":2},
      low: {"independence":2},
      mid: {"independence":1,"social":1},
    },
  },
  {
    id: "q9",
    section: 1,
    sectionName: "Thinking Style",
    type: "choice",
    context: "Scenario…",
    text: "A new person joins your group and clearly feels out of place. What actually happens?",
    options: [
      { id: "q9-a", text: "I notice and find a reason to talk to them", traitDeltas: {"social":2} },
      { id: "q9-b", text: "I notice but wait for someone else to make the first move", traitDeltas: {"peer":1} },
      { id: "q9-c", text: "I'm focused on my own work but feel slightly bad", traitDeltas: {"independence":1} },
      { id: "q9-d", text: "I observe from a distance before deciding whether to approach", traitDeltas: {"analytical":1,"independence":1} },
    ],
  },
  {
    id: "q10",
    section: 1,
    sectionName: "Thinking Style",
    type: "pair",
    context: "Which feels more like you?",
    text: "A subject you find boring suddenly becomes optional. You can drop it. What's going through your head?",
    options: [
      { id: "q10-a", text: "🚀 Drop it immediately. Life is short.", traitDeltas: {"independence":2,"risk":2} },
      { id: "q10-b", text: "🤔 Think carefully — it might be useful later", traitDeltas: {"analytical":2} },
      { id: "q10-c", text: "👀 Check what my friends are doing first", traitDeltas: {"peer":2} },
      { id: "q10-d", text: "💬 Ask a parent or teacher what they think", traitDeltas: {"authority":2} },
    ],
  },
  {
    id: "q11",
    section: 2,
    sectionName: "Self-Awareness",
    type: "choice",
    context: "Think about this year…",
    text: "What kind of moment has made you feel most alive?",
    options: [
      { id: "q11-a", text: "Cracking a hard problem after being stuck for a long time", traitDeltas: {"analytical":2,"independence":1} },
      { id: "q11-b", text: "A group project where everyone actually contributed equally", traitDeltas: {"social":2} },
      { id: "q11-c", text: "Presenting something I made and people genuinely responded", traitDeltas: {"creative":2,"social":1} },
      { id: "q11-d", text: "Learning something that completely changed how I see things", traitDeltas: {"curiosity":2} },
    ],
  },
  {
    id: "q12",
    section: 2,
    sectionName: "Self-Awareness",
    type: "slider",
    context: "Real talk…",
    text: "How much do the expectations of people around you shape what you think you want to do?",
    slider: {
      lowLabel: "✊ Very little — I think for myself",
      highLabel: "🏠 A lot — their expectations run deep",
      highThreshold: 6,
      lowThreshold: 4,
      high: {"authority":2},
      low: {"independence":2},
      mid: {"authority":1},
    },
  },
  {
    id: "q13",
    section: 2,
    sectionName: "Self-Awareness",
    type: "pair",
    context: "You've got ₹500…",
    text: "It's completely yours. No one's watching. What do you actually do with it?",
    options: [
      { id: "q13-a", text: "🔍 Buy something I've been researching for weeks", traitDeltas: {"analytical":2,"curiosity":1} },
      { id: "q13-b", text: "✨ Something random that caught my eye", traitDeltas: {"creative":1,"risk":2} },
      { id: "q13-c", text: "👥 An experience with people I like", traitDeltas: {"social":2} },
      { id: "q13-d", text: "💰 Save most of it — I don't like spending without reason", traitDeltas: {"independence":1} },
    ],
  },
  {
    id: "q14",
    section: 2,
    sectionName: "Self-Awareness",
    type: "choice",
    context: "Scenario…",
    text: "Your school announces a brand-new elective in something you know nothing about. Your honest reaction?",
    options: [
      { id: "q14-a", text: "Excited — new things are interesting by default", traitDeltas: {"risk":2,"curiosity":2} },
      { id: "q14-b", text: "Curious but careful — I'd research it first", traitDeltas: {"analytical":2,"curiosity":1} },
      { id: "q14-c", text: "Nervous — I don't like being bad at something publicly", traitDeltas: {"authority":1,"peer":1} },
      { id: "q14-d", text: "Indifferent — I'd only care if people I respect were doing it", traitDeltas: {"peer":2} },
    ],
  },
  {
    id: "q15",
    section: 2,
    sectionName: "Self-Awareness",
    type: "pair",
    context: "End of year…",
    text: "Which of these would make you feel most proud?",
    options: [
      { id: "q15-a", text: "📈 My performance was the best it's ever been", traitDeltas: {"authority":1} },
      { id: "q15-b", text: "💡 I learned something nobody taught me — entirely on my own", traitDeltas: {"curiosity":2,"independence":2} },
      { id: "q15-c", text: "🤝 I made a real difference to someone's life", traitDeltas: {"social":2} },
      { id: "q15-d", text: "🎨 I made something that didn't exist before", traitDeltas: {"creative":2} },
    ],
  },
  {
    id: "q16",
    section: 3,
    sectionName: "Pressure & Identity",
    type: "choice",
    context: "Decision moment…",
    text: "Everyone around you is preparing for the same \"accepted\" path. You're not sure it's yours. What happens inside?",
    options: [
      { id: "q16-a", text: "I feel the pull but stay anchored to what I actually want", traitDeltas: {"independence":2,"risk":1} },
      { id: "q16-b", text: "I start questioning myself — maybe they know something I don't", traitDeltas: {"peer":2,"authority":1} },
      { id: "q16-c", text: "I go along for now and figure it out later", traitDeltas: {"authority":1,"peer":1} },
      { id: "q16-d", text: "I get genuinely frustrated — why is there only one acceptable path?", traitDeltas: {"independence":2,"curiosity":1} },
    ],
  },
  {
    id: "q17",
    section: 3,
    sectionName: "Pressure & Identity",
    type: "slider",
    context: "Honest slider…",
    text: "When you imagine your life at 30, how much of that picture comes from you vs. what your family considers success?",
    slider: {
      lowLabel: "Mostly theirs — I've absorbed their definition",
      highLabel: "Mostly mine — I've built my own vision",
      highThreshold: 6,
      lowThreshold: 4,
      high: {},
      low: {},
      mid: {},
    },
  },
  {
    id: "q18",
    section: 3,
    sectionName: "Pressure & Identity",
    type: "pair",
    context: "Two futures…",
    text: "Which one pulls you more — be honest, not impressive:",
    options: [
      { id: "q18-a", text: "🏢 Stable, respected career. Clear progression. Family is proud.", traitDeltas: {"authority":1,"analytical":1} },
      { id: "q18-b", text: "🌊 Uncertain path, but genuinely mine. I don't know where it leads yet.", traitDeltas: {"independence":2,"risk":2} },
    ],
  },
  {
    id: "q19",
    section: 3,
    sectionName: "Pressure & Identity",
    type: "choice",
    context: "Pressure check…",
    text: "When you're unsure about something important, where do you most often look for the answer?",
    options: [
      { id: "q19-a", text: "Inside — I sit with it until I figure out what I actually think", traitDeltas: {"independence":2,"curiosity":1} },
      { id: "q19-b", text: "To people I trust — their perspective helps clarify mine", traitDeltas: {"social":2} },
      { id: "q19-c", text: "To what seems most logical and defensible", traitDeltas: {"analytical":2} },
      { id: "q19-d", text: "To what most people in my situation would do", traitDeltas: {"peer":2,"authority":1} },
    ],
  },
  {
    id: "q20",
    section: 3,
    sectionName: "Pressure & Identity",
    type: "pair",
    context: "Two fears…",
    text: "Which secretly worries you more?",
    options: [
      { id: "q20-a", text: "😔 That I'm wasting time on the wrong thing", traitDeltas: {"curiosity":1,"independence":1} },
      { id: "q20-b", text: "😰 That I'll disappoint the people who've invested in me", traitDeltas: {"authority":2,"peer":1} },
    ],
  },
  {
    id: "q21",
    section: 4,
    sectionName: "Vision",
    type: "choice",
    context: "One full year, no pressure…",
    text: "You could learn absolutely anything — no exams, no career implications. What do you choose?",
    options: [
      { id: "q21-a", text: "How things work — systems, technology, engineering, science", traitDeltas: {"analytical":2,"curiosity":2} },
      { id: "q21-b", text: "How people work — psychology, behaviour, stories, culture", traitDeltas: {"social":2,"curiosity":2} },
      { id: "q21-c", text: "How to make things — design, music, writing, film, art", traitDeltas: {"creative":2} },
      { id: "q21-d", text: "How the world works — business, history, money, power", traitDeltas: {"analytical":1,"curiosity":1,"risk":1} },
    ],
  },
  {
    id: "q22",
    section: 4,
    sectionName: "Vision",
    type: "pair",
    context: "Which problem pulls you?",
    text: "If you had the skills, which of these would you most want to spend your life solving?",
    options: [
      { id: "q22-a", text: "📚 Education is still broken and boring for most kids", traitDeltas: {"social":2,"creative":1} },
      { id: "q22-b", text: "🚀 Build something a million people use every day", traitDeltas: {"analytical":2,"independence":2} },
      { id: "q22-c", text: "🤗 Help someone going through something really hard", traitDeltas: {"social":2} },
      { id: "q22-d", text: "🎭 Create something that makes people feel understood", traitDeltas: {"creative":2,"curiosity":1} },
    ],
  },
  {
    id: "q23",
    section: 4,
    sectionName: "Vision",
    type: "slider",
    context: "Real talk…",
    text: "How much does earning a lot of money factor into your vision of your future?",
    slider: {
      lowLabel: "❤️ I'd choose meaning over money",
      highLabel: "💸 Financial security is my first priority",
      highThreshold: 7,
      lowThreshold: 3,
      high: {"authority":1},
      low: {"independence":1,"risk":1},
      mid: {},
    },
  },
  {
    id: "q24",
    section: 4,
    sectionName: "Vision",
    type: "choice",
    context: "The most important one…",
    text: "Which headline about you — 15 years from now — would make you feel your life meant something?",
    options: [
      { id: "q24-a", text: "\"Built something that changed how millions of people do something everyday\"", traitDeltas: {"analytical":2,"independence":2,"risk":1} },
      { id: "q24-b", text: "\"Research that shifted how we understand something that mattered\"", traitDeltas: {"analytical":2,"curiosity":2} },
      { id: "q24-c", text: "\"A life people describe as beautiful — meaningful work, real connections\"", traitDeltas: {"social":2,"creative":1} },
      { id: "q24-d", text: "\"The person everyone calls when no one else can figure it out\"", traitDeltas: {"analytical":1,"social":1,"independence":1} },
    ],
  },
  {
    id: "q25",
    section: 4,
    sectionName: "Vision",
    type: "pair",
    context: "Final question…",
    text: "Ten years from now, which regret would sting more?",
    options: [
      { id: "q25-a", text: "😔 I played it safe and always wondered what if", traitDeltas: {"risk":2,"independence":1} },
      { id: "q25-b", text: "😟 I took a leap and it didn't land the way I hoped", traitDeltas: {"authority":1,"peer":1} },
    ],
  },
];
