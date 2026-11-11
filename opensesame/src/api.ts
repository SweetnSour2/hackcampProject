import type { Difficulty, Repository } from "./data";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const COLORS = ["#64F0BD", "#7C9CFF", "#F0C35A", "#E88B8B", "#C5A7FF", "#6ED3F0"];

export type Skill = {
  name: string;
  proficiency: number;
  description: string;
  source?: string;
};

export type MatchesResponse = {
  user: { username: string; avatar_url: string };
  skills: Skill[];
  matches: Array<{
    repo: {
      id: number;
      full_name: string;
      html_url: string;
      description: string | null;
      language: string | null;
      topics: string[];
      stars: number;
      forks: number;
      pushed_at: string;
      location: { name: string; lat: number; lng: number; source: string | null } | null;
      level: string | null;
      summary: string | null;
    };
    activity: {
      new_beginner_issues_24h: number;
      beginner_issues_picked_up_7d: number;
      stars_gained_7d: number;
    } | null;
    score: number;
    matched_skills: string[];
    learn_skills: string[];
    reason: string | null;
    issues: Array<{
      number: number;
      title: string;
      html_url: string;
      labels: string[];
      body_preview: string;
    }>;
  }>;
};

export function githubUsername(user: {
  nickname?: string;
  preferred_username?: string;
  email?: string;
} | undefined): string | null {
  if (!user) return null;
  const name = user.nickname || user.preferred_username;
  if (name && !name.includes("@")) return name.toLowerCase();
  return null;
}

function formatStars(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

function activityText(
  activity: MatchesResponse["matches"][0]["activity"],
  pushedAt: string,
): string {
  if (activity?.beginner_issues_picked_up_7d)
    return `${activity.beginner_issues_picked_up_7d} picked up in 7d`;
  if (activity?.new_beginner_issues_24h)
    return `${activity.new_beginner_issues_24h} new beginner issues today`;
  if (activity?.stars_gained_7d) return `+${activity.stars_gained_7d} stars this week`;
  const days = Math.max(
    0,
    Math.round((Date.now() - new Date(pushedAt).getTime()) / 86400000),
  );
  if (days === 0) return "Pushed today";
  if (days === 1) return "Pushed yesterday";
  return `Pushed ${days}d ago`;
}

function difficulty(level: string | null): Difficulty {
  const value = (level || "beginner").toLowerCase();
  if (value.includes("adv")) return "Advanced";
  if (value.includes("inter")) return "Intermediate";
  return "Beginner";
}

export function toRepository(
  match: MatchesResponse["matches"][0],
  index: number,
): Repository {
  const [owner, name] = match.repo.full_name.split("/");
  const loc = match.repo.location;
  return {
    id: String(match.repo.id),
    name: name || match.repo.full_name,
    owner: owner || "",
    description: match.repo.description || "",
    language: match.repo.language || "Unknown",
    match: Math.round(match.score * 100),
    difficulty: difficulty(match.repo.level),
    stars: formatStars(match.repo.stars),
    forks: formatStars(match.repo.forks),
    activity: activityText(match.activity, match.repo.pushed_at),
    topic: match.repo.topics[0] || match.repo.language || "Open source",
    contribution: "Code",
    lat: loc?.lat ?? 0,
    lng: loc?.lng ?? 0,
    location: loc?.name || "Location unknown",
    locationSource: loc?.source || "Not in catalog yet",
    color: COLORS[index % COLORS.length],
    why: match.reason || "Scored from your GitHub skills and beginner issues.",
    skills: match.matched_skills,
    learn: match.learn_skills,
    summary: match.repo.summary || match.repo.description || "",
    github: match.repo.html_url,
    issues: match.issues.map((issue) => ({
      number: issue.number,
      title: issue.title,
      labels: issue.labels,
      difficulty: "Beginner" as Difficulty,
      skills: issue.labels,
      summary: issue.body_preview,
    })),
  };
}

export async function fetchMatches(username: string): Promise<MatchesResponse> {
  const response = await fetch(
    `${API}/matches/${encodeURIComponent(username)}?limit=10`,
  );
  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(body.detail || `Matches failed (${response.status})`);
  }
  return response.json();
}

export async function fetchCoach(body: {
  username: string;
  repo_full_name: string;
  issue_number: number;
}): Promise<{ walkthrough_md: string; ai_policy_note: string | null }> {
  const response = await fetch(`${API}/coach`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(data.detail || `Coach failed (${response.status})`);
  }
  return response.json();
}
