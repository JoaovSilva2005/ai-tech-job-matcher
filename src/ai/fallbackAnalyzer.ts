/**
 * Local keyword-based analyzer used when no AI API key is configured
 * (or when --fallback is passed). It guarantees the whole pipeline works
 * offline and without any cost, which also makes tests deterministic.
 */
import type { EnglishLevel, ScrapedJob, SeniorityLevel, TechRole } from '../scraper/types';
import type { ResumeAnalysis } from '../resume/resumeSchema';
import type { JobAnalysis } from './schemas';
import { classifyRole, isInternshipJob } from '../matcher/classifyRole';
import { normalizeSkills } from '../matcher/normalizeSkills';
import { containsKeyword } from '../utils/text';

const GENERAL_SKILLS = [
  'JavaScript',
  'TypeScript',
  'Python',
  'Java',
  'C#',
  'SQL',
  'HTML',
  'CSS',
  'React',
  'Angular',
  'Vue',
  'Node.js',
  'Express',
  'Spring',
  'FastAPI',
  'Flask',
  'Git',
  'GitHub',
  'Docker',
  'Kubernetes',
  'AWS',
  'Azure',
  'Linux',
  'REST',
  'GraphQL',
  'MongoDB',
];

const QA_SKILLS = [
  'Manual Testing',
  'Automated Testing',
  'Playwright',
  'Cypress',
  'Selenium',
  'Postman',
  'API Testing',
  'Bug Report',
  'Test Case',
  'Test Plan',
  'Regression Testing',
  'Performance Testing',
  'Scrum',
  'Kanban',
];

const DATA_SKILLS = ['Power BI', 'Excel', 'Pandas', 'SQL', 'Data Analysis', 'Dashboard'];

const DEVOPS_SKILLS = ['Docker', 'Kubernetes', 'CI/CD', 'AWS', 'Azure', 'Linux', 'Terraform'];

const SUPPORT_SKILLS = [
  'Help Desk',
  'Service Desk',
  'Troubleshooting',
  'Customer Support',
  'Ticket',
  'SLA',
];

const DEV_SKILLS = [
  'JavaScript',
  'TypeScript',
  'Python',
  'Java',
  'C#',
  'HTML',
  'CSS',
  'React',
  'Angular',
  'Vue',
  'Node.js',
  'Express',
  'Spring',
  'FastAPI',
  'Flask',
  'REST',
  'GraphQL',
];

const TOOLS = [
  'Git',
  'GitHub',
  'Postman',
  'Jira',
  'Docker',
  'Playwright',
  'Cypress',
  'Selenium',
  'Power BI',
  'Excel',
  'Figma',
];

const KEYWORD_ALIASES: Record<string, string[]> = {
  'Node.js': ['node.js', 'nodejs', 'node'],
  'C#': ['c#', 'csharp'],
  'API Testing': ['api testing', 'api tests', 'testing apis'],
  'Manual Testing': ['manual testing', 'manual tests', 'functional testing'],
  'Automated Testing': ['automated testing', 'test automation', 'automation'],
  'Bug Report': ['bug report', 'bug reports', 'bug reporting'],
  'Test Case': ['test case', 'test cases'],
  'Test Plan': ['test plan', 'test plans', 'test planning'],
  'Regression Testing': ['regression testing', 'regression'],
  'Performance Testing': ['performance testing', 'load testing', 'jmeter', 'k6'],
  'Power BI': ['power bi', 'powerbi'],
  'Data Analysis': ['data analysis', 'data analytics'],
  'Help Desk': ['help desk', 'helpdesk'],
  'Service Desk': ['service desk'],
  'Customer Support': ['customer support', 'customer service'],
  'CI/CD': ['ci/cd', 'cicd', 'continuous integration'],
  REST: ['rest api', 'restful', 'rest apis', 'rest'],
  'React Native': ['react native'],
};

function detectSkills(text: string, skills: string[]): string[] {
  const found: string[] = [];
  for (const skill of skills) {
    const aliases = KEYWORD_ALIASES[skill] ?? [skill];
    if (aliases.some((alias) => containsKeyword(text, alias))) {
      found.push(skill);
    }
  }
  return normalizeSkills(found);
}

export function detectSeniority(text: string): SeniorityLevel {
  const lower = text.toLowerCase();
  const seniorSignals = [
    'senior',
    'sênior',
    'sr.',
    'lead',
    'principal',
    'staff engineer',
    '5+ years',
    '6+ years',
    '7+ years',
  ];
  const midSignals = [
    'mid-level',
    'mid level',
    'pleno',
    'intermediate level',
    '3+ years',
    '4+ years',
  ];
  const internSignals = ['intern', 'internship', 'estágio', 'estagio', 'trainee'];
  const juniorSignals = [
    'junior',
    'júnior',
    'jr.',
    'jr ',
    'entry level',
    'entry-level',
    'student',
    'no prior experience',
  ];

  if (seniorSignals.some((s) => lower.includes(s))) return 'senior';
  if (midSignals.some((s) => lower.includes(s))) return 'mid';
  if (internSignals.some((s) => lower.includes(s))) return 'intern';
  if (juniorSignals.some((s) => lower.includes(s))) return 'junior';
  return 'unknown';
}

export function detectEnglishLevel(text: string): EnglishLevel {
  const lower = text.toLowerCase();
  const mentionIndex = lower.search(/english|inglês|ingles/);
  if (mentionIndex === -1) {
    return 'unknown';
  }

  // The level must be attached to the "english" mention itself (before it,
  // as in "advanced English", or right after it, as in "English: advanced"),
  // so levels of OTHER languages ("Portuguese: native") are never picked up.
  const level =
    '(fluent|fluente|native|advanced|avançado|avancado|intermediate|intermediário|intermediario|basic|básico|basico)';
  const english = '(?:english|inglês|ingles)';
  const patterns = [
    new RegExp(`${level}\\s+${english}`),
    new RegExp(`${english}[^.\\n]{0,50}?${level}`),
  ];

  for (const pattern of patterns) {
    const found = lower.match(pattern)?.[1];
    if (!found) continue;
    if (/fluent|fluente|native/.test(found)) return 'fluent';
    if (/advanced|avançado|avancado/.test(found)) return 'advanced';
    if (/intermediate|intermediário|intermediario/.test(found)) return 'intermediate';
    if (/basic|básico|basico/.test(found)) return 'basic';
  }
  return 'unknown';
}

function detectTargetRoles(text: string): TechRole[] {
  const lower = text.toLowerCase();
  const roles: TechRole[] = [];
  const checks: Array<[TechRole, string[]]> = [
    ['qa', ['qa', 'quality assurance', 'testing', 'test automation', 'playwright', 'cypress']],
    ['frontend', ['frontend', 'front-end', 'front end', 'react', 'angular', 'vue']],
    ['backend', ['backend', 'back-end', 'back end', 'node.js', 'apis']],
    ['fullstack', ['full stack', 'fullstack', 'full-stack']],
    ['mobile', ['mobile', 'react native', 'flutter', 'android', 'ios']],
    ['data', ['data analysis', 'data analyst', 'power bi', 'analytics']],
    ['devops', ['devops', 'docker', 'kubernetes', 'cloud engineer']],
    ['support', ['technical support', 'help desk', 'service desk']],
  ];
  for (const [role, keywords] of checks) {
    if (keywords.some((k) => lower.includes(k))) roles.push(role);
  }
  return roles.length > 0 ? roles : ['unknown'];
}

export function fallbackAnalyzeResume(resumeText: string): ResumeAnalysis {
  const technicalSkills = detectSkills(resumeText, GENERAL_SKILLS);
  const qaSkills = detectSkills(resumeText, QA_SKILLS);
  const dataSkills = detectSkills(resumeText, DATA_SKILLS);
  const devopsSkills = detectSkills(resumeText, DEVOPS_SKILLS);
  const supportSkills = detectSkills(resumeText, SUPPORT_SKILLS);
  const developmentSkills = detectSkills(resumeText, DEV_SKILLS);
  const tools = detectSkills(resumeText, TOOLS);
  const englishLevel = detectEnglishLevel(resumeText);
  const detectedSeniority = detectSeniority(resumeText);
  const targetRoles = detectTargetRoles(resumeText);

  const strengths: string[] = [];
  if (technicalSkills.length >= 4) {
    strengths.push(`Solid technical base: ${technicalSkills.slice(0, 5).join(', ')}`);
  }
  if (qaSkills.length > 0) {
    strengths.push(`QA-oriented skills: ${qaSkills.slice(0, 4).join(', ')}`);
  }
  if (englishLevel === 'advanced' || englishLevel === 'fluent') {
    strengths.push(`Strong English level (${englishLevel})`);
  }
  if (containsKeyword(resumeText, 'remote')) {
    strengths.push('Remote work experience');
  }
  if (strengths.length === 0) {
    strengths.push('Motivated candidate with foundational tech knowledge');
  }

  const improvementAreas: string[] = [];
  if (!qaSkills.includes('Playwright') && !qaSkills.includes('Cypress')) {
    improvementAreas.push('Hands-on experience with modern test automation (Playwright/Cypress)');
  }
  if (!qaSkills.includes('API Testing')) {
    improvementAreas.push('API testing practice (Postman, REST assertions)');
  }
  if (!devopsSkills.includes('Docker')) {
    improvementAreas.push('Basic containers/CI-CD knowledge (Docker, GitHub Actions)');
  }
  if (englishLevel === 'basic' || englishLevel === 'unknown') {
    improvementAreas.push('English communication for international teams');
  }

  const languages: ResumeAnalysis['languages'] = [];
  if (englishLevel !== 'unknown') {
    languages.push({ language: 'English', level: englishLevel });
  }
  if (/portugu[eê]s|portuguese/i.test(resumeText)) {
    languages.push({ language: 'Portuguese', level: 'fluent' });
  }

  const summary =
    `${detectedSeniority !== 'unknown' ? capitalize(detectedSeniority) : 'Tech'} candidate ` +
    `with ${technicalSkills.length} detected technical skills` +
    `${qaSkills.length ? `, including QA skills (${qaSkills.slice(0, 3).join(', ')})` : ''}. ` +
    `Main interests: ${targetRoles.filter((r) => r !== 'unknown').join(', ') || 'general tech roles'}.`;

  return {
    detectedSeniority,
    targetRoles,
    technicalSkills,
    qaSkills,
    developmentSkills,
    dataSkills,
    devopsSkills,
    supportSkills,
    tools,
    languages,
    strengths,
    improvementAreas,
    summary,
    fallbackMode: true,
  };
}

export function fallbackAnalyzeJob(job: ScrapedJob): JobAnalysis {
  const fullText = `${job.title}\n${job.description}`;
  const role = classifyRole(job.title, job.description);
  const seniorityFromTitle = detectSeniority(job.title);
  const seniorityLevel =
    seniorityFromTitle !== 'unknown' ? seniorityFromTitle : detectSeniority(job.description);

  const allSkills = detectSkills(fullText, [
    ...GENERAL_SKILLS,
    ...QA_SKILLS,
    ...DATA_SKILLS,
    ...SUPPORT_SKILLS,
  ]);
  const tools = detectSkills(fullText, TOOLS);
  const automationTools = detectSkills(fullText, ['Playwright', 'Cypress', 'Selenium']);
  const apiTools = detectSkills(fullText, ['Postman', 'REST', 'GraphQL']);
  const programmingLanguages = detectSkills(fullText, [
    'JavaScript',
    'TypeScript',
    'Python',
    'Java',
    'C#',
    'SQL',
  ]);
  const frameworks = detectSkills(fullText, [
    'React',
    'Angular',
    'Vue',
    'Express',
    'Spring',
    'FastAPI',
    'Flask',
    'React Native',
    'Flutter',
  ]);

  // Split required vs nice-to-have using the description sections when present
  const lower = job.description.toLowerCase();
  const niceIndex = lower.search(/nice[ -]to[ -]have|differentials|diferenciais|plus:/);
  const requiredText = niceIndex > 0 ? fullText.slice(0, niceIndex + job.title.length) : fullText;
  const niceText = niceIndex > 0 ? job.description.slice(niceIndex) : '';

  const requiredSkills = detectSkills(requiredText, [
    ...GENERAL_SKILLS,
    ...QA_SKILLS,
    ...DATA_SKILLS,
    ...SUPPORT_SKILLS,
  ]);
  const niceToHaveSkills = niceText
    ? detectSkills(niceText, [
        ...GENERAL_SKILLS,
        ...QA_SKILLS,
        ...DATA_SKILLS,
        ...SUPPORT_SKILLS,
      ]).filter((s) => !requiredSkills.includes(s))
    : [];

  const englishLevel = detectEnglishLevel(fullText);
  const englishRequired = englishLevel !== 'unknown';
  const testingRequired =
    role === 'qa' ||
    detectSkills(fullText, ['Manual Testing', 'Automated Testing', 'Test Case']).length > 0;
  const apiTestingRequired =
    containsKeyword(fullText, 'api testing') || (apiTools.length > 0 && role === 'qa');
  const automationRequired = automationTools.length > 0 || containsKeyword(fullText, 'automation');
  const juniorFriendly =
    seniorityLevel === 'junior' ||
    seniorityLevel === 'intern' ||
    isInternshipJob(job.title, job.description);

  const redFlags: string[] = [];
  if (seniorityLevel === 'senior') {
    redFlags.push('Senior-level position: likely too advanced for junior candidates');
  }
  if (requiredSkills.length >= 10) {
    redFlags.push('Very long list of required skills for a single role');
  }
  if (job.description.length < 200) {
    redFlags.push('Short/generic description: confirm details before applying');
  }

  const recommendedStudyTopics = [...automationTools, ...apiTools, ...requiredSkills]
    .filter((s, i, arr) => arr.indexOf(s) === i)
    .slice(0, 5);

  const summary =
    `${job.title} at ${job.company} (${job.workMode}). ` +
    `Role: ${role}, seniority: ${seniorityLevel}. ` +
    `Key skills: ${requiredSkills.slice(0, 5).join(', ') || 'not clearly specified'}.`;

  return {
    normalizedTitle: job.title.trim(),
    role,
    seniorityLevel,
    requiredSkills: requiredSkills.length > 0 ? requiredSkills : allSkills,
    niceToHaveSkills,
    tools,
    programmingLanguages,
    frameworks,
    automationTools,
    apiTools,
    englishRequired,
    englishLevel,
    testingRequired,
    apiTestingRequired,
    automationRequired,
    juniorFriendly,
    summary,
    redFlags,
    recommendedStudyTopics,
    fallbackMode: true,
  };
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
