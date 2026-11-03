# Accessibility checks

Prepared **2026-11-03**. The design target is **WCAG 2.2 Level AA**. This checklist is a focused acceptance aid, not a complete conformance audit, certification, or promise of support for every device. Owner content and customization can introduce new barriers.

**Verification status:** see the dated evidence below. The checklist is retained as a reusable release checklist; unchecked items are not blanket failures. Some checks have partial coverage only. Do not infer a manual or assistive-technology pass from an automated score.

## Content and structure

- [ ] The page has an accurate title and language; landmarks and heading levels form a logical outline.
- [ ] Every link has a meaningful accessible name that describes its destination or purpose. Visible wording is included in that name.
- [ ] Destination links are native anchors. Controls that change the page are native buttons or other appropriate native elements.
- [ ] Optional portraits have context-appropriate alternatives. Decorative images use `alt=""`; redundant SVG icons do not add spoken clutter.
- [ ] No important meaning depends only on color, position, shape, or an icon.
- [ ] Missing portrait, absent descriptions, long names, long link labels, and a twenty-link collection remain understandable.

[WAI decorative images](https://www.w3.org/WAI/tutorials/images/decorative/), [WCAG 2.2](https://www.w3.org/TR/WCAG22/)

## Keyboard and interaction

- [ ] Tab and Shift+Tab reach all interactive elements in a logical order, without traps or positive `tabindex` workarounds.
- [ ] Enter activates links; native controls support their expected keyboard behavior.
- [ ] Keyboard focus is clearly visible and never entirely covered by author-created content. Check the first and last controls and any sticky elements.
- [ ] Pointer targets meet the 24×24 CSS-pixel AA criterion or a documented exception. Aim for generous 44–48px rows; this larger design target is not the AA requirement.
- [ ] Links open in the same tab by default. Any deliberate new-tab behavior is announced. Browser Back behaves normally.
- [ ] Any enhancement gives understandable feedback, preserves focus, and fails gracefully.

[Focus visible](https://www.w3.org/WAI/WCAG21/Understanding/focus-visible), [focus not obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html), [target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [GOV.UK links](https://design-system.service.gov.uk/styles/links/)

## Readability and adaptation

- [ ] Normal text has at least 4.5:1 contrast; qualifying large text has at least 3:1. Check default, hover, visited, and selected states where present, in every supplied palette.
- [ ] Visual information needed to identify controls and their states has at least 3:1 contrast against adjacent colors. Decorative dividers do not automatically require this ratio.
- [ ] At 320 CSS pixels wide, content reflows without lost functionality or horizontal page scrolling. Test long text as well as the shortest example.
- [ ] At 200% text enlargement, content remains readable and operable. At 400% browser zoom on an appropriate desktop viewport, content reflows.
- [ ] The page survives simultaneous text-spacing overrides: line height 1.5×, paragraph spacing 2× font size, letter spacing 0.12em, word spacing 0.16em. These are test overrides, not required default values.
- [ ] Forced-colors/high-contrast settings retain meaningful text, boundaries, and focus indicators.
- [ ] Reduced-motion settings are respected. There is no essential information or operation dependent on animation or hover alone.
- [ ] With JavaScript disabled, the introduction and all destination links remain usable. With fonts or the portrait unavailable, the page still communicates its content.

[Contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html), [reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), [text spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html)

## Test scope and release evidence

- [ ] Run an automated accessibility scan on representative fixtures and themes. Resolve findings or document an evidence-based disposition.
- [ ] Manually inspect narrow and wide layouts, touch-target geometry, text wrapping, and all interactive states.
- [ ] Test keyboard navigation without a mouse.
- [ ] Test with an actual screen reader, including heading navigation, links navigation, portrait announcement, and any enhanced control. Record the tool and version; a DOM inspection is not a screen-reader test.
- [ ] Test representative browser engines and operating systems, and document gaps. Emulated viewport checks do not prove behavior on physical devices.
- [ ] Ask representative visitors, including people using assistive technology where possible, to find and follow a named destination. Observe completion and confusion rather than asking only whether the page looks accessible.

USWDS combines automated, manual, assistive-technology, and user testing. Its components are a starting point, not a guarantee for an assembled service. [USWDS accessibility process](https://designsystem.digital.gov/documentation/accessibility/)

## Verification log

Append dated results below. Separate **passed**, **failed**, **not tested**, and **not applicable**. Identify the build/configuration tested and any unresolved limitations. Recheck after changes to content, colors, layout, or interaction.

### 2026-11-03 — initial template preview

**Passed in the assessed scope:**

- Node v26.10.0 on macOS: 25 tests passed (12 renderer/build tests and 13 contrast tests). Includes unsafe input rejection, HTML escaping, ordinary `%25` URLs, sharing metadata, missing image rejection, twenty static links, optional content, demo removal, subpath asset handling, and preserving the previous build on failure.
- Every provided paper/stone × blue/rust/forest × light/dark combination passed sRGB contrast calculations: ink, muted text, accent and hover text ≥4.5:1 on page and row surfaces; focus and control borders ≥3:1. System-color preferences match explicit settings. These are color tests, not an overall conformance result.
- Codex in-app browser on macOS: rendered inspection at 390×844 and 1440×1000; tablet/portrait inspection at 768×1024. A long-name, long-label fixture at 320×800 wrapped without page overflow.
- axe-core 4.14.0 (`wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`, and best-practice rules): zero reported violations and zero incomplete items on 10 fixtures at 320×800. Fixtures: standard, three links, portrait, twenty links, long content, 200% root text size, WCAG text-spacing overrides, dark/stone/forest, enhancement script omitted, and a missing portrait. The twenty-link fixture also passed at 768×1024; the dark portrait fixture passed at 1440×1000. Runs reported 35–41 passing rules, depending on applicable elements. Axe and the temporary fixtures are QA tools, not shipped dependencies.
- Destination rows in the 320px fixtures measured at least 83 CSS px high (minimum example), exceeding the chosen 44px target. Page scroll width did not exceed the viewport. Root text enlargement is a test fixture, not actual browser zoom.
- Manual keyboard sequence: Tab reached the visible skip link; Enter moved to the destination landmark; Tab traversed featured work, Writing, GitHub, LinkedIn, Instagram, Email, then Appearance. Focus was visibly outlined. The native Appearance select changed to Dark using the keyboard and retained Dark after reload. It was reset to System afterward. No email was sent.
- Missing portrait fixture: enhancement hid the failed image and the layout remained usable. With the enhancement script omitted, all six standard destination anchors remained present and the unavailable appearance control stayed hidden. This is an enhancement-off test, not an actual browser-wide JavaScript-disabled test.
- Local static server checks: GET/HEAD, MIME types, directory index, missing-route 404, method rejection, traversal, dotfile and escaping-symlink protections passed.

**Source-reviewed safeguards, without full runtime coverage:**

- Reduced-motion CSS removes transitions; there is no automatic animation. Forced-colors CSS preserves semantic link/focus colors and boundaries. Print CSS uses ink on white even when a dark preference is selected. These media modes were not exercised with actual OS/browser settings.
- No third-party script, font, tracking pixel or embedded media is loaded by template source. The demo’s outbound links leave the site. Hosting may independently log requests or apply access controls.
- The post-scan changes corrected metadata/default-theme edge cases and added scroll margin; no content or palette changes were made after visual checks. Final Node checks were repeated. Publication packages exclude the temporary audit files.

**Not yet established:**

Actual VoiceOver/NVDA/JAWS behavior; physical iOS/Android devices; Safari/Firefox/Chrome cross-engine matrix; actual 400% browser zoom; actual forced-colors and reduced-motion system settings; browser-wide disabled JavaScript; fonts blocked at network level; usability with representative visitors; a complete WCAG 2.2 AA audit. The page is a tested starting point, not certified or universally validated. Recheck with owner content before a public release.


### 2026-11-03 — version 1.0 finalization

The source suite now covers **39 passing tests**, including the optional loopback HTTP test (no skipped cases in the final run). The added coverage verifies theme persistence scoped to each installation, unavailable storage, cross-tab reset, early/late failed portraits, configurable destination details, translated interface labels with accurate language tags, custom favicon replacement, and actual builds at both `/` and `/people/alex/`.

The HTTP fixture serves only copied build output with a plain static file server. All referenced HTML, CSS, script, font, image, and local PDF resources returned 200 with the expected content and MIME types at both mounts. It uses no login middleware, application renderer, API routes, or SPA fallback. This verifies the template’s asset paths and independence from the preview service; it does not certify every hosting provider or run a GitHub Pages deployment.

The final content/layout passed axe-core 4.14.0 again at 320×800 on all ten earlier fixtures, with zero reported violations or incomplete items. Applicable passing rules ranged from 33 to 41. Minimum ordinary destination-row height was 64 CSS pixels, and no fixture’s page scroll width exceeded the viewport. The 200% root-text fixture had minimum 128px rows. Visual inspection covered the final 390px portrait and no-portrait views and the 1440×1100 desktop composition. Screenshots are evidence of these views, not a full device test.

The demonstration now uses selective descriptions and destination details, so its links have shorter accessible names. Unset optional content is omitted. Interface language strings and a local favicon can be changed without editing the renderer. All earlier stated limits concerning actual assistive technology, physical devices, browser-engine coverage, OS media settings, and human usability observation remain. These are bounded verification results, not certification.
