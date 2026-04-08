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
          Take control of your job search with a local-first workspace in
          developer preview that tracks applications, extracts leads, and keeps
          your workflow under your control.
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
      'Runs locally with a private engineering repo, controlled release planning, and data that stays on your machine by default.',
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
  {step: '1', title: 'Use an approved checkout', code: 'git clone <approved-baldin-remote>'},
  {step: '2', title: 'Start the stack', code: 'docker-compose up --build'},
  {step: '3', title: 'Open Baldin', code: 'open http://localhost:5173'},
];

function HowItWorks() {
  return (
    <section className={styles.howItWorks}>
      <div className={styles.howInner}>
        <h2 className={styles.sectionTitle}>Up and running in minutes</h2>
        <p className={styles.sectionSub}>
          Baldin runs locally with Docker Compose. Use an approved repository
          checkout and bring up the full preview stack on your machine.
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
        <h2 className={styles.sectionTitle}>Private preview. Local first. Yours.</h2>
        <p className={styles.sectionSub}>
          Baldin is currently developed in a private engineering repository.
          Source access is limited to approved collaborators while the product,
          deployment path, and release controls are still being hardened.
        </p>
        <div className={styles.trustBadges}>
          <div className={styles.trustItem}>
            <strong>Private Repo</strong>
            <span>Source access is limited to approved collaborators</span>
          </div>
          <div className={styles.trustItem}>
            <strong>Local-First</strong>
            <span>Data stays on your machine by default</span>
          </div>
          <div className={styles.trustItem}>
            <strong>Developer Preview</strong>
            <span>Release posture and deployment flow are still being hardened</span>
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
          Baldin is in developer preview. Use an approved checkout, spin up the
          stack, and start organizing your job search locally.
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
