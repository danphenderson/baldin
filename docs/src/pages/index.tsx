import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import styles from './index.module.css';

function Hero() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={styles.hero}>
      <div className={styles.heroInner}>
        <h1 className={styles.heroTitle}>{siteConfig.title}</h1>
        <p className={styles.heroTagline}>{siteConfig.tagline}</p>
        <p className={styles.heroSub}>
          Today Baldin is a private, local-first job-search workspace for
          applications, leads, documents, and agent-assisted workflow. The
          target direction is applicant-side labor market observability, while
          this repo stays focused on local development, contributor workflow,
          architecture review, and release-path planning.
        </p>
        <div className={styles.heroCta}>
          <Link className={clsx('button button--lg', styles.ctaPrimary)} to="/docs/getting-started/quickstart">
            Get Started
          </Link>
          <Link
            className={clsx('button button--lg button--outline', styles.ctaSecondary)}
            to="/docs/architecture/system-overview"
          >
            See The Architecture
          </Link>
        </div>
      </div>
    </header>
  );
}

const features = [
  {
    title: 'Application Board',
    icon: '📋',
    description:
      'Kanban-style board with drag-and-drop stage progression. Track every application from discovery through offer with full status history.',
  },
  {
    title: 'Lead Extraction',
    icon: '🔍',
    description:
      'Paste a URL and let Baldin extract job postings automatically. AI-backed extraction pulls structured data from any listing.',
  },
  {
    title: 'Document Workspace',
    icon: '📝',
    description:
      'Version-controlled resumes, cover letters, and notes with real-time collaborative editing. Link documents directly to applications.',
  },
  {
    title: 'Dashboard',
    icon: '🎯',
    description:
      'Action items, pipeline metrics, and a personal activity feed — the current workspace hub for deciding what to do next.',
  },
  {
    title: 'Networking & Messaging',
    icon: '🤝',
    description:
      'Opt-in discoverability, private connections, and direct or group conversations that stay tied to your own workflow.',
  },
  {
    title: 'Local-First & Private',
    icon: '🔒',
    description:
      'User-owned data stays local by default. Sharing is minimal and opt-in, and future shared signals are intended to use coarse bands and confidence tiers.',
  },
];

function Features() {
  return (
    <section className={styles.features}>
      <div className={styles.featuresInner}>
        <h2 className={styles.sectionTitle}>Current workspace surfaces</h2>
        <p className={styles.sectionSub}>
          The shipped stack today focuses on private workflow surfaces for
          tracking, documents, automation, and opt-in network context.
        </p>
        <div className={styles.featureGrid}>
          {features.map((f) => (
            <div key={f.title} className={styles.featureCard}>
              <div className={styles.featureIcon}>{f.icon}</div>
              <h3 className={styles.featureTitle}>{f.title}</h3>
              <p className={styles.featureDesc}>{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const steps = [
  {step: '1', title: 'Use an approved checkout', code: 'git clone <approved-baldin-remote>'},
  {step: '2', title: 'Start the stack', code: 'docker-compose up --build --watch'},
  {step: '3', title: 'Open Baldin', code: 'open http://localhost:5173'},
];

function HowItWorks() {
  return (
    <section className={styles.howItWorks}>
      <div className={styles.howInner}>
        <h2 className={styles.sectionTitle}>Up and running in minutes</h2>
        <p className={styles.sectionSub}>
          Baldin runs locally with Docker Compose. Use an approved repository
          checkout and keep Compose Watch running as the supported live-edit
          loop.
        </p>
        <div className={styles.stepsGrid}>
          {steps.map((s) => (
            <div key={s.step} className={styles.stepCard}>
              <div className={styles.stepNumber}>{s.step}</div>
              <h3 className={styles.stepTitle}>{s.title}</h3>
              <code className={styles.stepCode}>{s.code}</code>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CurrentPosture() {
  return (
    <section className={styles.posture}>
      <div className={styles.postureInner}>
        <h2 className={styles.sectionTitle}>Today vs Target</h2>
        <p className={styles.sectionSub}>
          Today Baldin is a private, local-first job-search OS. The target
          direction is an applicant-side labor market observability platform,
          but this repo currently exists for local development, contributor
          workflow, architecture review, and release-path planning rather than
          as a production deployment blueprint.
        </p>
        <div className={styles.trustBadges}>
          <div className={styles.trustItem}>
            <strong>Private by Default</strong>
            <span>User-owned data comes first and sharing stays minimal</span>
          </div>
          <div className={styles.trustItem}>
            <strong>Opt-In Discovery</strong>
            <span>Profiles and broader visibility must be enabled on purpose</span>
          </div>
          <div className={styles.trustItem}>
            <strong>Future Signal Guardrails</strong>
            <span>Coarse bands, time decay, and confidence tiers over exact counts</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function BottomCta() {
  return (
    <section className={styles.bottomCta}>
      <div className={styles.bottomCtaInner}>
        <h2 className={styles.bottomCtaTitle}>Ready to take control?</h2>
        <p className={styles.bottomCtaSub}>
          Use an approved checkout, spin up the local stack, and work from the
          current workspace docs.
        </p>
        <div className={styles.heroCta}>
          <Link className={clsx('button button--lg', styles.ctaPrimary)} to="/docs/getting-started/quickstart">
            Read the Docs
          </Link>
          <Link
            className={clsx('button button--lg button--outline', styles.ctaSecondary)}
            to="/docs/engineering/release-roadmap"
          >
            Track Release Readiness
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Home(): React.JSX.Element {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <Hero />
      <main>
        <Features />
        <HowItWorks />
        <CurrentPosture />
        <BottomCta />
      </main>
    </Layout>
  );
}
