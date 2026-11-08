from collections import defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy import and_, case, func
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from models import IssueEvent, Repo, RepoSnapshot
from schemas import ActivityOut

ZERO = ActivityOut(
    new_beginner_issues_24h=0,
    beginner_issues_picked_up_7d=0,
    stars_gained_7d=0,
)


async def activity_for_repos(
    session: AsyncSession, repo_ids: list[int]
) -> dict[int, ActivityOut]:
    if not repo_ids:
        return {}

    now = datetime.now(timezone.utc)
    since_24h = now - timedelta(hours=24)
    since_7d = now - timedelta(days=7)

    event_rows = (
        await session.exec(
            select(
                IssueEvent.repo_id,
                func.coalesce(
                    func.sum(
                        case(
                            (
                                and_(
                                    IssueEvent.event == "appeared",
                                    IssueEvent.time >= since_24h,
                                ),
                                1,
                            ),
                            else_=0,
                        )
                    ),
                    0,
                ),
                func.coalesce(
                    func.sum(
                        case(
                            (
                                and_(
                                    IssueEvent.event == "picked_up",
                                    IssueEvent.time >= since_7d,
                                ),
                                1,
                            ),
                            else_=0,
                        )
                    ),
                    0,
                ),
            )
            .where(IssueEvent.repo_id.in_(repo_ids), IssueEvent.time >= since_7d)
            .group_by(IssueEvent.repo_id)
        )
    ).all()

    appeared: dict[int, int] = {}
    picked: dict[int, int] = {}
    for repo_id, new_24h, picked_7d in event_rows:
        appeared[repo_id] = int(new_24h)
        picked[repo_id] = int(picked_7d)

    snap_rows = (
        await session.exec(
            select(RepoSnapshot.repo_id, RepoSnapshot.time, RepoSnapshot.stars).where(
                RepoSnapshot.repo_id.in_(repo_ids),
                RepoSnapshot.time >= since_7d,
            )
        )
    ).all()
    by_repo: dict[int, list[tuple[datetime, int]]] = defaultdict(list)
    for repo_id, time, stars in snap_rows:
        by_repo[repo_id].append((time, stars))

    out: dict[int, ActivityOut] = {}
    for repo_id in repo_ids:
        series = sorted(by_repo.get(repo_id, []), key=lambda row: row[0])
        gained = 0
        if len(series) >= 2:
            gained = max(0, series[-1][1] - series[0][1])
        out[repo_id] = ActivityOut(
            new_beginner_issues_24h=appeared.get(repo_id, 0),
            beginner_issues_picked_up_7d=picked.get(repo_id, 0),
            stars_gained_7d=gained,
        )
    return out


def match_reason(matched: list[str], repo: Repo, activity: ActivityOut) -> str:
    skill = matched[0] if matched else (repo.language or "this stack")
    parts = [f"Uses {skill}"]
    if repo.good_first_issue_count:
        parts.append(f"{repo.good_first_issue_count} open beginner issues")
    if activity.beginner_issues_picked_up_7d:
        parts.append(f"{activity.beginner_issues_picked_up_7d} picked up in 7d")
    elif activity.new_beginner_issues_24h:
        parts.append(f"{activity.new_beginner_issues_24h} new beginner issues in 24h")
    elif activity.stars_gained_7d:
        parts.append(f"+{activity.stars_gained_7d} stars this week")
    return ", ".join(parts) + "."
