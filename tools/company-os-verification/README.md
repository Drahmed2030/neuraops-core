# Local Company OS SQL verification

This isolated tool package pins PGlite 0.5.8. It is not a runtime application dependency or an agent framework. Install explicitly with `npm ci --prefix tools/company-os-verification --ignore-scripts --no-audit --no-fund`.

Run from the repository:

`node scripts/company-os-local-verification.mjs --suite all --evidence /tmp/company-os-new-evidence`

The runner installs nothing, takes no database URL, opens only in-memory databases, and refuses an existing evidence directory. Each fixture closes its database through a test teardown hook. A passing receipt certifies embedded SQL tests only. Native PostgreSQL multi-session races, hosted migration parity and authenticated governance remain separate gates. Do not promote `supabase/candidates/company-agent-authority.sql` into migrations without those gates and a CLI-generated migration filename.
