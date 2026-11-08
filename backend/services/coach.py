import json

from sqlmodel.ext.asyncio.session import AsyncSession

from schemas import CoachOut
from services import github
from services.analysis import ensure_skills
from services.gemini import generate_coach
from services.profile import get_or_create_user

DOC_PATHS = [
    "README.md",
    "CONTRIBUTING.md",
    ".github/CONTRIBUTING.md",
    "AGENTS.md",
    ".github/copilot-instructions.md",
]
MAX_FILE = 4000
MAX_BODY = 2000
MAX_COMMENT = 500


def _clip(text: str | None, limit: int) -> str:
    return " ".join((text or "").split())[:limit]


async def get_coach(
    session: AsyncSession, username: str, repo_full_name: str, issue_number: int
) -> CoachOut:
    user = await get_or_create_user(session, username)
    skills = await ensure_skills(session, user)

    tool_calls = 0
    issue = await github.get_issue(repo_full_name, issue_number)
    tool_calls += 1
    comments = await github.get_issue_comments(repo_full_name, issue_number)
    tool_calls += 1

    files: dict[str, str] = {}
    for path in DOC_PATHS:
        text = await github.get_file_text(repo_full_name, path)
        tool_calls += 1
        if text:
            files[path] = text[:MAX_FILE]

    facts = {
        "skills": [{"name": skill.name, "proficiency": skill.proficiency} for skill in skills],
        "issue": {
            "title": issue.get("title") or "",
            "body": _clip(issue.get("body"), MAX_BODY),
            "labels": [label["name"] for label in issue.get("labels") or []],
            "comments": [
                {
                    "author": (comment.get("user") or {}).get("login") or "",
                    "association": comment.get("author_association") or "",
                    "body": _clip(comment.get("body"), MAX_COMMENT),
                }
                for comment in comments[:10]
            ],
        },
        "files": files,
    }
    draft = await generate_coach(json.dumps(facts))
    return CoachOut(
        walkthrough_md=draft.walkthrough_md,
        ai_policy_note=draft.ai_policy_note,
        files_read=list(files),
        tool_calls=tool_calls,
    )
