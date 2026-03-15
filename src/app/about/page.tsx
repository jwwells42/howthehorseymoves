"use client";

import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="min-h-screen p-6 max-w-3xl mx-auto">
      <Link
        href="/"
        className="text-sm text-muted hover:text-foreground mb-6 inline-block"
      >
        &larr; Back to home
      </Link>

      <h1 className="text-3xl font-bold mb-6">About How The Horsey Moves</h1>

      {/* What it is */}
      <Section title="What is this?">
        <p>
          How The Horsey Moves is a free, open-source chess puzzle trainer
          designed for young students in classroom settings. It teaches how each
          chess piece moves through interactive puzzles, board setup exercises,
          checkmate practice, and more.
        </p>
        <p>
          There are no accounts, no ads, no chat, no memberships, and no data
          collection. Everything runs in your browser. It will always be free.
        </p>
      </Section>

      {/* Privacy & COPPA */}
      <Section title="Privacy & Student Safety">
        <p>
          This site is designed with student privacy as a first principle:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>
            <strong>No personal information is collected</strong> — no names,
            emails, or accounts
          </li>
          <li>
            <strong>No server-side data storage</strong> — all progress is saved
            locally in the student&apos;s browser using localStorage
          </li>
          <li>
            <strong>No cookies</strong> for tracking or analytics
          </li>
          <li>
            <strong>No third-party trackers, ads, or analytics</strong>
          </li>
          <li>
            <strong>No chat or social features</strong>
          </li>
          <li>
            <strong>No external API calls</strong> — the app runs entirely
            client-side
          </li>
        </ul>
        <p>
          Because no personal information is collected from children (or anyone
          else), COPPA (Children&apos;s Online Privacy Protection Act)
          obligations regarding parental consent do not apply. The site does not
          collect, use, or disclose personal information from users of any age.
        </p>
        <p>
          The site is hosted on{" "}
          <a
            href="https://vercel.com"
            className="underline hover:text-foreground"
            target="_blank"
            rel="noopener noreferrer"
          >
            Vercel
          </a>
          , which may collect standard web server logs (IP addresses, request
          timestamps) as part of normal hosting operations. These logs are not
          accessible to us and are governed by{" "}
          <a
            href="https://vercel.com/legal/privacy-policy"
            className="underline hover:text-foreground"
            target="_blank"
            rel="noopener noreferrer"
          >
            Vercel&apos;s Privacy Policy
          </a>
          . We do not use Vercel Analytics or any other analytics service.
        </p>
      </Section>

      {/* License */}
      <Section title="License">
        <p>
          How The Horsey Moves is open-source software licensed under the{" "}
          <a
            href="https://www.gnu.org/licenses/agpl-3.0.en.html"
            className="underline hover:text-foreground"
            target="_blank"
            rel="noopener noreferrer"
          >
            GNU Affero General Public License v3.0
          </a>{" "}
          (AGPL-3.0). The source code is available on{" "}
          <a
            href="https://github.com/jwwells42/howthehorseymoves"
            className="underline hover:text-foreground"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          .
        </p>
        <p>
          You are free to use, modify, and distribute this software under the
          terms of the AGPL-3.0 license.
        </p>
      </Section>

      {/* Credits */}
      <Section title="Credits & Attributions">
        <Credit
          title="Practice Puzzles"
          description="Tactics and checkmate practice puzzles sourced from the"
          source="Lichess Puzzle Database"
          note="Licensed under Creative Commons CC0 (public domain). Data from"
          linkText="database.lichess.org"
          linkHref="https://database.lichess.org/#puzzles"
        />
        <Credit
          title="Chess Piece SVGs"
          description="Piece graphics by Colin M.L. Burnett (cburnett), licensed under"
          source="CC BY-SA 3.0"
          linkText="Wikimedia Commons"
          linkHref="https://commons.wikimedia.org/wiki/Category:SVG_chess_pieces"
        />
        <Credit
          title="Framework"
          description="Built with"
          source="Next.js, React, TypeScript, and Tailwind CSS"
          note="Hosted on Vercel"
        />
      </Section>

      {/* Contact */}
      <Section title="For Administrators">
        <p>
          If you are a school administrator evaluating this tool for classroom
          use, here is a summary:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>No student data is collected or transmitted to any server</li>
          <li>No accounts or login required</li>
          <li>No ads, tracking, or third-party analytics</li>
          <li>No in-app purchases or premium features</li>
          <li>Free and open-source (AGPL-3.0)</li>
          <li>Works on Chromebooks and school networks</li>
          <li>
            Progress is saved locally in the browser — clearing browser data
            resets it
          </li>
        </ul>
        <p>
          For questions or concerns, please open an issue on our{" "}
          <a
            href="https://github.com/jwwells42/howthehorseymoves/issues"
            className="underline hover:text-foreground"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub repository
          </a>
          .
        </p>
      </Section>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold mb-3">{title}</h2>
      <div className="space-y-3 text-sm text-muted leading-relaxed">
        {children}
      </div>
    </section>
  );
}

function Credit({
  title,
  description,
  source,
  author,
  note,
  linkText,
  linkHref,
}: {
  title: string;
  description: string;
  source: string;
  author?: string;
  note?: string;
  linkText?: string;
  linkHref?: string;
}) {
  return (
    <div className="p-4 rounded-lg border border-card-border bg-card">
      <h3 className="font-bold text-foreground mb-1">{title}</h3>
      <p>
        {description}{" "}
        <em>{source}</em>
        {author && ` by ${author}`}
        {". "}
        {note && (
          <>
            {note}{" "}
            {linkText && linkHref && (
              <a
                href={linkHref}
                className="underline hover:text-foreground"
                target="_blank"
                rel="noopener noreferrer"
              >
                {linkText}
              </a>
            )}
            .
          </>
        )}
        {!note && linkText && linkHref && (
          <>
            {" "}
            <a
              href={linkHref}
              className="underline hover:text-foreground"
              target="_blank"
              rel="noopener noreferrer"
            >
              {linkText}
            </a>
            .
          </>
        )}
      </p>
    </div>
  );
}
