import asyncio
import time
from datetime import datetime, timedelta, timezone

from sqlmodel import or_, select
from sqlmodel.ext.asyncio.session import AsyncSession

from models import Issue, IssueEvent, Repo, RepoSnapshot
from services import github

LANGUAGES = ["Python", "TypeScript", "JavaScript", "Java", "Go", "Rust", "C++"]


def keep_repo(repo: dict) -> bool:
    return bool(repo.get("license")) and not repo.get("archived") and not repo.get("fork")


def to_fractions(bytes_by_lang: dict[str, int]) -> dict[str, float]:
    total = sum(bytes_by_lang.values())
    if total == 0:
        return {}
    return {lang: round(n / total, 4) for lang, n in bytes_by_lang.items()}


def _parse_time(value: str) -> datetime:
    return datetime.fromisoformat(value)


async def upsert_repo(
    session: AsyncSession, data: dict, languages: dict[str, float], issue_count: int, now: datetime
) -> bool:
    fields = {
        "full_name": data["full_name"],
        "html_url": data["html_url"],
        "description": data.get("description"),
        "language": data.get("language"),
        "languages": languages,
        "topics": data.get("topics") or [],
        "stars": data["stargazers_count"],
        "forks": data.get("forks_count", 0),
        "license_key": (data.get("license") or {}).get("key"),
        "default_branch": data["default_branch"],
        "pushed_at": _parse_time(data["pushed_at"]),
        "fetched_at": now,
        "good_first_issue_count": issue_count,
    }
    repo = await session.get(Repo, data["id"])
    if repo is None:
        session.add(Repo(id=data["id"], **fields))
        return True
    for key, value in fields.items():
        setattr(repo, key, value)
    return False


async def sync_issues(
    session: AsyncSession, repo_id: int, fresh: list[dict], first_run: bool, now: datetime
) -> tuple[int, int]:
    fresh_ids = {item["id"] for item in fresh}
    result = await session.exec(
        select(Issue).where(or_(Issue.repo_id == repo_id, Issue.id.in_(fresh_ids)))
    )
    known = {issue.id: issue for issue in result.all()}

    for item in fresh:
        fields = {
            "repo_id": repo_id,
            "number": item["number"],
            "title": item["title"],
            "html_url": item["html_url"],
            "labels": [label["name"] for label in item.get("labels", [])],
            "comments": item.get("comments", 0),
            "body_preview": " ".join((item.get("body") or "").split())[:300],
            "created_at": _parse_time(item["created_at"]),
            "updated_at": _parse_time(item["updated_at"]),
        }
        issue = known.get(item["id"])
        if issue is None:
            session.add(Issue(id=item["id"], **fields))
            if not first_run:
                session.add(
                    IssueEvent(time=now, repo_id=repo_id, issue_id=item["id"], event="appeared")
                )
        else:
            for key, value in fields.items():
                setattr(issue, key, value)

    removed = 0
    for issue in known.values():
        if issue.repo_id == repo_id and issue.id not in fresh_ids:
            await session.delete(issue)
            session.add(
                IssueEvent(time=now, repo_id=repo_id, issue_id=issue.id, event="picked_up")
            )
            removed += 1

    return len(fresh), removed


async def _fetch(repo: dict) -> tuple[dict, dict[str, int], list[dict]] | None:
    try:
        languages, issues = await asyncio.gather(
            github.get_repo_languages(repo["full_name"]),
            github.get_good_first_issues(repo["full_name"]),
        )
    except github.GitHubNotFound:
        return None
    return repo, languages, issues


async def refresh_repos(session: AsyncSession, languages: list[str]) -> dict:
    start = time.perf_counter()
    now = datetime.now(timezone.utc)
    pushed_after = (now - timedelta(days=90)).date()

    repos_saved = issues_saved = issues_removed = 0
    by_language: dict[str, int] = {}
    seen: set[int] = set()

    for language in languages:
        found = await github.search_repos(language, pushed_after)
        candidates = [
            repo for repo in found if keep_repo(repo) and repo["id"] not in seen
        ]
        fetched = await asyncio.gather(*(_fetch(repo) for repo in candidates))

        saved_here = 0
        for entry in fetched:
            if entry is None:
                continue
            data, lang_bytes, issues = entry
            if not issues:
                continue
            first_run = await upsert_repo(session, data, to_fractions(lang_bytes), len(issues), now)
            saved, removed = await sync_issues(session, data["id"], issues, first_run, now)
            session.add(
                RepoSnapshot(
                    time=now,
                    repo_id=data["id"],
                    stars=data["stargazers_count"],
                    good_first_issue_count=len(issues),
                    open_issues_count=data["open_issues_count"],
                )
            )
            saved_here += 1
            seen.add(data["id"])
            issues_saved += saved
            issues_removed += removed

        await session.commit()
        by_language[language] = saved_here
        repos_saved += saved_here

    return {
        "repos_saved": repos_saved,
        "issues_saved": issues_saved,
        "issues_removed": issues_removed,
        "by_language": by_language,
        "duration_s": round(time.perf_counter() - start, 1),
    }
