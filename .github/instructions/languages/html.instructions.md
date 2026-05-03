<!-- version: 1.0.0 -->
# HTML Language Pack

Use this guidance when working with HTML, templates, and static markup.

## Core approach

Prefer semantic, accessible, maintainable HTML.

Follow existing project conventions and templating style.

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

## Forms

For forms:

- use labels
- use appropriate input types
- preserve validation
- avoid leaking sensitive data into URLs
- use POST for sensitive submissions
- avoid hidden fields for trusted state unless server-validated
- include CSRF protections where the backend requires them

## Links and navigation

Use safe external link patterns when opening new tabs:

- `rel="noopener noreferrer"` with `target="_blank"`

Avoid vague link text such as "click here."

## Images and media

Use meaningful alt text.

Avoid oversized assets where smaller assets would work.

Preserve lazy loading if already used.

Be mindful of layout shift.

## Templates

When working in templating systems:

- preserve escaping behaviour
- avoid raw HTML rendering unless explicitly justified
- keep logic minimal
- follow existing partial/component structure
- do not duplicate large markup blocks unnecessarily

## Final response

When completing HTML work, include:

- files changed
- accessibility considerations
- security considerations
- manual checks recommended
