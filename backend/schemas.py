from datetime import datetime

from pydantic import BaseModel, Field


class SkillOut(BaseModel):
    name: str
    proficiency: int = Field(ge=1, le=5)
    description: str
    source: str = "github"


class SkillAnalysis(BaseModel):
    skills: list[SkillOut]


class LocationOut(BaseModel):
    name: str
    lat: float
    lng: float
    source: str | None = None


class RepoOut(BaseModel):
    id: int
    full_name: str
    html_url: str
    description: str | None
    language: str | None
    topics: list[str]
    stars: int
    forks: int = 0
    pushed_at: datetime
    location: LocationOut | None = None
    level: str | None = None
    summary: str | None = None


class IssueOut(BaseModel):
    number: int
    title: str
    html_url: str
    labels: list[str]
    comments: int
    created_at: datetime
    body_preview: str = ""


class ScoreBreakdown(BaseModel):
    skill_fit: float
    beginner: float
    activity: float


class ActivityOut(BaseModel):
    new_beginner_issues_24h: int
    beginner_issues_picked_up_7d: int
    stars_gained_7d: int


class MatchOut(BaseModel):
    repo: RepoOut
    activity: ActivityOut | None = None
    score: float
    score_breakdown: ScoreBreakdown
    matched_skills: list[str]
    learn_skills: list[str] = []
    reason: str | None = None
    issues: list[IssueOut]


class UserOut(BaseModel):
    username: str
    avatar_url: str
    skills_updated_at: datetime | None = None


class MatchesResponse(BaseModel):
    user: UserOut
    skills: list[SkillOut]
    matches: list[MatchOut]


class CoachRequest(BaseModel):
    username: str
    repo_full_name: str
    issue_number: int = Field(ge=1)


class CoachDraft(BaseModel):
    walkthrough_md: str
    ai_policy_note: str | None = None


class CoachOut(CoachDraft):
    files_read: list[str]
    tool_calls: int