from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession

from db.db import get_session
from schemas import CoachOut, CoachRequest
from services.coach import get_coach
from services.github import GitHubNotFound, GitHubRateLimited

router = APIRouter()


@router.post("/coach", response_model=CoachOut)
async def coach(body: CoachRequest, session: AsyncSession = Depends(get_session)):
    try:
        return await get_coach(
            session, body.username, body.repo_full_name, body.issue_number
        )
    except GitHubNotFound:
        raise HTTPException(status_code=404, detail="GitHub user, repo, or issue not found")
    except GitHubRateLimited as e:
        raise HTTPException(status_code=503, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail="Coach is unavailable, try again shortly") from e
