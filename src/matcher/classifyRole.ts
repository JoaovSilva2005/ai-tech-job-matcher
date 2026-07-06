import type { TechRole } from '../scraper/types';
import { containsKeyword } from '../utils/text';

interface RoleSignals {
  role: Exclude<TechRole, 'all' | 'unknown' | 'internship' | 'fullstack'>;
  keywords: string[];
}

const ROLE_SIGNALS: RoleSignals[] = [
  {
    role: 'qa',
    keywords: [
      'qa',
      'quality assurance',
      'tester',
      'test automation',
      'test analyst',
      'testing',
      'playwright',
      'cypress',
      'selenium',
      'test case',
      'test plan',
      'bug report',
    ],
  },
  {
    role: 'frontend',
    keywords: ['frontend', 'front-end', 'front end', 'react', 'angular', 'vue', 'html', 'css'],
  },
  {
    role: 'backend',
    keywords: ['backend', 'back-end', 'back end', 'node.js', 'java', 'python', 'api', 'sql', 'spring', 'microservices'],
  },
  {
    role: 'mobile',
    keywords: ['mobile', 'react native', 'flutter', 'android', 'ios', 'swift', 'kotlin'],
  },
  {
    role: 'data',
    keywords: ['power bi', 'data analyst', 'data analysis', 'analytics', 'data engineer', 'etl', 'dashboard', 'tableau'],
  },
  {
    role: 'devops',
    keywords: ['devops', 'docker', 'kubernetes', 'ci/cd', 'cloud', 'aws', 'azure', 'terraform', 'sre', 'infrastructure'],
  },
  {
    role: 'support',
    keywords: ['support', 'help desk', 'helpdesk', 'service desk', 'troubleshooting', 'technical support'],
  },
];

const FULLSTACK_KEYWORDS = ['full stack', 'fullstack', 'full-stack'];
const INTERNSHIP_KEYWORDS = ['intern', 'internship', 'estágio', 'estagio', 'estagiário', 'trainee'];

function scoreRole(keywords: string[], title: string, description: string): number {
  let score = 0;
  for (const keyword of keywords) {
    if (containsKeyword(title, keyword)) score += 3;
    if (containsKeyword(description, keyword)) score += 1;
  }
  return score;
}

export function isInternshipJob(jobTitle: string, description: string): boolean {
  return INTERNSHIP_KEYWORDS.some(
    (k) => containsKeyword(jobTitle, k) || containsKeyword(description, k)
  );
}

export function classifyRole(jobTitle: string, description: string): TechRole {
  const title = jobTitle.toLowerCase();
  const desc = description.toLowerCase();

  // Explicit full stack always wins over separate frontend/backend signals
  if (FULLSTACK_KEYWORDS.some((k) => containsKeyword(title, k) || containsKeyword(desc, k))) {
    return 'fullstack';
  }

  const scores = ROLE_SIGNALS.map((signal) => ({
    role: signal.role,
    score: scoreRole(signal.keywords, title, desc),
  })).sort((a, b) => b.score - a.score);

  const best = scores[0];
  const second = scores[1];

  if (best.score === 0) {
    // No tech signal at all: an internship posting is still classifiable
    return isInternshipJob(title, desc) ? 'internship' : 'unknown';
  }

  // Strong frontend AND backend signals (without explicit "full stack") -> fullstack
  const frontend = scores.find((s) => s.role === 'frontend');
  const backend = scores.find((s) => s.role === 'backend');
  if (
    frontend &&
    backend &&
    frontend.score >= 2 &&
    backend.score >= 2 &&
    (best.role === 'frontend' || best.role === 'backend') &&
    Math.abs(frontend.score - backend.score) <= 2
  ) {
    return 'fullstack';
  }

  // QA takes precedence on ties because testing tools often co-occur
  // with dev keywords inside QA job descriptions.
  if (second && best.score === second.score) {
    if (best.role === 'qa' || second.role === 'qa') return 'qa';
  }

  return best.role;
}
