export type Difficulty = "Beginner" | "Intermediate" | "Advanced";

export type Repository = {
  id: string;
  name: string;
  owner: string;
  description: string;
  language: string;
  match: number;
  difficulty: Difficulty;
  stars: string;
  forks: string;
  activity: string;
  topic: string;
  contribution: string;
  lat: number;
  lng: number;
  location: string;
  locationSource: string;
  color: string;
  why: string;
  skills: string[];
  learn: string[];
  summary: string;
  github: string;
  issues: Array<{
    number: number;
    title: string;
    labels: string[];
    difficulty: Difficulty;
    skills: string[];
    summary: string;
  }>;
};

export const repositories: Repository[] = [
  {
    id: "cal",
    name: "cal.com",
    owner: "calcom",
    description: "Scheduling infrastructure for absolutely everyone.",
    language: "TypeScript",
    match: 96,
    difficulty: "Intermediate",
    stars: "36.8k",
    forks: "8.6k",
    activity: "Active today",
    topic: "Developer tools",
    contribution: "Code",
    lat: 52.52,
    lng: 13.405,
    location: "Berlin, Germany",
    locationSource: "Public organization profile",
    color: "#64F0BD",
    why: "Strong alignment with your React, TypeScript, and product engineering experience.",
    skills: ["React", "TypeScript", "Next.js", "Tailwind"],
    learn: ["Playwright", "tRPC"],
    summary:
      "Cal.com is an open scheduling platform that gives individuals and teams control over booking infrastructure, workflows, and integrations.",
    github: "https://github.com/calcom/cal.com",
    issues: [
      {
        number: 21244,
        title: "Improve keyboard navigation in availability editor",
        labels: ["good first issue", "accessibility"],
        difficulty: "Beginner",
        skills: ["React", "Accessibility"],
        summary:
          "Add predictable focus movement and visible focus states to the weekly availability grid.",
      },
      {
        number: 21189,
        title: "Add regression tests for recurring bookings",
        labels: ["tests", "help wanted"],
        difficulty: "Intermediate",
        skills: ["TypeScript", "Playwright"],
        summary: "Extend end-to-end coverage around recurring booking edge cases.",
      },
    ],
  },
  {
    id: "appwrite",
    name: "appwrite",
    owner: "appwrite",
    description: "A complete backend platform for developing modern applications.",
    language: "TypeScript",
    match: 92,
    difficulty: "Intermediate",
    stars: "51.2k",
    forks: "4.4k",
    activity: "Active 2h ago",
    topic: "Backend",
    contribution: "Documentation",
    lat: 32.0853,
    lng: 34.7818,
    location: "Tel Aviv, Israel",
    locationSource: "Public organization profile",
    color: "#64F0BD",
    why: "Your API fundamentals and TypeScript experience map directly to the SDK and documentation surface.",
    skills: ["TypeScript", "REST APIs", "Docker"],
    learn: ["Deno", "OpenAPI"],
    summary:
      "Appwrite provides authentication, databases, storage, functions, and messaging through a self-hostable developer platform.",
    github: "https://github.com/appwrite/appwrite",
    issues: [
      {
        number: 7712,
        title: "Clarify function runtime environment variables",
        labels: ["documentation", "good first issue"],
        difficulty: "Beginner",
        skills: ["Technical writing", "REST APIs"],
        summary: "Improve examples and clarify when runtime variables become available.",
      },
    ],
  },
  {
    id: "mattermost",
    name: "mattermost",
    owner: "mattermost",
    description: "Secure collaboration for technical and operational teams.",
    language: "Go",
    match: 87,
    difficulty: "Intermediate",
    stars: "33.7k",
    forks: "7.5k",
    activity: "Active today",
    topic: "Collaboration",
    contribution: "Code",
    lat: 37.7749,
    lng: -122.4194,
    location: "San Francisco, USA",
    locationSource: "Public organization profile",
    color: "#30BFA0",
    why: "The React client fits your frontend background; Go would be a useful adjacent skill.",
    skills: ["React", "TypeScript", "Redux"],
    learn: ["Go", "WebSockets"],
    summary:
      "Mattermost is a secure, extensible collaboration platform used by technical teams with complex operational workflows.",
    github: "https://github.com/mattermost/mattermost",
    issues: [
      {
        number: 29410,
        title: "Add empty state to channel bookmarks",
        labels: ["good first issue", "frontend"],
        difficulty: "Beginner",
        skills: ["React", "CSS"],
        summary: "Design and implement an accessible empty state for channels without bookmarks.",
      },
    ],
  },
  {
    id: "directus",
    name: "directus",
    owner: "directus",
    description: "The flexible backend for all your projects.",
    language: "TypeScript",
    match: 84,
    difficulty: "Intermediate",
    stars: "32.1k",
    forks: "4.1k",
    activity: "Active 1d ago",
    topic: "Backend",
    contribution: "Code",
    lat: 50.8503,
    lng: 4.3517,
    location: "Brussels, Belgium",
    locationSource: "Public organization profile",
    color: "#30BFA0",
    why: "Your component and API experience is relevant to the modular studio interface.",
    skills: ["Vue", "TypeScript", "Node.js"],
    learn: ["Vue", "PostgreSQL"],
    summary:
      "Directus layers a real-time API and no-code data studio on top of SQL databases without changing the underlying schema.",
    github: "https://github.com/directus/directus",
    issues: [
      {
        number: 23550,
        title: "Improve copy action feedback in data studio",
        labels: ["ux", "frontend"],
        difficulty: "Beginner",
        skills: ["Vue", "TypeScript"],
        summary: "Add accessible confirmation feedback when field values are copied.",
      },
    ],
  },
  {
    id: "hoppscotch",
    name: "hoppscotch",
    owner: "hoppscotch",
    description: "Open-source API development ecosystem.",
    language: "Vue",
    match: 78,
    difficulty: "Beginner",
    stars: "75.4k",
    forks: "5.2k",
    activity: "Active 3h ago",
    topic: "Developer tools",
    contribution: "Design",
    lat: 10.8505,
    lng: 76.2711,
    location: "Kerala, India",
    locationSource: "Public maintainer profile",
    color: "#55717A",
    why: "API tooling matches your interests, with a manageable path into Vue.",
    skills: ["REST APIs", "CSS", "JavaScript"],
    learn: ["Vue", "GraphQL"],
    summary:
      "Hoppscotch is a lightweight API development suite for REST, GraphQL, WebSocket, and real-time protocols.",
    github: "https://github.com/hoppscotch/hoppscotch",
    issues: [
      {
        number: 4498,
        title: "Improve environment variable search",
        labels: ["good first issue", "ui"],
        difficulty: "Beginner",
        skills: ["Vue", "JavaScript"],
        summary: "Make variable search tolerant of spaces and mixed-case queries.",
      },
    ],
  },
  {
    id: "refine",
    name: "refine",
    owner: "refinedev",
    description: "A React framework for enterprise web applications.",
    language: "TypeScript",
    match: 75,
    difficulty: "Intermediate",
    stars: "32.6k",
    forks: "2.5k",
    activity: "Active 2d ago",
    topic: "Framework",
    contribution: "Documentation",
    lat: 41.0082,
    lng: 28.9784,
    location: "Istanbul, Türkiye",
    locationSource: "Public organization profile",
    color: "#55717A",
    why: "Direct React relevance, though framework internals add some complexity.",
    skills: ["React", "TypeScript", "TanStack Query"],
    learn: ["Monorepos", "Package APIs"],
    summary:
      "Refine is a headless React meta-framework for building data-heavy admin panels and internal tools.",
    github: "https://github.com/refinedev/refine",
    issues: [
      {
        number: 6481,
        title: "Add validation example to form documentation",
        labels: ["documentation"],
        difficulty: "Beginner",
        skills: ["React", "Technical writing"],
        summary: "Document a practical schema-validation flow in the forms guide.",
      },
    ],
  },
];

export const languages = ["All languages", "TypeScript", "Go", "Vue"];
export const topics = ["All topics", "Developer tools", "Backend", "Collaboration", "Framework"];
