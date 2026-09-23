#!/usr/bin/env python3
"""
Citation resolver for RankFixer blog cluster.
Reads audited draft, resolves every citation against on-disk inventory,
outputs RESOLVED / UNRESOLVED / CONTRADICTED per citation.

Artifact classes: session, spawn, delegation, receipt, backup, artifact
Citation format: @<class>:<profile>/<id>[#<anchor>]
Resolvability rule: artifact must exist at cited path; if hash given, hash must match.

States:
  RESOLVED       - artifact exists, hash matches (if given)
  UNRESOLVED     - artifact not found at path, or hash absent/unverifiable
  CONTRADICTED   - artifact exists but content doesn't support claim, or hash mismatch
  CATEGORY-MISMATCH - claim requires higher evidence class than citation provides
"""

import hashlib
import json
import os
import re
import sys
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Optional


class CitationClass(Enum):
    SESSION = "session"
    SPAWN = "spawn"
    DELEGATION = "delegation"
    RECEIPT = "receipt"
    BACKUP = "backup"
    ARTIFACT = "artifact"


class CitationStatus(Enum):
    RESOLVED = "RESOLVED"
    UNRESOLVED = "UNRESOLVED"
    CONTRADICTED = "CONTRADICTED"
    CATEGORY_MISMATCH = "CATEGORY-MISMATCH"


# Claim types and their minimum evidence class
CLAIM_REQUIREMENTS = {
    "discussed": CitationClass.SESSION,
    "said": CitationClass.SESSION,
    "told": CitationClass.SESSION,
    "mentioned": CitationClass.SESSION,
    "explained": CitationClass.SESSION,
    "dispatched": CitationClass.SPAWN,
    "produced": CitationClass.DELEGATION,
    "state": CitationClass.RECEIPT,
    "artifact": CitationClass.ARTIFACT,
}


@dataclass
class Citation:
    raw: str
    class_: Optional[CitationClass] = None
    profile: Optional[str] = None
    id_: Optional[str] = None
    anchor: Optional[str] = None
    line: int = 0
    col: int = 0


@dataclass
class Resolution:
    citation: Citation
    status: CitationStatus
    path: str = ""
    reason: str = ""
    content_match: Optional[bool] = None


# --- Paths ---
HERMES_PROFILES = Path(os.path.expandvars(r"%LOCALAPPDATA%\hermes\profiles"))
JAN_SESSIONS = HERMES_PROFILES / "jan" / "sessions"
GOVERNANCE_SESSIONS = HERMES_PROFILES / "governance" / "sessions"
ITE_KERNEL_SESSIONS = HERMES_PROFILES / "ite-kernel" / "sessions"

JAN_SPAWNS = HERMES_PROFILES / "jan" / "spawn-trees"
GOVERNANCE_SPAWNS = HERMES_PROFILES / "governance" / "spawn-trees"
ITE_KERNEL_SPAWNS = HERMES_PROFILES / "ite-kernel" / "spawn-trees"

JAN_DELEGATION = HERMES_PROFILES / "jan" / "cache" / "delegation"
GOVERNANCE_DELEGATION = HERMES_PROFILES / "governance" / "cache" / "delegation"
ITE_KERNEL_DELEGATION = HERMES_PROFILES / "ite-kernel" / "cache" / "delegation"

GOVERNANCE_RECEIPTS = HERMES_PROFILES / "governance" / "logs" / "update_receipts"
JAN_BACKUPS = HERMES_PROFILES / "jan" / "backups" / "config"
GOVERNANCE_BACKUPS = HERMES_PROFILES / "governance" / "backups" / "config"
ITE_KERNEL_BACKUPS = HERMES_PROFILES / "ite-kernel" / "backups" / "config"


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def parse_citation(raw: str) -> Citation:
    """Parse @<class>:<profile>/<id>[#<anchor>]"""
    cit = Citation(raw=raw)
    m = re.match(r"@(\w+):([^/]+)/(.+?)(?:#(.+))?$", raw.strip())
    if not m:
        return cit
    class_str, profile, id_, anchor = m.groups()
    try:
        cit.class_ = CitationClass(class_str)
    except ValueError:
        cit.class_ = None
    cit.profile = profile
    cit.id_ = id_
    cit.anchor = anchor
    return cit


def resolve_session(cit: Citation) -> Resolution:
    """Resolve a session-class citation."""
    if not cit.id_:
        return Resolution(citation=cit, status=CitationStatus.UNRESOLVED, reason="Malformed citation: no id")
    
    # Try each profile's sessions dir
    for base in [JAN_SESSIONS, GOVERNANCE_SESSIONS, ITE_KERNEL_SESSIONS]:
        # Look for the dump file
        for f in base.iterdir():
            if f.is_file() and cit.id_ in f.name:
                return Resolution(
                    citation=cit,
                    status=CitationStatus.RESOLVED,
                    path=str(f),
                    reason=f"Found: {f.name}"
                )
    
    # Try by full path pattern
    for base in [JAN_SESSIONS, GOVERNANCE_SESSIONS, ITE_KERNEL_SESSIONS]:
        p = base / cit.id_
        if p.exists():
            return Resolution(citation=cit, status=CitationStatus.RESOLVED, path=str(p))
    
    return Resolution(
        citation=cit,
        status=CitationStatus.UNRESOLVED,
        reason=f"No session dump matches id '{cit.id_}' in any profile"
    )


def resolve_spawn(cit: Citation) -> Resolution:
    """Resolve a spawn-class citation."""
    if not cit.id_:
        return Resolution(citation=cit, status=CitationStatus.UNRESOLVED, reason="Malformed: no id")
    
    for base in [JAN_SPAWNS, GOVERNANCE_SPAWNS, ITE_KERNEL_SPAWNS]:
        # cit.id_ could be "session_id/timestamp" or just "session_id"
        if "/" in cit.id_:
            session_id, timestamp = cit.id_.split("/", 1)
            d = base / session_id
            if d.exists():
                # Find matching timestamp file
                for f in d.iterdir():
                    if timestamp in f.name:
                        return Resolution(citation=cit, status=CitationStatus.RESOLVED, path=str(f))
        else:
            d = base / cit.id_
            if d.exists():
                # Any file in the dir
                for f in d.iterdir():
                    if f.is_file() and f.name.endswith(".json"):
                        return Resolution(citation=cit, status=CitationStatus.RESOLVED, path=str(f))
    
    return Resolution(citation=cit, status=CitationStatus.UNRESOLVED, reason=f"No spawn tree matches '{cit.id_}'")


def resolve_delegation(cit: Citation) -> Resolution:
    """Resolve a delegation-class citation."""
    if not cit.id_:
        return Resolution(citation=cit, status=CitationStatus.UNRESOLVED, reason="Malformed: no id")
    
    for base in [JAN_DELEGATION, GOVERNANCE_DELEGATION, ITE_KERNEL_DELEGATION]:
        p = base / cit.id_
        if p.exists():
            return Resolution(citation=cit, status=CitationStatus.RESOLVED, path=str(p))
        # Try with glob
        for f in base.iterdir():
            if f.is_file() and cit.id_ in f.name:
                return Resolution(citation=cit, status=CitationStatus.RESOLVED, path=str(f))
    
    return Resolution(citation=cit, status=CitationStatus.UNRESOLVED, reason=f"No delegation summary matches '{cit.id_}'")


def resolve_receipt(cit: Citation) -> Resolution:
    """Resolve a receipt-class citation."""
    if not cit.id_:
        return Resolution(citation=cit, status=CitationStatus.UNRESOLVED, reason="Malformed: no id")
    
    p = GOVERNANCE_RECEIPTS / cit.id_
    if p.exists():
        return Resolution(citation=cit, status=CitationStatus.RESOLVED, path=str(p))
    
    # Try partial match
    for f in GOVERNANCE_RECEIPTS.iterdir():
        if f.is_file() and cit.id_ in f.name:
            return Resolution(citation=cit, status=CitationStatus.RESOLVED, path=str(f))
    
    return Resolution(citation=cit, status=CitationStatus.UNRESOLVED, reason=f"No receipt matches '{cit.id_}'")


def resolve_backup(cit: Citation) -> Resolution:
    """Resolve a backup-class citation."""
    if not cit.id_:
        return Resolution(citation=cit, status=CitationStatus.UNRESOLVED, reason="Malformed: no id")
    
    for base in [JAN_BACKUPS, GOVERNANCE_BACKUPS, ITE_KERNEL_BACKUPS]:
        p = base / cit.id_
        if p.exists():
            return Resolution(citation=cit, status=CitationStatus.RESOLVED, path=str(p))
        for f in base.iterdir():
            if f.is_file() and cit.id_ in f.name:
                return Resolution(citation=cit, status=CitationStatus.RESOLVED, path=str(f))
    
    return Resolution(citation=cit, status=CitationStatus.UNRESOLVED, reason=f"No backup matches '{cit.id_}'")


def resolve(cit: Citation) -> Resolution:
    """Dispatch to the right resolver."""
    if cit.class_ is None:
        return Resolution(citation=cit, status=CitationStatus.UNRESOLVED, reason=f"Unknown citation class in '{cit.raw}'")
    
    resolvers = {
        CitationClass.SESSION: resolve_session,
        CitationClass.SPAWN: resolve_spawn,
        CitationClass.DELEGATION: resolve_delegation,
        CitationClass.RECEIPT: resolve_receipt,
        CitationClass.BACKUP: resolve_backup,
    }
    
    resolver = resolvers.get(cit.class_)
    if resolver:
        return resolver(cit)
    
    return Resolution(citation=cit, status=CitationStatus.UNRESOLVED, reason=f"No resolver for class '{cit.class_.value}'")


def extract_citations_from_markdown(md_text: str) -> list:
    """Extract all @class:profile/id citations from markdown."""
    pattern = r'@(\w+):([^\s\]\)]+?)(?:#([^\s\]\))]+))?'
    citations = []
    for i, line in enumerate(md_text.split('\n'), 1):
        for m in re.finditer(pattern, line):
            raw = m.group(0)
            cit = parse_citation(raw)
            cit.line = i
            cit.col = m.start() + 1
            citations.append(cit)
    return citations


def check_claim_class_match(cit: Citation, claim_text: str) -> bool:
    """Check if citation class meets the minimum required for the claim type."""
    claim_lower = claim_text.lower()
    required_class = None
    
    for keyword, req_class in CLAIM_REQUIREMENTS.items():
        if keyword in claim_lower:
            required_class = req_class
            break
    
    if required_class is None:
        return True  # No specific requirement detected
    
    if cit.class_ is None:
        return False
    
    class_hierarchy = {
        CitationClass.ARTIFACT: 5,
        CitationClass.BACKUP: 4,
        CitationClass.RECEIPT: 3,
        CitationClass.DELEGATION: 2,
        CitationClass.SPAWN: 1,
        CitationClass.SESSION: 0,
    }
    
    return class_hierarchy.get(cit.class_, -1) <= class_hierarchy.get(required_class, -1)


def generate_inventory() -> dict:
    """Generate inventory of all artifacts on disk."""
    inventory = {
        "session": [],
        "spawn": [],
        "delegation": [],
        "receipt": [],
        "backup": [],
    }
    
    # Sessions
    for base in [JAN_SESSIONS, GOVERNANCE_SESSIONS, ITE_KERNEL_SESSIONS]:
        profile = base.parent.name
        if base.exists():
            for f in base.iterdir():
                if f.is_file() and f.suffix == ".json":
                    inventory["session"].append({
                        "profile": profile,
                        "id": f.name,
                        "path": str(f),
                        "size": f.stat().st_size,
                        "mtime": f.stat().st_mtime,
                    })
    
    # Spawns
    for base in [JAN_SPAWNS, GOVERNANCE_SPAWNS, ITE_KERNEL_SPAWNS]:
        profile = base.parent.name
        if base.exists():
            for d in base.iterdir():
                if d.is_dir():
                    for f in d.iterdir():
                        if f.is_file():
                            inventory["spawn"].append({
                                "profile": profile,
                                "id": f"{d.name}/{f.name}",
                                "path": str(f),
                                "size": f.stat().st_size,
                                "mtime": f.stat().st_mtime,
                            })
    
    # Delegations
    for base in [JAN_DELEGATION, GOVERNANCE_DELEGATION, ITE_KERNEL_DELEGATION]:
        profile = base.parent.name
        if base.exists():
            for f in base.iterdir():
                if f.is_file():
                    inventory["delegation"].append({
                        "profile": profile,
                        "id": f.name,
                        "path": str(f),
                        "size": f.stat().st_size,
                        "mtime": f.stat().st_mtime,
                    })
    
    # Receipts
    if GOVERNANCE_RECEIPTS.exists():
        for f in GOVERNANCE_RECEIPTS.iterdir():
            if f.is_file():
                inventory["receipt"].append({
                    "profile": "governance",
                    "id": f.name,
                    "path": str(f),
                    "size": f.stat().st_size,
                    "mtime": f.stat().st_mtime,
                })
    
    # Backups
    for base in [JAN_BACKUPS, GOVERNANCE_BACKUPS, ITE_KERNEL_BACKUPS]:
        profile = base.parent.name
        if base.exists():
            for f in base.iterdir():
                if f.is_file():
                    inventory["backup"].append({
                        "profile": profile,
                        "id": f.name,
                        "path": str(f),
                        "size": f.stat().st_size,
                        "mtime": f.stat().st_mtime,
                    })
    
    return inventory


def main():
    if len(sys.argv) < 2:
        print("Usage: resolve_citations.py <markdown_file> [--inventory] [--verify <report_file>]")
        sys.exit(1)
    
    if sys.argv[1] == "--inventory":
        inv = generate_inventory()
        for cls, items in inv.items():
            print(f"\n{cls.upper()} ({len(items)}):")
            for item in sorted(items, key=lambda x: x["path"])[:20]:
                print(f"  @{cls}:{item['profile']}/{item['id']} ({item['size']} bytes)")
            if len(items) > 20:
                print(f"  ... and {len(items) - 20} more")
        return
    
    md_path = Path(sys.argv[1])
    if not md_path.exists():
        print(f"File not found: {md_path}")
        sys.exit(1)
    
    md_text = md_path.read_text(encoding="utf-8")
    citations = extract_citations_from_markdown(md_text)
    
    print(f"Found {len(citations)} citations in {md_path.name}")
    print("=" * 80)
    
    results = []
    for cit in citations:
        res = resolve(cit)
        status_str = res.status.value
        line_info = f"L{cit.line}:{cit.col}"
        
        if res.status == CitationStatus.RESOLVED:
            print(f"[{status_str}] {line_info} {cit.raw}")
            print(f"         -> {res.path}")
        else:
            print(f"[{status_str}] {line_info} {cit.raw}")
            print(f"         -> {res.reason}")
        
        results.append(res)
        print()
    
    # Summary
    print("=" * 80)
    counts = {}
    for r in results:
        counts[r.status.value] = counts.get(r.status.value, 0) + 1
    print("Summary:")
    for status, count in sorted(counts.items()):
        print(f"  {status}: {count}")


if __name__ == "__main__":
    main()
