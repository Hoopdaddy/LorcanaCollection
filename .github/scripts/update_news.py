#!/usr/bin/env python3
"""
update_news.py
Calls the Anthropic API to generate current Disney Lorcana news summaries,
then replaces the news-grid block in index.html between marker comments.

Markers expected in index.html:
    <!-- NEWS-GRID-START -->
    ...existing news grid HTML...
    <!-- NEWS-GRID-END -->
"""

import json
import re
import sys
from datetime import datetime, timezone

import anthropic


# ── Config ────────────────────────────────────────────────────────────────────

INDEX_PATH   = "index.html"
MARKER_START = "<!-- NEWS-GRID-START -->"
MARKER_END   = "<!-- NEWS-GRID-END -->"
MODEL        = "claude-3-5-haiku-20241022"


# ── Helpers ───────────────────────────────────────────────────────────────────

def today_label() -> str:
    now = datetime.now(timezone.utc)
    return f"{now.strftime('%B')} {now.day}, {now.year}"


def esc(s: str) -> str:
    """Minimal HTML escaping."""
    return (str(s)
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;"))


# ── Fetch news from Claude ─────────────────────────────────────────────────────

def fetch_news(today: str) -> list[dict]:
    """Return 3 plausible Lorcana news items as a list of dicts."""
    client = anthropic.Anthropic()

    prompt = f"""Today is {today}. You are maintaining the news section of a Disney Lorcana fan site called The Lore Vault.

Provide exactly 3 realistic Disney Lorcana news items that are plausible as of {today}.
Base them on Lorcana's real release cadence, tournament calendar, and ongoing products.

Return ONLY a valid JSON array — no markdown fences, no explanation — shaped exactly like this:
[
  {{
    "source": "Official Lorcana",
    "title": "Specific, realistic headline",
    "date": "Month D, YYYY"
  }},
  {{
    "source": "Ravensburger",
    "title": "Another realistic headline",
    "date": "Month D, YYYY"
  }},
  {{
    "source": "Lorcana HQ",
    "title": "A third realistic headline",
    "date": "Month D, YYYY"
  }}
]

Rules:
- Item 0 is the featured/lead story (most prominent).
- Allowed sources: Official Lorcana · Ravensburger · Lorcana HQ · Tournament Report · Community News
- All three dates must fall within the last 4 days of {today}.
- Headlines must sound specific — reference real card names, set names, or event names where possible.
- Do NOT invent card names you are not confident about; use set names or event types instead."""

    response = client.messages.create(
        model=MODEL,
        max_tokens=600,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = response.content[0].text.strip()

    # Extract JSON array even if there is stray surrounding text
    match = re.search(r"\[.*\]", raw, re.DOTALL)
    if not match:
        raise ValueError(f"No JSON array found in Claude response:\n{raw}")

    articles = json.loads(match.group())
    if not isinstance(articles, list) or len(articles) < 1:
        raise ValueError(f"Expected a non-empty JSON array, got: {articles!r}")

    return articles[:3]


# ── Build replacement HTML ─────────────────────────────────────────────────────

def build_news_grid(articles: list[dict]) -> str:
    featured = articles[0]
    side     = articles[1:3]

    featured_html = (
        f'      <!-- Featured -->\n'
        f'      <a href="#" class="news-card news-card--featured" aria-label="Featured news article">\n'
        f'        <div class="news-card__image"></div>\n'
        f'        <div class="news-card__body">\n'
        f'          <div class="news-card__source">{esc(featured.get("source", "Official Lorcana"))}</div>\n'
        f'          <div class="news-card__title">{esc(featured.get("title", ""))}</div>\n'
        f'          <div class="news-card__date">{esc(featured.get("date", ""))}</div>\n'
        f'          <div class="news-card__link">Read Article →</div>\n'
        f'        </div>\n'
        f'      </a>'
    )

    side_cards = []
    for art in side:
        title = esc(art.get("title", ""))
        side_cards.append(
            f'        <a href="#" class="news-card" aria-label="News: {title}">\n'
            f'          <div class="news-card__image news-card--small"></div>\n'
            f'          <div class="news-card__body">\n'
            f'            <div class="news-card__source">{esc(art.get("source", "Ravensburger"))}</div>\n'
            f'            <div class="news-card__title">{title}</div>\n'
            f'            <div class="news-card__date">{esc(art.get("date", ""))}</div>\n'
            f'          </div>\n'
            f'        </a>'
        )

    side_html = "\n".join(side_cards)

    return (
        f'    <div class="news-grid">\n'
        f'{featured_html}\n\n'
        f'      <!-- Side cards -->\n'
        f'      <div class="news-grid__side">\n'
        f'{side_html}\n'
        f'      </div>\n'
        f'    </div>'
    )


# ── Patch index.html ──────────────────────────────────────────────────────────

def patch_index(articles: list[dict]) -> bool:
    """Replace the marked news-grid block. Returns True if the file changed."""
    with open(INDEX_PATH, encoding="utf-8") as f:
        html = f.read()

    if MARKER_START not in html or MARKER_END not in html:
        print(f"ERROR: markers not found in {INDEX_PATH}. "
              f"Add <!-- NEWS-GRID-START --> / <!-- NEWS-GRID-END --> around the news grid.")
        return False

    new_block = f"{MARKER_START}\n{build_news_grid(articles)}\n    {MARKER_END}"

    new_html = re.sub(
        rf"{re.escape(MARKER_START)}.*?{re.escape(MARKER_END)}",
        new_block,
        html,
        flags=re.DOTALL,
    )

    if new_html == html:
        print("Generated content is identical to existing content — no write needed.")
        return False

    with open(INDEX_PATH, "w", encoding="utf-8") as f:
        f.write(new_html)
    return True


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    today = today_label()
    print(f"Fetching Lorcana news for {today} …")

    try:
        articles = fetch_news(today)
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)

    print(f"Received {len(articles)} article(s):")
    for a in articles:
        print(f"  [{a.get('source', '?')}] {a.get('title', '?')} — {a.get('date', '?')}")

    changed = patch_index(articles)
    print("index.html updated." if changed else "index.html unchanged.")
