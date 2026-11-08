from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db.db import init_db
from routers import health, matches, refresh
from services import github


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    github.open_client()
    yield
    await github.close_client()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(refresh.router)
app.include_router(matches.router)
