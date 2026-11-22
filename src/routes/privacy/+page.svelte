<script lang="ts">
  import Page from '$lib/components/ui/Page.svelte';

  // Drafted by Claude on 2026-11-21 at the teacher's request, from the
  // research in PRIVACY.md, for the teacher to review and edit (see
  // words-to-write.md). Not in src/words.txt until then: listed in
  // NOT_CHECKED in src/words.test.ts. Keep it to what is true today; when a
  // feature that stores or shows student data ships, update this page and
  // PRIVACY.md together.
  const UPDATED = '2026-11-21';
</script>

<Page title="Privacy" back={{ href: '/', label: 'Back to home' }}>
  <p class="updated">Last updated {UPDATED}</p>

  <section>
    <h2>In short</h2>
    <ul>
      <li>Without logging in, nothing about a student leaves their browser.</li>
      <li>
        Logging in with Lichess is optional. It keeps a copy of the student's progress in this
        site's database, so it follows them to another computer. The site learns their Lichess
        username and nothing else about them.
      </li>
      <li>No ads, no tracking, no analytics, no chat. Nothing is sold or shared.</li>
      <li>A student can download or delete their copy at any time, and the school or a parent can ask the teacher to delete it.</li>
    </ul>
  </section>

  <section>
    <h2>Without logging in</h2>
    <p>
      Puzzle progress, stars, best scores and settings are saved in the browser on the student's
      own device (its "local storage"). They are not sent anywhere. Clearing the browser's data
      for this site removes them.
    </p>
    <p>
      The chess engine (Stockfish) runs inside the browser, so positions being analysed never
      leave the device.
    </p>
  </section>

  <section>
    <h2>With a Lichess login</h2>
    <p>
      The login is done by <a href="https://lichess.org" target="_blank" rel="noopener noreferrer">Lichess</a>,
      a free, non-profit chess site. This site asks Lichess for no permissions: it learns the
      student's Lichess username, then cancels the access Lichess gave it. It never sees a
      Lichess password.
    </p>
    <p>The site's database then holds, for each student who logs in:</p>
    <ul>
      <li>their Lichess username;</li>
      <li>a copy of their progress (the same things saved in the browser, listed above);</li>
      <li>when the account was created, when they last logged in, and when progress was last saved.</li>
    </ul>
    <p>
      One cookie, <code>horsey-session</code>, keeps the student logged in for up to a year or
      until they log out. A second cookie, <code>horsey-oauth</code>, exists only for the ten
      minutes a login can take. Neither is used for tracking.
    </p>
    <p>
      Lichess has its own <a href="https://lichess.org/privacy" target="_blank" rel="noopener noreferrer">privacy policy</a>
      and <a href="https://lichess.org/terms-of-service" target="_blank" rel="noopener noreferrer">terms</a>.
      Lichess asks that account holders under 16 use kid mode, or have a parent's or guardian's
      consent.
    </p>
  </section>

  <section>
    <h2>The teacher's games library</h2>
    <p>
      The teacher keeps the students' games from their online league (Rookly) in a library on
      this site, to go over them in lessons. These are the games as the league exports them: the
      players' league names (which the league makes up), the event, date, moves and result. Only
      the teacher can open the library; the site refuses everyone else, including students.
    </p>
  </section>

  <section>
    <h2>What the site never does</h2>
    <ul>
      <li>Ask for or keep real names, email addresses, birthdays, photos, locations or passwords.</li>
      <li>Show ads, or use anything about a student to choose ads.</li>
      <li>Build a profile of a student for any purpose other than their chess lessons.</li>
      <li>Sell, rent or share student information.</li>
      <li>Use analytics, tracking cookies or third-party trackers.</li>
      <li>Offer chat, messages or any way for students to contact each other.</li>
    </ul>
  </section>

  <section>
    <h2>Who can see what</h2>
    <ul>
      <li>A student sees their own progress.</li>
      <li>The teacher can see the database, to keep it running and to delete data when asked.</li>
      <li>Only the teacher sees the games library.</li>
      <li>
        The companies that run the site's servers hold the data on the teacher's behalf (see
        below). They do not use it for anything else.
      </li>
    </ul>
  </section>

  <section>
    <h2>How long data is kept, and deleting it</h2>
    <p>
      A student's copy is kept until it is deleted. A logged-in student can use
      <strong>Delete my data</strong> in the account menu (top right) at any time; that deletes
      everything the site's database holds about them and logs them out. What is saved in their
      browser stays until the browser's data is cleared. <strong>Download my data</strong> in the
      same menu gives a copy of everything the database holds about them.
    </p>
    <p>
      The school, a parent or a student can also ask the teacher to delete a student's data, and
      it will be deleted promptly. Games are kept in the library until the teacher deletes them.
    </p>
  </section>

  <section>
    <h2>Children, parents and schools</h2>
    <p>
      This site is made for the teacher's own students, many of them under 13. It collects nothing
      from a student who doesn't log in. A student under 13 logs in only with the school's
      consent, given in place of a parent for use in the student's chess lessons only, as the
      Children's Online Privacy Protection Act (COPPA) allows. A parent can ask to see or delete
      their child's data, or ask that their child not log in, at any time.
    </p>
  </section>

  <section>
    <h2>FERPA</h2>
    <p>
      Under the Family Educational Rights and Privacy Act, the school decides what is done with
      its students' education records. The site uses student information only for the lessons it
      supports, at the teacher's direction, does not pass it on to anyone, and deletes it when the
      school asks.
    </p>
  </section>

  <section>
    <h2>Arkansas</h2>
    <p>
      As Arkansas's Student Online Personal Information Protection Act (Ark. Code § 6-18-109)
      requires, the site does not use student information for targeted advertising, does not build
      student profiles except for school purposes, does not sell or disclose student information,
      keeps reasonable security measures, and deletes a student's information when the school or
      district asks. In keeping with the Arkansas Children and Teens' Online Privacy Protection Act
      (Act 952 of 2025), students and parents can see and delete what the site holds, and can ask
      the teacher to correct it.
    </p>
  </section>

  <section>
    <h2>Services the site uses</h2>
    <ul>
      <li><strong>Vercel</strong> hosts the site. Like any web host, it keeps server logs (IP address, time, page requested), under <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">its privacy policy</a>.</li>
      <li><strong>Neon</strong> runs the database.</li>
      <li><strong>Lichess</strong> handles the login, as described above.</li>
    </ul>
  </section>

  <section>
    <h2>Security</h2>
    <p>
      The site is served only over HTTPS. The login cookie is signed so it cannot be forged and
      cannot be read by scripts. Every request for the games library or the account list is
      checked on the server, not just in the page. The database password is kept out of the site's
      public code.
    </p>
  </section>

  <section>
    <h2>Changes and questions</h2>
    <p>
      If this page changes, the date at the top changes with it. The site's code is public, so
      anyone can check what it does. Questions can be sent on the site's
      <a href="https://github.com/jwwells42/howthehorseymoves/issues" target="_blank" rel="noopener noreferrer">GitHub page</a>.
    </p>
  </section>
</Page>

<style>
  .updated {
    color: var(--ink-muted);
    font-size: var(--size-secondary);
    margin-bottom: 1.5rem;
  }
  section {
    margin-bottom: 1.75rem;
  }
  h2 {
    font-size: var(--size-large);
    margin-bottom: 0.5rem;
  }
  p,
  li {
    line-height: 1.6;
  }
  p + p {
    margin-top: 0.75rem;
  }
  ul {
    list-style: disc;
    padding-left: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }
  p + ul,
  ul + p {
    margin-top: 0.5rem;
  }
  a {
    text-decoration: underline;
  }
  code {
    font-family: inherit;
    font-weight: var(--weight-strong);
  }
</style>
