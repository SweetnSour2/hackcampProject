from functools import lru_cache

from google import genai
from google.genai import types

from config import get_config
from schemas import SkillAnalysis

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


@lru_cache
def get_client() -> genai.Client:
    return genai.Client(api_key=get_config().GEMINI_API_KEY)


async def generate_json(contents: str) -> SkillAnalysis:
    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_PROMPT,
        response_mime_type="application/json",
        response_schema=SkillAnalysis,
        temperature=0.2,
    )
    last_error: Exception | None = None
    for _ in range(2):
        try:
            resp = await get_client().aio.models.generate_content(
                model=get_config().GEMINI_MODEL,
                contents=contents,
                config=config,
            )
        except genai.errors.APIError as e:
            last_error = e
            continue
        if isinstance(resp.parsed, SkillAnalysis):
            return resp.parsed
        last_error = ValueError("Gemini returned no parsed SkillAnalysis")
    raise RuntimeError(f"Gemini returned no valid SkillAnalysis: {last_error}")
