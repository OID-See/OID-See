<!-- version: 1.0.1 -->
# HTML Language Pack

Use this guidance when working with HTML, templates, and static markup.

## Core approach

Prefer semantic, accessible, maintainable HTML.

Follow existing project conventions and templating style.

Assume HTML5 and evergreen browsers unless the project indicates otherwise, such as with a doctype, `.browserslistrc`, or polyfills that suggest older support.

If project conventions conflict with this guidance, follow the project convention for stylistic items but never override security or accessibility rules; call out the conflict in the final response.

Do not add JavaScript or CSS unless needed for the requested change.

Do not use markup as a dumping ground for application logic.

## Semantic HTML

Prefer semantic elements where appropriate:

- `header`
- `nav`
- `main`
- `section`
- `article`
- `aside`
- `footer`
- `button`
- `form`
- `label`

Do not use `div` and `span` for everything when a semantic element is more accurate.

## Accessibility

Preserve or improve accessibility.

Use:

- meaningful link text
- labels for form controls
- alt text for meaningful images
- empty alt text for decorative images
- correct heading order
- keyboard-accessible controls
- visible focus behaviour where CSS is involved
- ARIA only when native HTML is insufficient

Do not use ARIA to compensate for incorrect HTML when native semantics would work.

Ensure the root element has a `lang` attribute, set `dir` where content direction differs, and avoid concatenating translated strings inside markup.

## Security

Treat rendered HTML as a trust boundary.

Be careful with:

- user-controlled HTML
- unsafe template rendering
- inline scripts
- third-party embeds
- open redirects
- form targets
- hidden inputs
- CSP assumptions
- mixed content
- unsafe iframe permissions

Do not inject untrusted content as raw HTML.

Prefer escaping by default.

If a request would require violating these security rules, refuse the unsafe approach, explain why, and propose a safe alternative.

## Forms

For forms:

- use labels
- use appropriate input types
- preserve validation
- avoid leaking sensitive data into URLs
- use POST for sensitive submissions
- do not store security-sensitive state (user roles, permissions, prices, or IDs the user should not control) in hidden inputs unless the server re-validates the value on submission
- include CSRF protections where the backend requires them

## Links and navigation

Use safe external link patterns when opening new tabs:

- `rel="noopener noreferrer"` with `target="_blank"`

Avoid vague link text such as “click here.”

## Images and media

Use meaningful alt text.

Avoid oversized assets where smaller assets would work.

Preserve lazy loading if already used.

Be mindful of layout shift.

## Templates

When working in templating systems:

- preserve escaping behaviour
- avoid raw or unescaped HTML rendering; if required, the input must come from a trusted, sanitized source and the reason must be stated in a code comment adjacent to the rendering call
- keep logic minimal
- follow existing partial/component structure
- do not duplicate large markup blocks unnecessarily

## Final response

When completing HTML work, include:

- files changed
- accessibility considerations
- security considerations
- manual checks recommended
