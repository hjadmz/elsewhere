# Why Elsewhere is designed this way

Research date: **2026-11-03**. This is the rationale for a reusable template, not evidence that every design choice has been validated with users. Implementation checks belong in [ACCESSIBILITY.md](ACCESSIBILITY.md).

## The job

Elsewhere gives a person a small, independent home on the web: enough context to recognize them, followed by useful places to go. A visitor should be able to answer three questions quickly: **Whose page is this? What can I find here? Which link serves my purpose?**

The intended audience includes people sharing professional work and people connecting their social presence. A hiring manager looking for projects should find an intelligible route, without learning a novel interface. The template is not a blog, storefront, social network, or complete portfolio. It can link to those things.

Success means a visitor can identify and follow the intended destination, and an owner can add, remove, or reorder a link without redesigning the page. Visual restraint is a means to those ends. It is not a reason to remove useful context.

## Function → Convenience → Aesthetics

FCA is a design sequence and a revisable judgment, not a numerical score.

**Function:** readable identity and context, predictable links, keyboard operation, responsive layout, and content that survives missing optional fields. **Convenience:** a small configuration surface, reusable components, ordinary browser behavior, and static files that can move between hosts. **Aesthetics:** deliberate typography, spacing, alignment, color, and proportion that help the page feel coherent.

These concerns interact. An attractive page can communicate care; a configuration that is theoretically flexible but difficult to maintain can undermine its function. The design aims for the smallest coherent system that handles the actual use case, rather than the fewest lines of code or the largest feature list.

## Make the next action apparent

Norman distinguishes an action that is possible from a **signifier** that communicates what to do. Applied here, the browser makes navigation possible; visible labels, link styling, and interaction states help people recognize it. Labels such as “LinkedIn” or “Selected work” carry more dependable meaning than an unfamiliar icon alone. This application is a design inference from [Norman’s original essay on signifiers](https://jnd.org/signifiers-not-affordances/).

The related gulfs of execution and evaluation give two practical questions: can the visitor work out how to reach the desired destination, and can they understand what happened? A clear label and an actionable row support execution. Visible keyboard focus, normal navigation, and a working Back button support evaluation. This is why decorative novelty must not replace familiar navigation. [Nielsen Norman Group explains the two gulfs](https://www.nngroup.com/articles/two-ux-gulfs-evaluation-execution/).

Links should use native anchors and open in the same tab by default. Visitors retain the browser’s options to open another tab. Forced new tabs can disorient people; any intentional exception should be announced. Platform logos may supplement text, but must not replace it. Redundant decorative icons should not create repeated screen-reader announcements. [GOV.UK link guidance](https://design-system.service.gov.uk/styles/links/), [WAI decorative-image guidance](https://www.w3.org/WAI/tutorials/images/decorative/)

## Three links or twenty

A short page needs little ceremony: an introduction and a readable list may be sufficient. A longer page benefits from meaningful headings and a deliberate order. Put the most relevant destinations first, then group the remainder by purpose. An owner may have twenty legitimate destinations; the template should support them without pretending that every destination deserves equal prominence.

There is no evidence here for a universal “six links maximum” rule. Automatically hiding everything after an arbitrary count could conceal the destination someone came to find. The default is therefore visible, structured content, not a mandatory “More” drawer or accordion. For a long page, section links can provide a useful shortcut. GOV.UK similarly recommends trying simpler content and headings before accordions because hidden content can be missed. [GOV.UK accordion guidance](https://design-system.service.gov.uk/components/accordion/)

Grouping is still an editorial responsibility. “Work,” “Writing,” and “Elsewhere” only help when they describe the actual content. Duplicate or stale links need review, not a more elaborate interface. Descriptions are optional and should clarify what a visitor will find rather than repeat the label.

The broader research does not justify a simplistic “fewer choices is always better” claim either. A 2010 meta-analysis found a near-zero overall choice-overload effect with substantial variation. A later meta-analysis identified choice complexity, task difficulty, preference uncertainty, and the decision goal as moderators. These studies concern consumer decisions, so applying them to finding a social link is an inference, not validation of this particular layout. [Scheibehenne, Greifeneder & Todd (2010)](https://scheibehenne.de/ScheibehenneGreifenederTodd2010.pdf), [Chernev, Böckenholt & Goodman (2015)](https://chernev.com/wp-content/uploads/2017/02/ChoiceOverload_JCP_2015.pdf)

In version 1.0, descriptions and visible hostnames are deliberately optional. A clear “GitHub” label need not be followed by “github.com” and a generic caption. An unfamiliar project can benefit from both context and a destination hint. This is a restrained default to assess with actual content, not a claim of measured conversion improvement.

## Customization with a stable foundation

The owner supplies identity, introduction, optional portrait, destinations, labels, descriptions, group names, and ordering. The layout should remain intentional when the portrait or optional text is absent. No empty avatar, vacant column, or invented biography is required.

Appearance choices should preserve readable contrast, usable target sizes, clear focus, and comfortable spacing. A few checked palettes are a better default than an unrestricted styling panel. Advanced CSS remains possible, but changing colors or layout requires rechecking the result. Accessibility is a property of the finished page, including its content—not a guarantee attached permanently to a template.

Rams’s emphasis on usefulness, understandable structure, restraint, honesty, and careful details fits this approach. It does not prove that modernism or monochrome is universally superior. His foundation explicitly describes the principles as capable of evolving with culture and technology. Elsewhere’s visual direction is a considered preference, not a scientific verdict on taste. [Vitsœ’s account of Rams’s principles](https://www.vitsoe.com/us/about/good-design), [Rams Foundation](https://rams-foundation.org/foundation/design-comprehension/)

## Static by design

The published page should be static HTML and CSS, with JavaScript reserved for optional enhancements. Reading the page and following its links must not depend on JavaScript. A configuration and build step can prevent editing mistakes while keeping the visitor’s page small and portable. The tradeoff is that changing content requires editing and rebuilding rather than signing into a hosted editor.

[LittleLink](https://github.com/sethcottle/littlelink) is a relevant precedent for simple, self-hosted HTML/CSS. Its own README acknowledges contrast limitations in some branded buttons; a large catalogue of brand styling is therefore not automatically an accessibility improvement. [LinkStack](https://github.com/LinkStackOrg/LinkStack) demonstrates the convenience of an administration interface, but also introduces server, update, and database responsibilities. Neither project’s existence establishes that its architecture is best for this template.

The initial scope excludes accounts, databases, analytics, social embeds, automatic feeds, commerce, custom cursors, animation-dependent interaction, and a visual page builder. Each would add operating or interaction costs beyond the core job. These are scope decisions, not claims that the features are always bad. No analytics included in a template also does not mean its eventual host keeps no logs.

## What public discussion added—and what it did not

A [Reddit discussion about an overloaded Linktree](https://www.reddit.com/r/SocialMediaMarketing/comments/1me4wbb/attempting_to_clean_up_overloaded_linktree/) highlighted the maintenance problem of accumulated links. A [self-hosting discussion](https://www.reddit.com/r/selfhosted/comments/1fvk28x/an_alternative_to_linktree_for_having_several/) included a job applicant seeking a focused page of relevant work. A [discussion of a more elaborate alternative](https://www.reddit.com/r/DigitalEscapeTools/comments/1vmp9qc/linkbreeze_selfhosted_privacyfirst_linktree/) questioned both the need for a platform and broad privacy claims.

These are small, self-selected anecdotes, not representative usability research or evidence of conversion gains. They help identify questions worth designing for: content maintenance, relevance, ownership, and truthful promises. They do not establish an ideal number of links.

## When to reconsider

Reopen a decision when observed use exposes a concrete gap: visitors repeatedly fail to find a destination; owners cannot maintain the configuration; a required input method fails; a real content collection needs better navigation; or several people need managed editing. Test the smallest change that addresses the gap. A larger editor or server becomes reasonable only when its convenience justifies its ongoing cost.

Before release, combine automated checks with manual keyboard, zoom, responsive-layout, and assistive-technology testing. USWDS follows a mixed testing process and explicitly warns that accessible components do not guarantee an accessible service. Real visitor testing remains necessary to assess usability beyond technical checks. [USWDS accessibility process](https://designsystem.digital.gov/documentation/accessibility/)
