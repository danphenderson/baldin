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
          Take control of your job search with an open-source, local-first
          workspace that tracks applications, extracts leads, and keeps your
          data under your control.
        </p>
        <div className={styles.heroCta}>
          <Link className={clsx('button button--lg', styles.ctaPrimary)} to="/docs/getting-started/quickstart">
            Get Started
          </Link>
          <Link
            className={clsx('button button--lg button--outline', styles.ctaSecondary)}
            href="https://github.com/danphenderson/baldin"
          >
            View on GitHub
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
    title: 'Command Center',
    icon: '🎯',
    description:
      'Action items, pipeline metrics, and an activity feed — everything you need to see what to do next at a glance.',
  },
  {
    title: 'Networking & Messaging',
    icon: '🤝',
    description:
      'Build and manage professional connections. Direct and group conversations keep your networking organized alongside your search.',
  },
  {
    title: 'Local-First & Private',
    icon: '🔒',
    description:
      'Your data stays on your machine. MIT-licensed, fully open source, no tracking, no lock-in. You own everything.',
  },
];

function Features() {
  return (
    <section className={styles.features}>
      <div className={styles.featuresInner}>
        <h2 className={styles.sectionTitle}>Everything you need in one workspace</h2>
        <p className={styles.sectionSub}>
          Stop juggling spreadsheets, email threads, and browser tabs. Baldin
          brings your entire job search into a single, intelligent workspace.
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
  {step: '1', title: 'Clone the repo', code: 'git clone https://github.com/danphenderson/baldin.git'},
  {step: '2', title: 'Start the stack', code: 'docker-compose up --build'},
  {step: '3', title: 'Open Baldin', code: 'open http://localhost:5173'},
];

function HowItWorks() {
  return (
    <section className={styles.howItWorks}>
      <div className={styles.howInner}>
        <h2 className={styles.sectionTitle}>Up and running in minutes</h2>
        <p className={styles.sectionSub}>
          Baldin runs locally with Docker Compose. No cloud account, no API keys,
          no sign-up required.
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

function OpenSource() {
  return (
    <section className={styles.openSource}>
      <div className={styles.openSourceInner}>
        <h2 className={styles.sectionTitle}>Open source. Local first. Yours.</h2>
        <p className={styles.sectionSub}>
          Baldin is MIT-licensed and built in the open. Your job search data
          never leaves your machine unless you decide otherwise. No telemetry,
          no tracking, no vendor lock-in.
        </p>
        <div className={styles.trustBadges}>
          <div className={styles.trustItem}>
            <strong>MIT License</strong>
            <span>Free to use, modify, and distribute</span>
          </div>
          <div className={styles.trustItem}>
            <strong>Local-First</strong>
            <span>Data stays on your machine by default</span>
          </div>
          <div className={styles.trustItem}>
            <strong>No Tracking</strong>
            <span>Zero telemetry, zero analytics, zero surveillance</span>
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
          Baldin is in developer preview. Clone the repo, spin up the stack, and
          start organizing your job search today.
        </p>
        <div className={styles.heroCta}>
          <Link className={clsx('button button--lg', styles.ctaPrimary)} to="/docs/getting-started/quickstart">
            Read the Docs
          </Link>
          <Link
            className={clsx('button button--lg button--outline', styles.ctaSecondary)}
            href="https://github.com/danphenderson/baldin"
          >
            Star on GitHub
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
        <OpenSource />
        <BottomCta />
      </main>
    </Layout>
  );
}
