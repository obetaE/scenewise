import type { DiscoverFilters } from "./api";

// The quiz exists to get an indecisive person to a watchable title in about
// 30 seconds. Every option below maps onto a real TMDB discover parameter —
// nothing is cosmetic, so the answers genuinely narrow the result set.
//
// Design rules that keep it usable:
//  - Single-select per question, so each answer is a definite constraint.
//  - Genres are OR'd within an answer and intersected across questions only
//    where that still leaves a workable pool.
//  - Every question is skippable; skipping just drops that constraint.

export type QuizOption = {
  label: string;
  hint?: string;
  filters: Partial<DiscoverFilters>;
};

export type QuizQuestion = {
  key: string;
  prompt: string;
  helper: string;
  options: QuizOption[];
};

const THIS_YEAR = new Date().getFullYear();

export const quizQuestions: QuizQuestion[] = [
  {
    key: "vibe",
    prompt: "What do you want it to feel like?",
    helper: "This picks the genres we search.",
    options: [
      {
        label: "Make me laugh",
        hint: "Comedy",
        filters: { genres: ["Comedy"] },
      },
      {
        label: "Keep me on edge",
        hint: "Thriller, Mystery, Horror",
        filters: { genres: ["Thriller", "Mystery", "Horror"] },
      },
      {
        label: "Move me",
        hint: "Drama, Romance",
        filters: { genres: ["Drama", "Romance"] },
      },
      {
        label: "Take me somewhere else",
        hint: "Sci-fi, Fantasy, Adventure",
        filters: { genres: ["Science Fiction", "Fantasy", "Adventure"] },
      },
      {
        label: "Big and loud",
        hint: "Action, Adventure",
        filters: { genres: ["Action", "Adventure"] },
      },
      {
        label: "Something gentle",
        hint: "Family, Animation",
        filters: { genres: ["Family", "Animation"] },
      },
    ],
  },
  {
    key: "length",
    prompt: "How long have you got?",
    helper: "Caps the runtime we allow.",
    options: [
      { label: "Under 90 min", hint: "A quick one", filters: { maxRuntime: 90 } },
      { label: "Around 2 hours", hint: "Standard evening", filters: { maxRuntime: 125 } },
      { label: "I've got all night", hint: "No limit", filters: {} },
    ],
  },
  {
    key: "era",
    prompt: "New or proven?",
    helper: "Sets the release window.",
    options: [
      {
        label: "Out recently",
        hint: `${THIS_YEAR - 2} onwards`,
        filters: { minYear: THIS_YEAR - 2 },
      },
      {
        label: "Modern",
        hint: "This century",
        filters: { minYear: 2000 },
      },
      {
        label: "A proper classic",
        hint: "Pre-2000, highly rated",
        filters: { maxYear: 1999, minRating: 7 },
      },
      { label: "Don't mind", filters: {} },
    ],
  },
  {
    key: "quality",
    prompt: "How picky are you feeling?",
    helper: "Sets the minimum audience score.",
    options: [
      {
        label: "Only the best",
        hint: "8+ rated",
        filters: { minRating: 8, sortBy: "vote_average.desc" },
      },
      {
        label: "Well liked",
        hint: "7+ rated",
        filters: { minRating: 7, sortBy: "popularity.desc" },
      },
      {
        label: "Surprise me",
        hint: "Anything decent",
        filters: { minRating: 6, sortBy: "popularity.desc" },
      },
    ],
  },
];

// Later answers win on scalar fields, so "only the best" can tighten the
// rating floor a classic-era answer already set. Genres accumulate.
export function buildFilters(answers: Record<string, QuizOption>): DiscoverFilters {
  const result: DiscoverFilters = {};
  const genres = new Set<string>();

  for (const question of quizQuestions) {
    const option = answers[question.key];
    if (!option) continue;

    const f = option.filters;
    f.genres?.forEach((g) => genres.add(g));
    if (f.maxRuntime != null) result.maxRuntime = f.maxRuntime;
    if (f.minRuntime != null) result.minRuntime = f.minRuntime;
    if (f.minYear != null) result.minYear = f.minYear;
    if (f.maxYear != null) result.maxYear = f.maxYear;
    if (f.sortBy) result.sortBy = f.sortBy;
    // Keep the strictest rating floor any answer asked for.
    if (f.minRating != null) {
      result.minRating = Math.max(result.minRating ?? 0, f.minRating);
    }
  }

  if (genres.size) result.genres = [...genres];
  if (!result.minRating) result.minRating = 6;
  if (!result.sortBy) result.sortBy = "popularity.desc";
  return result;
}

// Shown on the results screen so the pick is explainable rather than magic.
export function describeFilters(filters: DiscoverFilters): string {
  const parts: string[] = [];
  if (filters.genres?.length) parts.push(filters.genres.slice(0, 3).join(", "));
  if (filters.maxRuntime) parts.push(`under ${filters.maxRuntime} min`);
  if (filters.minYear && filters.maxYear) parts.push(`${filters.minYear}–${filters.maxYear}`);
  else if (filters.minYear) parts.push(`${filters.minYear} onwards`);
  else if (filters.maxYear) parts.push(`up to ${filters.maxYear}`);
  if (filters.minRating) parts.push(`${filters.minRating}+ rated`);
  return parts.join(" · ");
}
