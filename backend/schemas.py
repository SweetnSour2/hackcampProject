from pydantic import BaseModel, Field

class SkillOut(BaseModel):
    name: str
    proficiency: int = Field(ge=1, le=5)
    description: str
    source: str = "github"

class SkillAnalysis(BaseModel):
    skills: list[SkillOut]