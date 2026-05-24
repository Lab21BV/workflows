#!/usr/bin/env python3
"""SessionStart hook: fetch the canonical LAB21 architecture page and inject as
additionalContext. Falls back to a short pointer if the URL is unreachable so
the session always starts.
"""

import json
import re
import sys
import urllib.error
import urllib.request

URL = "https://workflows-two.vercel.app/architecture"
TIMEOUT = 8


def emit(context: str) -> None:
    print(
        json.dumps(
            {
                "hookSpecificOutput": {
                    "hookEventName": "SessionStart",
                    "additionalContext": context,
                }
            }
        )
    )


try:
    with urllib.request.urlopen(URL, timeout=TIMEOUT) as response:
        html = response.read().decode("utf-8", errors="replace")
except (urllib.error.URLError, TimeoutError, OSError):
    emit(
        "# LAB21 architecture\n\n"
        f"Could not reach {URL} this session. "
        "The canonical source-of-truth is `app/architecture/page.tsx` in this repo "
        "(workflows-two). Read that file before making architectural decisions "
        "on LAB21 apps."
    )
    sys.exit(0)

html = re.sub(r"<style[^<]*</style>", "", html, flags=re.IGNORECASE)
html = re.sub(r"<script[^<]*</script>", "", html, flags=re.IGNORECASE)
text = re.sub(r"<[^>]+>", " ", html)
for entity, replacement in (
    ("&nbsp;", " "),
    ("&amp;", "&"),
    ("&lt;", "<"),
    ("&gt;", ">"),
    ("&quot;", '"'),
    ("&#x27;", "'"),
    ("&#x2F;", "/"),
    ("&#39;", "'"),
):
    text = text.replace(entity, replacement)
text = re.sub(r"\s+", " ", text).strip()

emit(
    f"# LAB21 architecture (live, fetched from {URL})\n\n"
    "This is the locked-in architecture for the LAB21 ecosystem "
    "(Klantenportal, Aannemersportal, Configurators, LAB21 Operations, Zoho CRM). "
    "Read it before making architectural decisions. "
    "Source-of-truth file: `app/architecture/page.tsx`.\n\n"
    "---\n\n" + text
)
