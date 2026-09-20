# Working in this repo

## TypeScript

- Use `type`, not `interface`. The one exception is module augmentation — extending Express's `Request`, for example — where declaration merging only works with `interface`.
- Use regular functions, not arrow functions. Arrows are for inline callbacks: `onClick`, `.map()`, a `setTimeout`. Anything named or exported is a `function`.
- Use `axios` for HTTP requests, not `fetch`.

## Libraries

This repo runs bleeding-edge versions — Drizzle 1.0.0-rc, Better Auth 1.7, Express 5, Zod 4, TypeScript 7. Read the installed package in `node_modules` for the real API instead of relying on memory or published docs. Several of these changed in ways that are easy to get subtly wrong, and the docs are behind in places.

## Working style

- Work in phases and stop between them. I review each phase before the next one starts.
- Never commit unless I ask for it. Build the thing, tell me what changed, then wait. "Commit this" applies only to what we were just discussing, not to whatever gets built next.
- No `Co-Authored-By` or "Generated with" lines in commit messages or pull request descriptions.
