import asyncio
from collections import defaultdict

from sqlmodel.ext.asyncio.session import AsyncSession

from models import User
from services import github

DEP_FILES = {
    "JavaScript": ["package.json"],
    "TypeScript": ["package.json"],
    "Python": ["requirements.txt", "pyproject.toml"],
    "Java": ["pom.xml"],
    "Go": ["go.mod"],
    "Rust": ["Cargo.toml"],
}


async def get_or_create_user(session: AsyncSession, username: str) -> User:
    data = await github.get_user(username)
    user = await session.get(User, data["id"])
    fields = {"username": data["login"].lower(), "avatar_url": data["avatar_url"]}
    if user is None:
        user = User(github_id=data["id"], **fields)
        session.add(user)
    else:
        for key, value in fields.items():
            setattr(user, key, value)
    await session.commit()
    await session.refresh(user)
    return user


async def _fetch_repo(repo: dict) -> tuple[dict[str, int], str, list[str]]:
    full_name = repo["full_name"]
    paths = DEP_FILES.get(repo.get("language"), [])
    languages, *texts = await asyncio.gather(
        github.get_repo_languages(full_name),
        *(github.get_file_text(full_name, path) for path in paths),
    )
    from services.tech import detect_frameworks

    file_texts = {path: text for path, text in zip(paths, texts) if text}
    return languages, repo.get("pushed_at") or "", detect_frameworks(file_texts)


async def build_github_facts(username: str) -> dict:
    repos = await github.get_user_repos(username)
    fetched = await asyncio.gather(*(_fetch_repo(repo) for repo in repos))

    totals: dict[str, int] = defaultdict(int)
    counts: dict[str, int] = defaultdict(int)
    last_used: dict[str, str] = {}
    frameworks: set[str] = set()

    for languages, pushed, found in fetched:
        day = pushed[:10] if pushed else ""
        frameworks.update(found)
        for lang, nbytes in languages.items():
            totals[lang] += nbytes
            counts[lang] += 1
            if day and day > last_used.get(lang, ""):
                last_used[lang] = day

    grand = sum(totals.values()) or 1
    language_rows = [
        {
            "name": lang,
            "share": round(nbytes / grand, 2),
            "repos": counts[lang],
            "last_used": last_used.get(lang) or None,
        }
        for lang, nbytes in totals.items()
    ]
    language_rows.sort(key=lambda row: row["share"], reverse=True)
    return {"languages": language_rows, "frameworks": sorted(frameworks)}
