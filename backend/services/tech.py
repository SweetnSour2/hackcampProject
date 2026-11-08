"""Normalize technology names and detect technologies in project config files.

This module only examines text supplied by the caller. It does not download files
from GitHub or make any network requests.
"""

import json
import re

# Different names that mean the same technology.
ALIASES: dict[str, str] = {
    "ts": "typescript",
    "js": "javascript",
    "golang": "go",
    "c++": "cpp",
    "postgres": "postgresql",
    "spring boot": "spring-boot",
    "reactjs": "react",
    "react.js": "react",
    "nextjs": "next",
    "next.js": "next",
    "vuejs": "vue",
    "vue.js": "vue",
}

# Only technologies on this approved list will be returned by the detector.
# Add or remove names here if your team decides to support more technologies.
KNOWN_TECHNOLOGIES: frozenset[str] = frozenset({
    "react", "next", "vue", "svelte", "angular", "express", "nestjs",
    "fastapi", "django", "flask", "spring-boot", "tailwind",
    "pytorch", "tensorflow", "pandas", "numpy", "scikit-learn",
    "sqlalchemy", "streamlit", "gradio",
})

# Some framework names differ from their actual package names.
PACKAGE_ALIASES: dict[str, str] = {
    "react-dom": "react",
    "tailwindcss": "tailwind",
    "torch": "pytorch",
    "sklearn": "scikit-learn",
    "@angular/core": "angular",
    "@nestjs/core": "nestjs",
    "@sveltejs/kit": "svelte",
    "@tensorflow/tfjs": "tensorflow",
    "djangorestframework": "django",
}

def normalize(name: str) -> str:
    """Convert a name to a consistent lowercase, space-cleaned spelling."""
    if not isinstance(name, str):
        return ""

    cleaned = " ".join(name.lower().split())
    return ALIASES.get(cleaned, cleaned)


def _package_to_technology(package_name: str) -> str:
    """Translate dependency package names into their corresponding technology."""
    name = normalize(package_name)

    # Angular and NestJS publish many packages under these npm namespaces.
    if name.startswith("@angular/"):
        return "angular"
    if name.startswith("@nestjs/"):
        return "nestjs"
    if name.startswith("@tensorflow/"):
        return "tensorflow"

    return normalize(PACKAGE_ALIASES.get(name, name))

def _add_recognized(results: set[str], package_name: str) -> None:
    """Add a standardized name only if it is on the approved list."""
    name = _package_to_technology(package_name)
    if name in KNOWN_TECHNOLOGIES:
        results.add(name)


def _scan_pyproject(text: str, results: set[str]) -> None:
    """Look for known technologies or common package spellings in TOML text."""
    # Simple text search is deliberate: no TOML library is required.
    candidates = KNOWN_TECHNOLOGIES | ALIASES.keys() | PACKAGE_ALIASES.keys()
    for candidate in candidates:
        # Boundaries prevent 'react' matching an unrelated word like 'reactive'.
        pattern = r"(?<![a-z0-9])" + re.escape(candidate) + r"(?![a-z0-9])"
        if re.search(pattern, text, flags=re.IGNORECASE):
            _add_recognized(results, candidate)


def detect_frameworks(file_texts: dict[str, str]) -> list[str]:
    """Return sorted, unique, recognized frameworks from supplied file contents.

    Supported filenames: package.json, requirements.txt, pyproject.toml, pom.xml.
    Empty or malformed files are skipped instead of causing a crash.
    """
    results: set[str] = set()
    if not isinstance(file_texts, dict):
        return []

    for filename, content in file_texts.items():
        if not isinstance(filename, str) or not isinstance(content, str):
            continue
        if not content.strip():
            continue

        # Handle both 'package.json' and paths like 'frontend/package.json'.
        short_name = filename.replace("\\", "/").rsplit("/", 1)[-1].lower()

        try:
            if short_name == "package.json":
                data = json.loads(content)
                if not isinstance(data, dict):
                    continue
                for section in ("dependencies", "devDependencies"):
                    packages = data.get(section, {})
                    if isinstance(packages, dict):
                        for package_name in packages:
                            if isinstance(package_name, str):
                                _add_recognized(results, package_name)

            elif short_name == "requirements.txt":
                for line in content.splitlines():
                    line = line.strip()
                    if not line or line.startswith(("#", "-")):
                        continue
                    # Keep the package name, removing version/extras/markers.
                    # Example: 'fastapi[standard]>=0.110' -> 'fastapi'.
                    match = re.match(r"([a-zA-Z0-9][a-zA-Z0-9._-]*)", line)
                    if match:
                        _add_recognized(results, match.group(1))

            elif short_name == "pyproject.toml":
                _scan_pyproject(content, results)

            elif short_name == "pom.xml":
                # Spring Boot commonly appears as 'spring-boot-starter-*'.
                if re.search(r"(?<![a-z0-9])spring[-_ ]boot(?![a-z0-9])", content,
                             flags=re.IGNORECASE):
                    _add_recognized(results, "spring-boot")

        except Exception:
            # Don't allow one bad file to prevent results from other files.
                continue

    return sorted(results)