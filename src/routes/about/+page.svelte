<main class="page">
  <a href="/" class="back-link">&larr; Back to home</a>

  <h1>About How The Horsey Moves</h1>

  <section>
    <h2>What is this?</h2>
    <div class="prose">
      <p>
        How The Horsey Moves is a free, open-source chess trainer designed for young students
        in classroom settings. It teaches how each chess piece moves through interactive puzzles,
        board setup exercises, checkmate patterns, tactics, endings, openings, model games,
        blindfold training, and play against the computer.
      </p>
      <p>
        There are no accounts, no ads, no chat, no memberships, and no data collection.
        Everything runs in your browser. It will always be free.
      </p>
    </div>
  </section>

  <section>
    <h2>Privacy &amp; Student Safety</h2>
    <div class="prose">
      <p>This site is designed with student privacy as a first principle:</p>
      <ul>
        <li><strong>No personal information is collected</strong> — no names, emails, or accounts</li>
        <li><strong>No server-side data storage</strong> — all progress is saved locally in the student's browser using localStorage</li>
        <li><strong>No cookies</strong> for tracking or analytics</li>
        <li><strong>No third-party trackers, ads, or analytics</strong></li>
        <li><strong>No chat or social features</strong></li>
        <li><strong>No external API calls</strong> — the app runs entirely client-side</li>
      </ul>
      <p>
        Because no personal information is collected from children (or anyone else), COPPA
        (Children's Online Privacy Protection Act) obligations regarding parental consent do not
        apply. The site does not collect, use, or disclose personal information from users of any age.
      </p>
      <p>
        The site is hosted on <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">Vercel</a>,
        which may collect standard web server logs (IP addresses, request timestamps) as part of
        normal hosting operations. These logs are not accessible to us and are governed by
        <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">Vercel's Privacy Policy</a>.
      </p>
    </div>
  </section>

  <section>
    <h2>License</h2>
    <div class="prose">
      <p>
        How The Horsey Moves is open-source software licensed under the
        <a href="https://www.gnu.org/licenses/agpl-3.0.en.html" target="_blank" rel="noopener noreferrer">GNU Affero General Public License v3.0</a>
        (AGPL-3.0). The source code is available on
        <a href="https://github.com/jwwells42/howthehorseymoves" target="_blank" rel="noopener noreferrer">GitHub</a>.
      </p>
      <p>You are free to use, modify, and distribute this software under the terms of the AGPL-3.0 license.</p>
    </div>
  </section>

  <section>
    <h2>Credits &amp; Attributions</h2>
    <div class="credits">
      <div class="credit-card">
        <h3>Practice Puzzles</h3>
        <p>Tactics and checkmate practice puzzles sourced from the <em>Lichess Puzzle Database</em>.
        Licensed under Creative Commons CC0 (public domain). Data from
        <a href="https://database.lichess.org/#puzzles" target="_blank" rel="noopener noreferrer">database.lichess.org</a>.</p>
      </div>
      <div class="credit-card">
        <h3>Chess Piece SVGs</h3>
        <p>Piece graphics by Colin M.L. Burnett (cburnett), licensed under <em>CC BY-SA 3.0</em>.
        <a href="https://commons.wikimedia.org/wiki/Category:SVG_chess_pieces" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a>.</p>
      </div>
      <div class="credit-card">
        <h3>Framework</h3>
        <p>Built with <em>SvelteKit, Svelte 5, and TypeScript</em>. Hosted on Vercel.</p>
      </div>
    </div>
  </section>

  <section>
    <h2>For Administrators</h2>
    <div class="prose">
      <p>If you are a school administrator evaluating this tool for classroom use, here is a summary:</p>
      <ul>
        <li>No student data is collected or transmitted to any server</li>
        <li>No accounts or login required</li>
        <li>No ads, tracking, or third-party analytics</li>
        <li>No in-app purchases or premium features</li>
        <li>Free and open-source (AGPL-3.0)</li>
        <li>Works on Chromebooks and school networks</li>
        <li>Progress is saved locally in the browser — clearing browser data resets it</li>
      </ul>
      <p>
        For questions or concerns, please open an issue on our
        <a href="https://github.com/jwwells42/howthehorseymoves/issues" target="_blank" rel="noopener noreferrer">GitHub repository</a>.
      </p>
    </div>
  </section>
</main>

<style>
  .page {
    min-height: 100vh;
    padding: 1.5rem;
    max-width: 48rem;
    margin: 0 auto;
  }
  .back-link {
    font-size: 0.875rem;
    color: var(--text-muted);
    display: inline-block;
    margin-bottom: 1.5rem;
  }
  .back-link:hover { color: var(--foreground); }

  h1 {
    font-size: 1.875rem;
    font-weight: bold;
    margin-bottom: 1.5rem;
  }

  section {
    margin-bottom: 2rem;
  }
  section h2 {
    font-size: 1.25rem;
    font-weight: bold;
    margin-bottom: 0.75rem;
  }

  .prose {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    font-size: 0.875rem;
    color: var(--text-muted);
    line-height: 1.6;
  }
  .prose a {
    text-decoration: underline;
  }
  .prose a:hover { color: var(--foreground); }
  .prose ul {
    list-style: disc;
    padding-left: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .credits {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .credit-card {
    padding: 1rem;
    border-radius: 0.5rem;
    border: 1px solid var(--card-border);
    background: var(--card-bg);
  }
  .credit-card h3 {
    font-weight: bold;
    color: var(--foreground);
    margin-bottom: 0.25rem;
  }
  .credit-card p {
    font-size: 0.875rem;
    color: var(--text-muted);
    line-height: 1.6;
  }
  .credit-card a {
    text-decoration: underline;
  }
  .credit-card a:hover { color: var(--foreground); }
</style>
