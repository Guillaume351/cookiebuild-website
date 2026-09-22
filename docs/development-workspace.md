# Development workspace

Use `nvm use` before installing dependencies. `.nvmrc` follows the Node version
pinned in the Dockerfile; do not use an older global Node with Nuxt.

`main` is the website reference. Coordinate gameplay changes in the private
Cookies repository, which pins its five Git submodules. Run `npm ci`,
`npm run typecheck`, `npm test`, `npm run build`, and `npm audit --omit=dev`.
Database integration tests require their documented isolated database setup;
skipped integration tests are not a passing database validation.

Before changing an old checkout, save tracked and untracked work. A file listed
as untracked may already exist on main under another name (notably migrations
0015/0016, formerly drafted as 0013/0014). Compare against the current tree,
never copy old migrations or their journal over the current migration chain.

Keep world archives, release artifacts and test evidence separate from Git
worktrees. Remove only worktrees whose commits and local files are preserved.
