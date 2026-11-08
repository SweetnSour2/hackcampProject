import logging
import secrets

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException

from config import get_config
from db.db import async_session
from services.github import GitHubRateLimited
from services.ingest import LANGUAGES, refresh_repos

router = APIRouter()
log = logging.getLogger("uvicorn.error")

_running = False


async def _run_refresh(languages: list[str]) -> dict:
    global _running
    try:
        async with async_session() as session:
            result = await refresh_repos(session, languages)
        log.info("refresh done: %s", result)
        return result
    finally:
        _running = False


async def _run_refresh_logged(languages: list[str]) -> None:
    try:
        await _run_refresh(languages)
    except GitHubRateLimited as e:
        log.warning("refresh stopped: %s", e)
    except Exception:
        log.exception("refresh failed")


@router.post("/refresh")
async def refresh(
    background_tasks: BackgroundTasks,
    x_refresh_secret: str | None = Header(default=None),
    languages: str | None = None,
    wait: bool = False,
):
    
    global _running
    if x_refresh_secret is None or not secrets.compare_digest(
        x_refresh_secret, get_config().REFRESH_SECRET
    ):
        raise HTTPException(status_code=401, detail="Wrong refresh secret")
    if _running:
        raise HTTPException(status_code=409, detail="A refresh is already running")

    chosen = [lang.strip() for lang in languages.split(",") if lang.strip()] if languages else LANGUAGES
    _running = True

    if wait:
        try:
            return await _run_refresh(chosen)
        except GitHubRateLimited as e:
            raise HTTPException(status_code=503, detail=str(e))

    background_tasks.add_task(_run_refresh_logged, chosen)
    return {"status": "started", "languages": chosen}
