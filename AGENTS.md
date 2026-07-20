# Portfolio Website Agent Guide

This repository is a dependency-free static portfolio site. Keep changes close to the Figma design and to the existing file patterns. Do not introduce React, Bootstrap, component libraries, or build tooling unless Parviz explicitly asks for that.

## Project Map

- `index.html` is the active main page and also contains the active SPA bio route markup.
- `/bio` is currently served by `index.html` through `server.js` fallback routing. `bio.html` exists as a separate bio file/reference, but do not assume it is the active `/bio` page unless routing is changed.
- `contact.html` is the standalone contact page at `/contact`.
- `unibank.html` is the reference work/project case-study page at `/unibank`.
- `bmmb.html` is the Behance-import reference case-study page at `/bmmb`.
- `styles.css` is the shared stylesheet for all pages.
- `script.js` is the main shared script for the main page and SPA bio route.
- `standalone-nav.js` is shared by standalone pages so links to `/bio` can trigger the bio hero-photo entry animation.
- `contact.js` and `unibank.js` contain page-specific behavior only.
- `server.js` is the local static server. The site must open at `http://localhost:3000`.
- `assets/` stores local exported assets. Prefer local `.webp` for raster images and `.svg` for vector icons/logos.
- `fonts/` stores local font files. The site uses Aeonik Pro variable font and Editorial New.

## Design Fidelity Rules

- Figma is the source of truth. Preserve layout, hierarchy, spacing, margins, paddings, typography, colors, radii, stroke weights, shadows, image crops, and hover states.
- Do not simplify or redesign based on personal taste.
- Keep the desktop-first 1920px composition and the existing `--page-scale` approach unless asked otherwise.
- Use the existing tokens in `styles.css` first:
  - `--background-black: #0A0C0F`
  - `--black: #000000`
  - `--white: #ffffff`
  - `--grey: #777d83`
  - `--light-grey: #B3B8BE`
  - `--blue: #76b9ef`
  - `--figma-ease: cubic-bezier(0.5, 0, 0.5, 1)`
- Use existing fonts and font weights. Do not substitute fonts.
- Use Figma-provided assets. Do not replace them with random stock images, generic icons, or premade components.

## Work Page References

Use two references for future work/project and Behance case-study pages:

- `unibank.html` is the primary reference for the general work/project page system: intro area, typography, role/project type/brand description styling, section titles, written content styling, header/nav style, and standalone page behavior.
- `bmmb.html` is the primary reference for Behance-imported case flow and media-stack behavior.
- New Behance-style case pages should use the flow-based `case-*` structure from `bmmb.html`, `orkestra.html`, and `aerosure.html` for the body sequence after the intro. Use margins, gaps, `case-stack`, `case-copy`, and `case-pair-grid` so longer text automatically pushes later content down. Avoid fixed vertical `top` chains for ordinary case media/text stacks.

### Next Project Blocks

- `orkestra.html` is the current reference for the approved source-page `WHAT'S NEXT?` block, and `bmmb.html` is the reference for the destination-owned preview template.
- Future work pages should replace `SCROLL TO TOP` endings with the Next Project block unless Parviz explicitly asks for a different ending.
- The Next Project destination must resolve dynamically and live from direct `.works-source > .project-card` children in `index.html`. Never hardcode work-to-work relationships; when Parviz changes the work order on the main page, every Next Project block must automatically follow the new grid order.
- Every destination page that can appear in a Next Project block must expose `template[data-next-project-preview]` with `data-intro-selector`, `data-media-selector`, and optional `data-preview-class`. The source page owns only the generic container and fallback markup.
- The preview inside a Next Project block must preserve the real structure of the destination page. Keep that page's intro composition, project type position, role block, description, first-media layout, media count, image crop, and internal spacing instead of shifting or restyling the destination preview to fit the source page.
- Every source page using this pattern must include `.next-project-panel[data-next-project]`, `.next-project-link[data-next-project-link]`, `.next-project-preview-host[data-next-project-preview-host]`, `.next-project-cursor[data-next-project-cursor]`, and `/next-project.js`.
- Keep the bottom-scroll composition of every Next Project block aligned with the approved Orkestra reference: when the user reaches the end of a case, the distance between the fixed navbar and the top of the Next Project experience should visually match `orkestra.html`.
- When tuning how much of the destination media is visible in the Next Project block, adjust the source block length or preview viewport height first. Do not move, crop, stretch, or reposition the destination page's own media/intro structure just to fill the block; the media length should be chosen so the destination structure stays faithful while the navbar distance still matches the Orkestra reference.
- Keep the approved interaction: show `WHAT'S NEXT?`, use a two-line title-case `Next Project` hover cursor, match the contact-page bubble size, keep the cursor above all page content without clipping, and animate the transition only on the y-axis for `1000ms` with `cubic-bezier(0.5, 0, 0.5, 1)`.
- Keep rendering stable during handoff: load `scale-init.js` and font preloads before `styles.css`, avoid first-frame scale/font flashes, and keep work pages standalone instead of converting them into SPA routes for this pattern.
- Prevent image flicker during the URL handoff by following the approved Orkestra -> BMMB fix on every destination page used by Next Project: preload the first visible preview media in `<head>` with `rel="preload"`, the correct `as`/`type`, and `fetchpriority="high"`, then render that same real page media with `loading="eager"`, `decoding="sync"`, and `fetchpriority="high"`. Apply this only to the media needed for the first visible destination frame, especially when the preview block shows that same image before navigation; do not delay the URL change until the whole page loads, hide the destination page after navigation, or replace the destination's real first media with a separate preview-only image.

## Main Page Works Grid

- The main-page works grid in `index.html` is laid out automatically by `layoutWorksGrid()` in `script.js`; do not manually reposition individual work cards for normal add/remove operations.
- Keep each work as a direct `.project-card` child of `.works-source`. The script clones the source list and applies the same computed positions to the loop clone.
- The grid uses the existing Figma stagger rhythm: left column at `0px`, right column at `945px`, right cards `328px` lower than their left-pair card, and each new pair starts `1144px` lower.
- If the number of works is odd, the final unpaired card is centered at `472px`, like the previous standalone TalkToCanada card.
- If the number of works is even, the final two works remain a normal staggered pair, with the second-to-last on the left and the last on the right.
- The script also recalculates `--works-height` and `--loop-distance`; keep those values dynamic so the infinite main-page scroll loop stays correct after adding or removing works.

When creating a new work/project/case-study page, match the Unibank page patterns for:

- Header/nav visual style and positions.
- Photo and video corner radius, usually `10px`.
- Brand name: first large white text, position, size, font size, font weight, and color.
- Project type: right side of the brand name, position, size, font size, font weight, and grey color.
- Role block: label, position, font size, weight, line height, and color.
- Brand description under the brand name: position, width, size, weight, line height, and grey color.
- After the brand description, the first project/case visual block must start with a `100px` vertical gap from the bottom of the brand description text block. Apply this rule consistently to all work/project pages.
- Section titles: large white titles, same size, weight, position logic, and spacing.
- General written content: use the same size, font size, font weight, line height, and color as Unibank written content, excluding the special teaser labels `Your Desires #YourChoice`, `Your Needs #YourChoice`, `Your Comfort #YourChoice`, and `Your Time #YourChoice`.
- Media embeds: keep the Figma dimensions and crop/radius. Load third-party player scripts once per page.

For future Behance-imported cases, also match the BMMB page patterns for:

- Set spacing between consecutive media blocks to `0` when the case design requires a continuous media stack.
- Use BMMB radius logic for stacked media: first relevant media can keep top radii, middle media should have square corners, final media can keep bottom radii; when a media item is standalone, with written content before and after it, keep radii on all four corners.
- When two visuals sit in the same row in a Behance-imported case, follow the Orkestra paired-visual rule: use the same gutter as the four orange visuals in Unibank's Teaser Campaign section (`52px`) between the two visuals, apply the same `52px` spacing above and below the paired block when it is separated from surrounding media, and use the branded `10px` radius on all four corners of each paired visual.
- Decimal-numbered files with the same integer prefix, such as `2.1` and `2.2` or `8.1` and `8.2`, should be placed in the same row using the Orkestra paired-visual rule unless Parviz explicitly says that specific decimal-numbered media should be stacked or treated differently.
- For continuous Behance-style media stacks, use the zero-gap `continuous-case-strip` system:
  - Wrap joined vertical media in `<div class="case-stack continuous-case-strip">`.
  - The strip parent owns the full `1820px` width, background, radius clipping, `gap: 0`, `font-size: 0`, and `line-height: 0`.
  - Every joined `.case-media` child must have `margin: 0`, inherit the strip background, and sit directly after the previous media with no negative margins, no spacer elements, and no overlap/crop hacks between blocks.
  - Do not use `content-visibility`, `contain`, or transform-based shell scaling on continuous case media strips; these can create delayed paint seams or fractional-pixel gaps.
  - Prefer real page scaling with `zoom: var(--page-scale)` on standalone case shells instead of `transform: scale(...)` for Behance-style work pages.
- If a visible line remains after the DOM seam measures `0px`, treat it as an internal asset/iframe edge, not a layout gap:
  - Do not move surrounding media blocks, add negative margins, or change stack spacing.
  - For Vimeo/internal iframe edge artifacts, crop inside the iframe wrapper only.
  - Use a top-only iframe crop like Aerosure's `case-video-crop-top` when only the top edge is visible.
  - Use a centered/symmetric iframe crop like BMMB's `case-video-crop-y` when both top and bottom iframe edges can appear.
  - Keep the outer media wrapper fixed so the adjacent blocks still touch with `0px` layout delta.

For future standalone pages, include:

```html
<script src="/standalone-nav.js?v=standalone-nav-1"></script>
```

This keeps the `/bio` hero-photo entry animation working when navigating from that page to Bio.

## Implementation Rules

- Keep standalone pages standalone unless Parviz explicitly asks to make them part of the SPA.
- Keep `/` and `/bio` behavior in `index.html` and `script.js`.
- Add page-specific JavaScript only when CSS cannot handle the behavior cleanly.
- Avoid JavaScript for purely visual/static states when CSS is enough.
- Use `apply_patch` for manual edits.
- Do not revert unrelated user changes.
- Do not delete hidden/helper concepts from Figma-derived work unless Parviz explicitly says they are not needed.
- Preserve text line breaks and text block widths from Figma.
- For new raster assets, convert to `.webp` and reference local files.
- Hide context menus on portfolio media when requested or when matching an existing page pattern:
  - For normal image/GIF/WebP media, prevent the `contextmenu` event on the page-owned media wrapper and set image dragging off where useful.
  - For non-interactive Vimeo/embed media, use a transparent page-owned shield over the iframe so the browser and embed context menus cannot appear.
  - For playable Vimeo/embed media, do not leave the iframe uncovered if the embed's own context menu must be hidden. Use a shield that blocks right-click, then forwards left-click behavior through Vimeo control code.
  - Aerosure is the current reference: the first `work-video-primary` Vimeo remains playable through the shield by calling Vimeo's `Player` API when available, with a direct `postMessage` play/pause fallback.
  - Do not use a shield that only blocks events on a video that needs to stay playable; that makes the embed visually present but functionally dead.

## Local Development And Checks

- Start the site with:

```bash
npm start
```

- Verify pages at:
  - `http://localhost:3000/`
  - `http://localhost:3000/bio`
  - `http://localhost:3000/contact`
  - `http://localhost:3000/unibank`
  - `http://localhost:3000/bmmb`
  - `http://localhost:3000/orkestra`
  - `http://localhost:3000/aerosure`
  - `http://localhost:3000/pedalchi`
  - `http://localhost:3000/talktocanada`

- Run syntax checks after JavaScript edits:

```bash
node --check script.js
node --check contact.js
node --check unibank.js
node --check standalone-nav.js
node --check talktocanada.js
node --check server.js
```

- After visual changes, open the page in the browser and inspect the actual result, especially image crops, typography, scroll behavior, hover states, and transition handoffs.
- For every continuous media strip, verify in the browser that each adjacent seam has `cur.top - prev.bottom === 0`. If the measurement is `0` but a line is still visible, inspect the asset or iframe itself and fix the internal edge, not the stack layout.
