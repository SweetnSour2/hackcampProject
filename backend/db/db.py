from collections.abc import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

import models 
from config import get_config


def _async_url(url: str) -> str:
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            url = "postgresql+asyncpg://" + url[len(prefix):]
    return url.replace("sslmode=", "ssl=")


engine = create_async_engine(_async_url(get_config().DB_URL), pool_pre_ping=True)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session


MIGRATIONS = [
    "ALTER TABLE repo ADD COLUMN IF NOT EXISTS forks INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE repo ADD COLUMN IF NOT EXISTS level VARCHAR",
    "ALTER TABLE repo ADD COLUMN IF NOT EXISTS summary VARCHAR",
    "ALTER TABLE issue ADD COLUMN IF NOT EXISTS body_preview VARCHAR NOT NULL DEFAULT ''",
]

HYPERTABLES = [
    "SELECT create_hypertable('reposnapshot', by_range('time'), if_not_exists => TRUE)",
    "SELECT create_hypertable('issueevent', by_range('time'), if_not_exists => TRUE)",
]

CONTINUOUS_AGGREGATES = [
    """
    CREATE MATERIALIZED VIEW IF NOT EXISTS repo_daily
    WITH (timescaledb.continuous) AS
    SELECT time_bucket('1 day', time) AS day, repo_id,
           max(stars) AS stars,
           avg(good_first_issue_count) AS avg_beginner_issues
    FROM reposnapshot
    GROUP BY day, repo_id
    WITH NO DATA
    """,
    """
    SELECT add_continuous_aggregate_policy('repo_daily',
      start_offset => INTERVAL '7 days', end_offset => INTERVAL '1 hour',
      schedule_interval => INTERVAL '1 hour', if_not_exists => TRUE)
    """,
]


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
        for stmt in MIGRATIONS:
            await conn.execute(text(stmt))
        for stmt in HYPERTABLES:
            await conn.execute(text(stmt))

    
    async with engine.connect() as conn:
        conn = await conn.execution_options(isolation_level="AUTOCOMMIT")
        for stmt in CONTINUOUS_AGGREGATES:
            await conn.execute(text(stmt))
