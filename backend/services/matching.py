from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import selectinload
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from models import Repo, Skill
from schemas import (
    IssueOut,
    MatchOut,
    MatchesResponse,
    RepoOut,
    ScoreBreakdown,
    SkillOut,
    UserOut,
)
from services.activity import ZERO, activity_for_repos, match_reason
from services.analysis import ensure_skills
from services.profile import get_or_create_user
from services.tech import normalize


def repo_tech_weights(repo: Repo) -> dict[str, float]:
    weights: dict[str, float] = {}
    for lang, frac in (repo.languages or {}).items():
        key = normalize(str(lang))
        if key:
            weights[key] = weights.get(key, 0) + float(frac)
    for topic in repo.topics or []:
        key = normalize(str(topic))
        if key:
            weights[key] = weights.get(key, 0) + 0.5
    return weights


def score_repo(skills: list[Skill], repo: Repo) -> tuple[float, ScoreBreakdown, list[str]]:
    weights = repo_tech_weights(repo)
    skill_fit = 0.0
    matched: list[str] = []
    for skill in skills:
        key = normalize(skill.name)
        if key in weights:
            skill_fit += (skill.proficiency / 5) * weights[key]
            matched.append(skill.name)
    skill_fit = min(skill_fit, 1.0)
    beginner = min(repo.good_first_issue_count, 5) / 5

    pushed = repo.pushed_at
    if pushed.tzinfo is None:
        pushed = pushed.replace(tzinfo=timezone.utc)
    age = datetime.now(timezone.utc) - pushed
    if age <= timedelta(days=30):
        activity = 1.0
    elif age <= timedelta(days=90):
        activity = 0.5
    else:
        activity = 0.0

    score = 0.6 * skill_fit + 0.25 * beginner + 0.15 * activity
    return (
        round(score, 2),
        ScoreBreakdown(
            skill_fit=round(skill_fit, 2),
            beginner=round(beginner, 2),
            activity=round(activity, 2),
        ),
        matched,
    )


def learn_skills(repo: Repo, matched: list[str]) -> list[str]:
    taken = {normalize(name) for name in matched}
    out: list[str] = []
    seen: set[str] = set()
    for name in list(repo.languages or {}) + list(repo.topics or []):
        key = normalize(str(name))
        if not key or key in taken or key in seen:
            continue
        seen.add(key)
        out.append(str(name))
        if len(out) == 8:
            break
    return out


def _skill_out(skill: Skill) -> SkillOut:
    return SkillOut(
        name=skill.name,
        proficiency=skill.proficiency,
        description=skill.description,
        source=skill.source,
    )


def _repo_out(repo: Repo) -> RepoOut:
    return RepoOut(
        id=repo.id,
        full_name=repo.full_name,
        html_url=repo.html_url,
        description=repo.description,
        language=repo.language,
        topics=repo.topics or [],
        stars=repo.stars,
        forks=repo.forks,
        pushed_at=repo.pushed_at,
        location=None,
        level=repo.level,
        summary=repo.summary,
    )


def _issue_out(issue) -> IssueOut:
    return IssueOut(
        number=issue.number,
        title=issue.title,
        html_url=issue.html_url,
        labels=issue.labels or [],
        comments=issue.comments,
        created_at=issue.created_at,
        body_preview=issue.body_preview or "",
    )


async def rank_repos(
    session: AsyncSession, skills: list[Skill], limit: int
) -> list[tuple[float, ScoreBreakdown, list[str], Repo]]:
    result = await session.exec(select(Repo).options(selectinload(Repo.issues)))
    ranked: list[tuple[float, ScoreBreakdown, list[str], Repo]] = []
    for repo in result.all():
        score, breakdown, matched = score_repo(skills, repo)
        if score <= 0:
            continue
        ranked.append((score, breakdown, matched, repo))
    ranked.sort(key=lambda row: row[0], reverse=True)
    return ranked[:limit]


async def get_matches(
    session: AsyncSession, username: str, limit: int = 10, reanalyze: bool = False
) -> MatchesResponse:
    user = await get_or_create_user(session, username)
    skills = await ensure_skills(session, user, force=reanalyze)
    ranked = await rank_repos(session, skills, limit)
    activity_map = await activity_for_repos(session, [repo.id for _, _, _, repo in ranked])
    matches = []
    for score, breakdown, matched, repo in ranked:
        activity = activity_map.get(repo.id, ZERO)
        matches.append(
            MatchOut(
                repo=_repo_out(repo),
                activity=activity,
                score=score,
                score_breakdown=breakdown,
                matched_skills=matched,
                learn_skills=learn_skills(repo, matched),
                reason=match_reason(matched, repo, activity),
                issues=[_issue_out(issue) for issue in repo.issues],
            )
        )
    return MatchesResponse(
        user=UserOut(
            username=user.username,
            avatar_url=user.avatar_url,
            skills_updated_at=user.skills_updated_at,
        ),
        skills=[_skill_out(skill) for skill in skills],
        matches=matches,
    )
