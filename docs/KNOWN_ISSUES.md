# Known issues

Open issues are `## ` headings. Append `(resolved)` to the heading when fixed.

Entry format (copy this block, do not use a `## ` heading for the template):

    ## <title>
    Task: <task number>
    Symptom: <what goes wrong>
    Tried: <what was attempted>
    Status: <open | blocked | resolved>

## Mobile tour stop: subtitles dock covers the focused planet
Task: 28 (carried over from 26)
Symptom: on a phone during a tour stop the dock (unmute hint, subtitles, tour controls, about 190 px) fills most of the 50 dvh above the peek sheet, so the planet (centred at about 27 % of the height, about 190 px wide) is almost fully covered (see `docs/screenshots/iphone13-tour-subtitle.png`, Venus). Non-tour focus views are fine.
Tried: analysed `focusScreenOffset` (y 0.45) and the CSS dock; a larger offset alone cannot help because the free band above the dock is only about 40-100 px. A real fix needs a tour-aware mobile layout (shorter peek sheet during the tour, compact subtitles, tour-specific smaller `fill` and offset passed to the rig), which is more than the 30 min budget and needs several screenshot rounds.
Status: open

## Milky Way band not visible in the sky
Task: 28
Symptom: the overview and focus screenshots show a starfield with only a faint cloud texture; no clear Milky Way band.
Tried: reviewed screenshots only (sky brightness is a tuning change, not a quick fix).
Status: open

## Overview labels overlap near the Sun
Task: 28
Symptom: in the overview the Mercury, Venus, Earth and Moon labels (and "The Sun" on mobile) overlap around the Sun; they are not readable until the user zooms in.
Tried: not attempted (needs label collision logic).
Status: open

## Overview planets are only 1-2 px dots
Task: 28
Symptom: at overview (desktop 1280x720 and iPhone 13) every planet is a 1-2 px dot on a thin orbit ring; textures and sizes are not discernible, so the "beautiful, easy to see everything" overview goal is not met (see `docs/screenshots/desktop-overview.png`). Only the Sun and the labels are visible.
Tried: reviewed screenshots only (needs a larger overview display size for bodies or a closer overview camera).
Status: open
