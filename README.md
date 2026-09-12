# RxDev Man

```
██████╗ ██╗  ██╗██████╗ ███████╗██╗   ██╗███╗   ███╗ █████╗ ███╗   ██╗
██╔══██╗╚██╗██╔╝██╔══██╗██╔════╝██║   ██║████╗ ████║██╔══██╗████╗  ██║
██████╔╝ ╚███╔╝ ██║  ██║█████╗  ██║   ██║██╔████╔██║███████║██╔██╗ ██║
██╔══██╗ ███╔╝  ██║  ██║██╔══╝  ╚██╗ ██╔╝██║╚██╔╝██║██╔══██║██║╚██╗██║
██║  ██║██╔██╗  ██████╔╝███████╗ ╚████╔╝ ██║ ╚═╝ ██║██║  ██║██║ ╚████║
╚═╝  ╚═╝╚═╝╚═╝  ╚═════╝ ╚══════╝  ╚═══╝  ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝
```

---

## ◆ PULSE

A developer's knowledge is not the books they read; it is the notes
they can find again. RxDev Man is a living knowledge base - MDX posts,
tool showcases, series and tags - rendered with zero JS by default,
searchable offline, and readable in light, dark, or sepia. Thirty-seven
tests guard the core, the JS budget is 1.16 KB gzipped, and the visitor
counter asks nothing but a number. Built for the eternal student:
[rxdevman.com](https://www.rxdevman.com).

| P1-P5 ▣ | P6 ▣ | P7 ▣ | P8 ▣ |
|---|---|---|---|

*v2.0.0 - foundation, trust, themes, discovery, offline, security,
budgets, and the stable release are all sealed.*

> Built with Astro 7 + TypeScript 6, searched by Pagefind, counted by
> Supabase, shipped to Vercel - a knowledge base with the pages on the
> page.
>
> **suradet-ps**, artifact keeper

---

## ◆ IGNITION

One runtime, three commands.

```
⟫ git clone https://github.com/suradet-ps/rxdevman.git
⟫ cd rxdevman
⟫ bun install
⟫ cp .env.example .env   # Supabase credentials, optional locally
⟫ bun run dev
```

Open [http://localhost:4321](http://localhost:4321).

```
⟫ bun run build      # production build + search index
⟫ bun run test       # Vitest, 37 tests
⟫ bun run size       # JS bundle against the budget
```

<details>
<summary>Adding a post</summary>

A post is a directory: `src/content/blog/<slug>/index.mdx` plus a hero
image beside it. The frontmatter carries title, description, `pubDate`,
category, tags, and an optional series. MDX components are
auto-imported: `<InfoBox>`, `<CodeExplainer>`, `<GitCommand>`,
`<ProsCons>`. Categories and tags index themselves - a new string in
the frontmatter is a new page.

</details>

---

## ◆ ANATOMY

One stack, zero JS by default, several quiet helpers.

- **Publishes** - MDX content with interactive components
  (`CodeExplainer`, `InfoBox`, `ProsCons`, `GitCommand`) - code that
  explains itself inside the page that teaches it.
- **Finds** - Pagefind builds a static, typo-tolerant search index at
  build time; the index is cached by the service worker, so search
  works where the network does not.
- **Groups** - series, tags, and categories each generate their own
  index pages - a post placed in a series joins a story, not just a
  feed.
- **Counts** - Supabase-backed view counts with no cookies: a hashed
  identity and a number, nothing else asked.
- **Wears** - three themes (light, dark, sepia) with FOUC prevention
  and code-block switching; the offline banner is calm and honest.
- **Guards** - CSP, CodeQL, dependency audits, SHA-pinned actions,
  and CI-enforced performance budgets - 1.16 KB gzipped JS, WebP
  images, no layout shift from async components.

---

## ◆ RITUALS

**The core ceremony** - the weekly note:

1. Open a post or a tool page. The page is already there - static
   HTML, no JS waiting to be born.
2. Read in the theme that suits the hour; search across the whole
   base when the memory needs jogging.
3. Write the next note: a directory, an `index.mdx`, a hero image,
   and a series name if the thought continues.
4. Build, test, ship. The budget holds, the tests pass, the note is
   live.

**The ceremony of the offline page** - the train loses signal and the
knowledge base does not. Cached shell, cached index, cached images:
reading and searching survive the tunnel.

**The ceremony of the quiet counter** - a visit is a number, not a
profile. No cookies, no fingerprint, no surprise: privacy-first is a
feature, and the page says so in its architecture.

---

## ◆ ECHOES

**Where this artifact is heading**

```
P1-P2 ▸ foundation docs, design system, test trust ─────────────────── ▸ sealed
P3-P4 ▸ themes, discovery, RSS, series ──────────────────────────────── ▸ sealed
P5    ▸ offline-first PWA, search offline ──────────────────────────── ▸ sealed
P6-P7 ▸ security hardening, enforced budgets ───────────────────────── ▸ sealed
P8    ▸ v2.0.0 stable release ───────────────────────────────────────── ▸ sealed
```

**Raising the artifact** - the honest path lives in
`docs/ROADMAP.md`; the version story in `docs/CHANGELOG.md`; the
contribution rules in `docs/contributing.md`. New posts follow the
frontmatter contract in the README's own ritual section. Open an issue
first to discuss a change.

**Status** - CI gates lint, type-check, build, tests, audit, and the
size budget on every push. [Watch the gates](.github/workflows).

---

```
  ─────────────────────────────────────────
   The best developers are eternal students.
   This is their library.
  ─────────────────────────────────────────
```

Source code under the [MIT License](LICENSE).
