import json
from datetime import datetime, timedelta, timezone

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from models import Skill, User
from schemas import SkillOut
from services.gemini import generate_json
from services.profile import build_github_facts

STALE_AFTER = timedelta(days=7)


async def save_skills(session: AsyncSession, user: User, skills: list[SkillOut]) -> None:
    existing = await session.exec(select(Skill).where(Skill.user_id == user.github_id))
    for skill in existing.all():
        await session.delete(skill)
    for item in skills:
        session.add(
            Skill(
                user_id=user.github_id,
                name=item.name,
                proficiency=item.proficiency,
                description=item.description,
                source="github",
            )
        )
    user.skills_updated_at = datetime.now(timezone.utc)
    await session.commit()


async def ensure_skills(
    session: AsyncSession, user: User, force: bool = False
) -> list[Skill]:
    stored = (await session.exec(select(Skill).where(Skill.user_id == user.github_id))).all()
    stale = (
        user.skills_updated_at is None
        or user.skills_updated_at < datetime.now(timezone.utc) - STALE_AFTER
    )
    if not force and stored and not stale:
        return stored

    facts = await build_github_facts(user.username)
    parsed = await generate_json(json.dumps(facts))
    await save_skills(session, user, parsed.skills)
    return (await session.exec(select(Skill).where(Skill.user_id == user.github_id))).all()
