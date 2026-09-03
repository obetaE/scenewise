export type Movie = {
  id: string;
  title: string;
  year: number;
  runtime: string;
  genres: string[];
  poster: number; // require() source
  match: number;
  pacing: "Slow burn" | "Steady" | "Brisk" | "Relentless";
  pacingNote: string;
  intensity: number; // 1-5
  summary: string;
  safeTags: string[];
  warnings: { label: string; level: "mild" | "moderate" | "heavy" }[];
  moods: string[];
  ending: string;
};

export const movies: Movie[] = [
  {
    id: "neon-rain",
    title: "Neon Rain",
    year: 2024,
    runtime: "1h 58m",
    genres: ["Neo-noir", "Mystery"],
    poster: require("../assets/posters/poster-1.jpg"),
    match: 94,
    pacing: "Slow burn",
    pacingNote:
      "First 30 min is atmosphere-heavy; momentum locks in at the halfway mark.",
    intensity: 3,
    summary:
      "A night-shift translator in a rain-soaked city takes one last job and finds the person on the other end of the line knows far too much about her. Quiet, character-first, and more about the conversations than the chase.",
    safeTags: ["No jump scares", "Satisfying ending", "Low gore"],
    warnings: [
      { label: "Flashing lights", level: "moderate" },
      { label: "Gun violence", level: "mild" },
      { label: "Alcohol use", level: "mild" },
    ],
    moods: ["Thoughtful", "Tense", "Alone"],
    ending: "Resolved, slightly bittersweet. No cliffhanger.",
  },
  {
    id: "dust-horizon",
    title: "Dust Horizon",
    year: 2023,
    runtime: "2h 26m",
    genres: ["Sci-fi", "Epic"],
    poster: require("../assets/posters/poster-2.jpg"),
    match: 88,
    pacing: "Steady",
    pacingNote:
      "Long but evenly paced — two natural break points if you're splitting it.",
    intensity: 4,
    summary:
      "Generations after the last city fell, a courier crosses the sand to deliver a message that could end a war. Big landscapes, small human stakes, and a score that does a lot of the talking.",
    safeTags: ["No animal harm", "Spoiler-free trailer", "Rewatch friendly"],
    warnings: [
      { label: "Large-scale peril", level: "moderate" },
      { label: "Character death", level: "heavy" },
      { label: "Loud sound design", level: "moderate" },
    ],
    moods: ["Escape", "Awe", "With friends"],
    ending: "Closed arc with an open door for a sequel.",
  },
  {
    id: "the-long-table",
    title: "The Long Table",
    year: 2025,
    runtime: "1h 41m",
    genres: ["Drama", "Family"],
    poster: require("../assets/posters/poster-3.jpg"),
    match: 91,
    pacing: "Slow burn",
    pacingNote: "Almost entirely in one house. Dialogue-driven from minute one.",
    intensity: 2,
    summary:
      "Three siblings cook one dinner and finally say the things they've been circling for a decade. Warm, funny in places, and gentler than its premise suggests.",
    safeTags: ["No violence", "Comfort watch", "Happy-ish ending"],
    warnings: [
      { label: "Grief and loss", level: "moderate" },
      { label: "Family conflict", level: "moderate" },
    ],
    moods: ["Cozy", "Emotional", "Wind down"],
    ending: "Hopeful. You will be fine.",
  },
  {
    id: "lantern",
    title: "Lantern",
    year: 2024,
    runtime: "1h 47m",
    genres: ["Thriller", "Folk horror"],
    poster: require("../assets/posters/poster-4.jpg"),
    match: 72,
    pacing: "Relentless",
    pacingNote: "Almost no downtime after the 20-minute mark.",
    intensity: 5,
    summary:
      "A search party goes into the woods for a missing hiker and finds the forest is keeping score. Dread-forward rather than gory, but it does not let up.",
    safeTags: ["Low gore", "Creature kept off-screen"],
    warnings: [
      { label: "Jump scares", level: "heavy" },
      { label: "Body horror", level: "moderate" },
      { label: "Claustrophobia", level: "moderate" },
    ],
    moods: ["Adrenaline", "Tense", "With friends"],
    ending: "Ambiguous. Expect an argument afterwards.",
  },
  {
    id: "orbit-window",
    title: "Orbit Window",
    year: 2022,
    runtime: "1h 33m",
    genres: ["Sci-fi", "Comedy"],
    poster: require("../assets/posters/poster-5.jpg"),
    match: 85,
    pacing: "Brisk",
    pacingNote: "Short, tight, and never sits still. Easy weeknight pick.",
    intensity: 1,
    summary:
      "Two bored technicians on a decommissioned station invent problems to solve, then accidentally solve a real one. Light, chatty, and quietly sweet.",
    safeTags: ["No violence", "Comfort watch", "Under 100 min"],
    warnings: [{ label: "Mild language", level: "mild" }],
    moods: ["Cozy", "Laugh", "Wind down"],
    ending: "Happy. Genuinely.",
  },
];

export const getMovie = (id: string) => movies.find((m) => m.id === id);

export const moodQuestions = [
  {
    key: "mood",
    prompt: "What are you in the mood for?",
    options: ["Cozy", "Tense", "Laugh", "Awe", "Emotional", "Adrenaline"],
  },
  {
    key: "energy",
    prompt: "How much energy do you have?",
    options: ["Wind down", "Thoughtful", "Escape", "Alone", "With friends"],
  },
  {
    key: "length",
    prompt: "How long have you got?",
    options: ["Under 100 min", "About two hours", "All evening"],
  },
] as const;
