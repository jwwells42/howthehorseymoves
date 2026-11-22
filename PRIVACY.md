# Privacy notes

What the site holds about students, who can see it, and what the laws ask.
**Not legal advice.** Written by Claude on 2026-11-21 from the sources at the
bottom, to help the teacher talk to the district. Check anything that matters
with the district (its privacy officer or technology director) before relying
on it.

**Kept up to date as the site changes:** any change that stores, sends or
shows something about a student updates "What the site holds" in the same
commit (see CLAUDE.md).

## Open items, most urgent first

1. **The About page is out of date.** It still says "No accounts or login
   required", "No server-side data storage", "No cookies", "No external API
   calls", "No student data is collected or transmitted to any server", and
   that COPPA "does not apply" because nothing is collected. Since the Lichess
   login went live (2026-11-21) none of that is true for a student who logs in.
   The About page is the teacher's own words: the teacher rewrites it from
   "What the site holds" below.
2. **Ask the district before student logins and the games library are used
   with a class.** The U.S. Department of Education's advice to a teacher who
   wants to use an online tool with student information is to "first check with
   their school/district administration to see if that application or service is
   approved for use in the classroom", and to consult IT. Arkansas districts
   usually sign a standard student data privacy agreement with a tool's
   provider (the AR-NDPA, see "District agreement" below). Ask whether the
   district wants one for this site; that may be the "privacy policy issue"
   that ruled out qchess.net.
3. **Students' Lichess accounts.** Lichess's terms (as quoted on its forum, not
   checked on the terms page itself) need account holders to be 16 or over;
   under 16, only with kid mode permanently on, or with a parent's or
   guardian's supervision and consent. Students logging in here need Lichess
   accounts first, so the school and parents are involved either way.
4. **No way to delete a student's server data yet, except by hand.** The
   Arkansas student privacy act requires deletion "within a reasonable time
   frame" when the school or district asks. Today: a student's progress row can
   only be deleted in the Neon SQL editor, and library games with 🗑 on
   `/library`. Build a teacher-only "delete this student" before student
   logins are used widely.
5. **No written retention rule.** Nothing is deleted automatically: a student's
   progress row stays until deleted, and so do library games. Decide how long
   each is kept (for example, until a student leaves the program) and write it
   here. The amended COPPA rule asks for a written retention policy, in the
   privacy notice, if COPPA applies.
6. **Before linking students' logins to their names in games** (planned: the
   players page, "My games"), get the district's OK: that link turns made-up
   league names into identified students, and over-the-board scoresheets may
   carry real names. The teacher decided (2026-11-21) that students see their
   opponents' names as recorded.
7. **Where the data is stored.** Note the Neon project's region (shown in the
   Neon console) and Vercel's region here; districts often ask.

## What the site holds

| What | Where | Who can see it | Kept until |
|---|---|---|---|
| Progress (puzzles, stars, best scores, opening moves) and settings | The student's browser (localStorage) | That browser | The browser's data is cleared |
| **With a Lichess login:** Lichess id and username, a copy of the progress above, when the account was created, last updated, last seen | Neon Postgres, `horsey_users` | The student (their own); the teacher through the Neon console | Deleted by hand (open item 4) |
| `horsey-session` cookie: the Lichess id, signed so it can't be forged | The student's browser | Only the site's server reads it | 1 year, or logging out |
| `horsey-oauth` cookie, during a login only | The student's browser | The site's server | 10 minutes |
| **Games library:** students' games from Rookly exports: the players' Rookly names (made up by Rookly), event, date, time, moves, result, how it ended | Neon Postgres, `horsey_library` | **Only the teacher** (the Lichess ids in `TEACHER_LICHESS_IDS`); the server refuses everyone else | Until the teacher deletes it (🗑 on `/library`) |
| The Probabilitizer's Lichess token (the teacher's tool) | The browser (localStorage) | That browser; sent only to Lichess | Logging out of it |
| Server logs: IP address, time, page | Vercel | Vercel; the site owner in Vercel's dashboard | Vercel's log retention |

**Not held:** emails, real names (except any the teacher types in later),
birthdays, photos, locations, passwords (Lichess handles the login; the site
never sees a Lichess password). No ads, no analytics, no trackers: none in
`package.json` or `src/` (checked 2026-11-21).

**Planned, not built yet** (move each up into the table when it ships):
stored Stockfish analysis per game; links from a student's Lichess login to
their names in games (players page); students seeing their own games, with
opponents' names as recorded and the teacher's lesson notes; over-the-board
games typed in by the teacher; Studies shared with chosen Lichess logins.

**Outside services:**
- **Lichess** (lichess.org): the login. The site asks Lichess for the username
  only (no scopes), uses the token once, then revokes it. The Probabilitizer
  also calls the Lichess opening explorer (explorer.lichess.ovh) with the
  teacher's own token.
- **Vercel**: hosting.
- **Neon**: the database.
- **Stockfish** runs inside the browser: positions never leave the device.

**Security in place:** HTTPS; the session cookie is httpOnly, SameSite=Lax
and HMAC-signed; every teacher-only route checks the login on the server, not
just in the page; the database URL and secrets live only in Vercel's settings
and a gitignored `.env`; the Rookly export is gitignored. Games are not
encrypted by the site (the teacher's call, 2026-11-21, because Rookly names
are made up).

## The laws

### FERPA (federal)

- It binds **schools** that receive federal funds, not websites. It protects
  "education records": records directly related to a student and maintained by
  the school or by a party acting for it.
- A teacher is a "school official". An outside online service may receive
  personally identifiable information from education records under the school
  official exception only if it:
  - "Performs an institutional service or function for which the agency or
    institution would otherwise use employees";
  - "Is under the direct control of the agency or institution with respect to
    the use and maintenance of education records";
  - uses the information only for the purpose it was disclosed for, and doesn't
    re-disclose it;
  - meets the criteria in the district's annual FERPA notice.
- **Here:** the parts that could hold education records are the games library
  and anything that links a student's login to their games. Whether league
  games count as records "maintained by" the school, and whether this site can
  be under the district's "direct control", are questions for the district
  (open item 2).

### COPPA (federal)

- It applies to operators of websites run "for commercial purposes" that are
  directed to children under 13, or that know they collect personal
  information from them. Personal information includes screen names and
  persistent identifiers.
- Whether a free, ad-free site run by one teacher counts as "commercial" is
  unclear, so the safe course is to act as though COPPA applies.
- **Schools may consent in place of parents** when a service is used only for
  the school's educational purposes. That is FTC guidance; the 2025
  amendments (in force June 23, 2025, compliance by April 22, 2026) did not
  write it into the rule, and the FTC said the existing guidance stands. Data
  gathered that way may not be used for anything commercial.
- The amended rule also asks for a **written data retention policy**, included
  in the online privacy notice, and a **written information security program**.
  Open items 1, 5 and this file cover the beginnings of both.

### Arkansas: Student Online Personal Information Protection Act (Ark. Code § 6-18-109)

- It applies to an operator "with actual knowledge" that its site is "used
  primarily for public school purposes", "designed and marketed for public
  school purposes", and "operating at capacity". General audience sites are
  excluded, and districts aren't operators. This site is built for classroom
  use, so treat it as covered.
- It covers personally identifiable information about an Arkansas public
  school student (name, email, grades, photos, search activity and more).
- An operator must not knowingly:
  - target advertising using it;
  - build a profile of a student "except in furtherance of public school
    purposes";
  - sell it;
  - disclose it, except for school purposes, legal compliance, or to a service
    provider under a contract that limits its use.
- An operator must keep "reasonable security measures", and delete a student's
  information "within a reasonable time frame" when the school or district
  asks (open item 4).
- The text read (FindLaw, "Current as of March 28, 2024") has no penalty
  section of its own.
- **Here:** no ads, no selling, nothing disclosed; the only gap is deletion on
  request.

### Arkansas: Children and Teens' Online Privacy Protection Act (Act 952 of 2025, Ark. Code § 4-88-1501 and after)

- In force since **July 1, 2026**. Enforced only by the Attorney General.
- "Child" = 12 or younger in Arkansas; "teen" = 13 to 16 in Arkansas.
- "Operator" means "a person who, for commercial purposes, operates or provides
  a website" and collects personal information (§ 4-88-1502). It excludes:
  nonprofits exempt from the FTC Act; state agencies and political
  subdivisions; and "a public educational entity of the State of Arkansas,
  including without limitation a school district".
- Where it applies:
  - consent (a parent for a child; a parent or the teen for a teen);
  - no targeted advertising;
  - data kept only as long as reasonably necessary;
  - teens may see, correct and delete their data.
- **Here:** a free, non-commercial site is probably not an "operator", but
  don't rely on that alone. What it asks (no ads, little data, deletion and
  correction on request) is what this site should do anyway.
- Read from the engrossed bill text of April 7, 2025 (HB1717); check the
  enacted Act 952 if a detail matters.

### Arkansas: Personal Information Protection Act (Ark. Code § 4-110-101 and after)

- The data breach law. Its "personal information" is a name combined with
  things like a Social Security number, driver's license number, financial
  account number, medical or health insurance information, or biometric data.
  If a breach reaches more than 1,000 Arkansans, the Attorney General must be
  told. Enforced by the Attorney General.
- **Here:** the site holds none of those things, so a breach of it would
  probably not trigger this law. Keep it that way: never store those.
- Not read from the statute itself (only summaries); check the current text of
  § 4-110-103(7) if it matters.

### District agreement (Arkansas)

- Arkansas is a member of the Student Data Privacy Consortium (the Arkansas
  Student Privacy Alliance), whose districts sign a standard Arkansas data
  privacy agreement (**AR-NDPA-V1**) with education services. Signed examples
  are public on the consortium's Arkansas page.
- Ask the district whether it needs one for this site (open item 2). Signing
  one is a commitment about deletion, security and breach notice, so read it
  before signing.

## Sources

- U.S. Department of Education, Student Privacy Policy Office:
  [using an online tool in a course](https://studentprivacy.ed.gov/faq/i-want-use-online-tool-or-application-part-my-course-however-i-am-worried-it-violation-ferpa),
  [who is a school official](https://studentprivacy.ed.gov/faq/who-school-official-under-ferpa)
- FTC, amended COPPA rule:
  [Federal Register, April 22, 2025](https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule);
  summaries: [Davis Wright Tremaine](https://www.dwt.com/blogs/privacy--security-law-blog/2025/05/coppa-rule-ftc-amended-childrens-privacy),
  [Fenwick on retention](https://www.fenwick.com/insights/publications/what-the-amended-coppa-rule-means-for-data-retention-practices),
  [Latham & Watkins](https://www.lw.com/en/insights/2025/05/ftc-publishes-updates-to-coppa-rule)
- Ark. Code § 6-18-109:
  [FindLaw](https://codes.findlaw.com/ar/title-6-education/ar-code-sect-6-18-109/)
- Act 952 of 2025 (HB1717):
  [bill text, Arkansas Legislature](https://arkleg.state.ar.us/Home/FTPDocument?path=%2FBills%2F2025R%2FPublic%2FHB1717.pdf);
  [Future of Privacy Forum analysis](https://fpf.org/blog/little-rock-minor-rights-arkansas-leads-with-coppa-2-0-inspired-law/)
- Ark. Code § 4-110-103:
  [FindLaw](https://codes.findlaw.com/ar/title-4-business-and-commercial-law/ar-code-sect-4-110-103/);
  summary: [Lewis Brisbois on the 2019 amendment](https://lewisbrisbois.com/print/15229)
- Student Data Privacy Consortium, Arkansas:
  [agreements and the AR-NDPA-V1 template](https://sdpc.a4l.org/agreement_info.php?state=AR)
- Lichess: [terms of service](https://lichess.org/terms-of-service);
  the age rule as quoted on [Lichess's forum](https://lichess.org/forum/off-topic-discussion/what-is-the-age-limit-for-kid-mode-and-is-there-a-age-limit-for-posting-forums)
