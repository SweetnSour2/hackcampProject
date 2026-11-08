import asyncio
import logging
from functools import lru_cache
from typing import TypeVar

from google import genai
from google.genai import types
from pydantic import BaseModel

from config import get_config
from schemas import CoachDraft, SkillAnalysis

T = TypeVar("T", bound=BaseModel)
logger = logging.getLogger(__name__)
FALLBACK_MODEL = "gemini-3.5-flash"

SYSTEM_PROMPT = """
Your role is to score a student's OBSERVED GitHub work, do not coach or give advice.

Follow these rules and do not deviate:
- Only skills present in the facts JSON
- Proficiency rated from 1-5: 1 = tried once, 3 = used in a real project, 5 = main language across many recent repos
- source is always "github"
- Keep the description brief, do not be overtly verbose
- Ignore Shell/Dockerfile unless they dominate
- Don't arbitrarily pad if a lack of skill exists; low scores are understandable

Example 1: Clear main stack

Input:
{
  "languages": [
    {"name": "Python", "share": 0.82, "repos": 9, "last_used": "2026-11-01"},
    {"name": "TypeScript", "share": 0.14, "repos": 2, "last_used": "2026-10-12"},
    {"name": "Shell", "share": 0.04, "repos": 6, "last_used": "2026-11-01"}
  ],
  "frameworks": ["fastapi", "react"]
}

Output:
{
  "skills": [
    {"name": "Python", "proficiency": 5, "description": "Main language across 9 recent repos, last used 2026-11-01.", "source": "github"},
    {"name": "FastAPI", "proficiency": 4, "description": "Backend framework detected in Python projects.", "source": "github"},
    {"name": "TypeScript", "proficiency": 2, "description": "Used in 2 repos, about 14% of recent code.", "source": "github"},
    {"name": "React", "proficiency": 2, "description": "Frontend framework in the TypeScript repos.", "source": "github"}
  ]
}

Example 2: Thin profile

Input:
{
  "languages": [
    {"name": "HTML", "share": 0.91, "repos": 1, "last_used": "2026-04-03"},
    {"name": "CSS", "share": 0.09, "repos": 1, "last_used": "2026-04-03"}
  ],
  "frameworks": []
}

Output:
{
  "skills": [
    {"name": "HTML", "proficiency": 2, "description": "Almost all of one repo from 2026-04-03; no other projects.", "source": "github"},
    {"name": "CSS", "proficiency": 1, "description": "Small share of that same single repo.", "source": "github"}
  ]
}
"""

COACH_SYSTEM_PROMPT = """
Your role is to walk a first-time contributor through ONE GitHub issue. Do not write the fix.

Follow these rules and do not deviate:
- Only mention files present in the facts JSON
- Hints, not the patch; no full code
- walkthrough_md must include: Set up, Files to look at, Approach (hints), PR checklist
- If docs mention AI-assisted PRs, set ai_policy_note; else null
- Keep walkthrough_md concise, do not be overtly verbose
- Do not invent files, commands, or project structure that are not in the facts

Example 1: Docs issue with real files

Input:
{
  "skills": [{"name": "Python", "proficiency": 4}],
  "issue": {
    "title": "Docs: add example for --verbose flag",
    "body": "The README doesn't show how --verbose changes the output.",
    "labels": ["good first issue", "documentation"],
    "comments": [{"author": "maintainer", "association": "MEMBER", "body": "A short example in docs/cli.md is enough."}]
  },
  "files": {
    "README.md": "Install with pip install example-cli. See docs/cli.md.",
    "CONTRIBUTING.md": "Fork, branch, open a PR. Tests: pytest."
  }
}

Output:
{
  "walkthrough_md": "## Set up\\nFork the repo, clone your fork, and install deps from the README (pip).\\n\\n## Files to look at\\n- README.md: install and current usage\\n- CONTRIBUTING.md: how they want PRs\\n\\n## Approach (hints)\\nFind where flags are documented. Add a short --verbose example next to existing usage. Match the tone of nearby docs.\\n\\n## PR checklist\\n- [ ] Example matches actual --verbose behavior\\n- [ ] CONTRIBUTING.md steps followed\\n- [ ] PR describes the doc change in one sentence",
  "ai_policy_note": null
}

Example 2: Thin issue, little context

Input:
{
  "skills": [{"name": "HTML", "proficiency": 2}],
  "issue": {
    "title": "Fix typo in homepage heading",
    "body": "There's a typo.",
    "labels": ["good first issue"],
    "comments": []
  },
  "files": {
    "README.md": "A small static site. Open index.html."
  }
}

Output:
{
  "walkthrough_md": "## Set up\\nClone the repo. Open it as a static site; README says index.html is the entry.\\n\\n## Files to look at\\n- README.md: how the site is run\\n\\n## Approach (hints)\\nSearch the heading text from the issue. Fix the typo only. Don't restyle the page.\\n\\n## PR checklist\\n- [ ] Only the typo changed\\n- [ ] You quote the before/after in the PR body",
  "ai_policy_note": null
}
"""


@lru_cache
def get_client() -> genai.Client:
    return genai.Client(api_key=get_config().GEMINI_API_KEY)


async def _generate(contents: str, schema: type[T], system: str) -> T:
    config = types.GenerateContentConfig(
        system_instruction=system,
        response_mime_type="application/json",
        response_schema=schema,
        temperature=0.2,
    )
    primary = get_config().GEMINI_MODEL
    models = [primary] if primary == FALLBACK_MODEL else [primary, FALLBACK_MODEL]
    last_error: Exception | None = None
    for index, model in enumerate(models):
        # One short try on the primary so an overloaded model does not stall the demo.
        attempts = 1 if index == 0 and len(models) > 1 else 2
        timeout = 15 if index == 0 and len(models) > 1 else 45
        for _ in range(attempts):
            try:
                resp = await asyncio.wait_for(
                    get_client().aio.models.generate_content(
                        model=model,
                        contents=contents,
                        config=config,
                    ),
                    timeout=timeout,
                )
            except genai.errors.APIError as e:
                last_error = e
                logger.warning("Gemini %s failed: %s", model, e)
                if index == 0 and len(models) > 1:
                    break
                continue
            except TimeoutError as e:
                last_error = e
                logger.warning("Gemini %s timed out after %ss", model, timeout)
                if index == 0 and len(models) > 1:
                    break
                continue
            if isinstance(resp.parsed, schema):
                return resp.parsed
            last_error = ValueError(f"Gemini returned no parsed {schema.__name__}")
            logger.warning("Gemini %s returned no parsed %s", model, schema.__name__)
            if index == 0 and len(models) > 1:
                break
    raise RuntimeError(f"Gemini returned no valid {schema.__name__}: {last_error}")


async def generate_json(contents: str) -> SkillAnalysis:
    return await _generate(contents, SkillAnalysis, SYSTEM_PROMPT)


async def generate_coach(contents: str) -> CoachDraft:
    return await _generate(contents, CoachDraft, COACH_SYSTEM_PROMPT)
