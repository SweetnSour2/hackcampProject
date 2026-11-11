import asyncio
import base64
from datetime import date, datetime, timedelta, timezone

import httpx

from config import get_config

API_URL = "https://api.github.com"

_client: httpx.AsyncClient | None = None
_sem = asyncio.Semaphore(8)


class GitHubRateLimited(Exception):
    def __init__(self, reset_at: datetime):
        self.reset_at = reset_at
        super().__init__(
            f"GitHub rate limit, resets at {reset_at.strftime('%Y-%m-%dT%H:%M:%SZ')}"
        )


class GitHubNotFound(Exception):
    pass


def open_client() -> None:
    global _client
    _client = httpx.AsyncClient(
        base_url=API_URL,
        timeout=15,
        headers={
            "Authorization": f"Bearer {get_config().GITHUB_ACCESS_TOKEN}",
            "Accept": "application/vnd.github+json",
            "User-Agent": "opensesame-hackcamp",
        },
    )


async def close_client() -> None:
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None


async def _get(path: str, params: dict | None = None, accept: str | None = None) -> httpx.Response:
    if _client is None:
        raise RuntimeError("GitHub client not open; call open_client() first")
    headers = {"Accept": accept} if accept else None
    async with _sem:
        resp = await _client.get(path, params=params, headers=headers)

    if resp.status_code == 404:
        raise GitHubNotFound(path)
    if resp.status_code in (403, 429):
        if resp.headers.get("x-ratelimit-remaining") == "0":
            reset = int(resp.headers.get("x-ratelimit-reset", "0"))
            raise GitHubRateLimited(datetime.fromtimestamp(reset, tz=timezone.utc))
        if "retry-after" in resp.headers:  # secondary rate limit
            wait = int(resp.headers["retry-after"])
            raise GitHubRateLimited(datetime.now(timezone.utc) + timedelta(seconds=wait))
    resp.raise_for_status()
    return resp


async def search_repos(language: str, pushed_after: date, per_page: int = 30) -> list[dict]:
    query = (
        f'language:"{language}" stars:100..20000 pushed:>{pushed_after.isoformat()} '
        "archived:false good-first-issues:>2"
    )
    resp = await _get(
        "/search/repositories",
        {"q": query, "sort": "stars", "order": "desc", "per_page": per_page},
    )
    return resp.json()["items"]


async def get_repo_languages(full_name: str) -> dict[str, int]:
    resp = await _get(f"/repos/{full_name}/languages")
    return resp.json()


async def get_good_first_issues(full_name: str, per_page: int = 30) -> list[dict]:
    resp = await _get(
        f"/repos/{full_name}/issues",
        {
            "state": "open",
            "labels": "good first issue",
            "assignee": "none",
            "sort": "updated",
            "direction": "desc",
            "per_page": per_page,
        },
    )
    return [item for item in resp.json() if "pull_request" not in item]


async def get_user(username: str) -> dict:
    resp = await _get(f"/users/{username}")
    return resp.json()


async def get_user_repos(username: str, limit: int = 20) -> list[dict]:
    resp = await _get(
        f"/users/{username}/repos",
        {"type": "owner", "sort": "pushed", "per_page": 100},
    )
    owned = [repo for repo in resp.json() if not repo.get("fork")]
    return owned[:limit]


async def get_issue(full_name: str, number: int) -> dict:
    resp = await _get(f"/repos/{full_name}/issues/{number}")
    data = resp.json()
    if "pull_request" in data:
        raise GitHubNotFound(f"/repos/{full_name}/issues/{number}")
    return data


async def get_issue_comments(full_name: str, number: int, per_page: int = 20) -> list[dict]:
    resp = await _get(
        f"/repos/{full_name}/issues/{number}/comments",
        {"per_page": per_page},
    )
    return resp.json()


async def get_file_text(full_name: str, path: str) -> str | None:
    try:
        resp = await _get(f"/repos/{full_name}/contents/{path}")
    except GitHubNotFound:
        return None
    data = resp.json()
    if isinstance(data, list) or data.get("type") != "file":
        return None
    encoded = data.get("content")
    if not encoded:
        return None
    return base64.b64decode(encoded).decode("utf-8", errors="replace")


async def get_rate_limit() -> dict:
    resp = await _get("/rate_limit")
    return resp.json()["resources"]
