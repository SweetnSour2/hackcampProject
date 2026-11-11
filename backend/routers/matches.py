from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel.ext.asyncio.session import AsyncSession

from db.db import get_session
from schemas import MatchesResponse
from services.github import GitHubNotFound, GitHubRateLimited
from services.matching import get_matches

router = APIRouter()


@router.get("/matches/{username}", response_model=MatchesResponse)
async def matches(
    username: str,
    limit: int = Query(default=10, ge=1, le=25),
    reanalyze: bool = False,
    session: AsyncSession = Depends(get_session),
):
    try:
        return await get_matches(session, username, limit=limit, reanalyze=reanalyze)
    except GitHubNotFound:
        raise HTTPException(status_code=404, detail="GitHub user not found")
    except GitHubRateLimited as e:
        raise HTTPException(status_code=503, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
