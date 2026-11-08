from datetime import datetime

from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, Relationship, SQLModel


class Repo(SQLModel, table=True):
    id: int = Field(sa_column=Column(BigInteger, primary_key=True, autoincrement=False))
    full_name: str = Field(index=True)
    html_url: str
    description: str | None = None
    language: str | None = None
    languages: dict = Field(default_factory=dict, sa_column=Column(JSONB, nullable=False))
    topics: list[str] = Field(default_factory=list, sa_column=Column(JSONB, nullable=False))
    stars: int
    forks: int = 0
    license_key: str | None = None
    default_branch: str
    pushed_at: datetime = Field(sa_column=Column(DateTime(timezone=True), nullable=False))
    fetched_at: datetime = Field(sa_column=Column(DateTime(timezone=True), nullable=False))
    good_first_issue_count: int = 0
    level: str | None = None
    summary: str | None = None

    issues: list["Issue"] = Relationship(back_populates="repo")


class Issue(SQLModel, table=True):
    id: int = Field(sa_column=Column(BigInteger, primary_key=True, autoincrement=False))
    repo_id: int = Field(
        sa_column=Column(BigInteger, ForeignKey("repo.id"), index=True, nullable=False)
    )
    number: int
    title: str
    html_url: str
    labels: list[str] = Field(default_factory=list, sa_column=Column(JSONB, nullable=False))
    comments: int = 0
    body_preview: str = ""
    created_at: datetime = Field(sa_column=Column(DateTime(timezone=True), nullable=False))
    updated_at: datetime = Field(sa_column=Column(DateTime(timezone=True), nullable=False))
    difficulty: str | None = None
    difficulty_reason: str | None = None

    repo: Repo | None = Relationship(back_populates="issues")


class User(SQLModel, table=True):
    github_id: int = Field(sa_column=Column(BigInteger, primary_key=True, autoincrement=False))
    username: str = Field(sa_column=Column(String, unique=True, index=True, nullable=False))
    avatar_url: str
    parsed_resume: dict | None = Field(default=None, sa_column=Column(JSONB, nullable=True))
    skills_updated_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True), nullable=True)
    )

    skills: list["Skill"] = Relationship(back_populates="user")


class Skill(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(
        sa_column=Column(BigInteger, ForeignKey("user.github_id"), index=True, nullable=False)
    )
    name: str
    proficiency: int
    description: str
    source: str  # github | resume | both | user
    edited_by_user: bool = False

    user: User | None = Relationship(back_populates="skills")




class RepoSnapshot(SQLModel, table=True):
    time: datetime = Field(sa_column=Column(DateTime(timezone=True), primary_key=True))
    repo_id: int = Field(sa_column=Column(BigInteger, primary_key=True, autoincrement=False))
    stars: int
    good_first_issue_count: int
    open_issues_count: int


class IssueEvent(SQLModel, table=True):
    time: datetime = Field(sa_column=Column(DateTime(timezone=True), primary_key=True))
    issue_id: int = Field(sa_column=Column(BigInteger, primary_key=True, autoincrement=False))
    event: str = Field(sa_column=Column(String, primary_key=True))  # appeared | picked_up
    repo_id: int = Field(sa_column=Column(BigInteger, index=True, nullable=False))
