/**
 * Skill normalization: maps aliases and inconsistent spellings to a single
 * canonical name so that resume skills and job skills can be compared fairly
 * (e.g. "NodeJS", "node.js" and "Node" all become "Node.js").
 */

const CANONICAL_SKILLS: Record<string, string[]> = {
  JavaScript: ['javascript', 'js', 'ecmascript'],
  TypeScript: ['typescript', 'ts'],
  Python: ['python', 'python3'],
  Java: ['java'],
  'C#': ['c#', 'csharp', 'c sharp'],
  SQL: ['sql', 'mysql', 'postgresql', 'postgres', 'sql server'],
  HTML: ['html', 'html5'],
  CSS: ['css', 'css3'],
  React: ['react', 'react.js', 'reactjs'],
  Angular: ['angular', 'angularjs'],
  Vue: ['vue', 'vue.js', 'vuejs'],
  'Node.js': ['node.js', 'nodejs', 'node'],
  Express: ['express', 'express.js', 'expressjs'],
  Spring: ['spring', 'spring boot', 'springboot'],
  FastAPI: ['fastapi'],
  Flask: ['flask'],
  Git: ['git'],
  GitHub: ['github'],
  Docker: ['docker'],
  Kubernetes: ['kubernetes', 'k8s'],
  AWS: ['aws', 'amazon web services'],
  Azure: ['azure'],
  Linux: ['linux'],
  Playwright: ['playwright'],
  Cypress: ['cypress'],
  Selenium: ['selenium', 'selenium webdriver'],
  Postman: ['postman'],
  'API Testing': ['api testing', 'api tests', 'rest api testing'],
  'Manual Testing': ['manual testing', 'manual tests', 'functional testing'],
  'Automated Testing': ['automated testing', 'test automation', 'automation testing'],
  'Regression Testing': ['regression testing', 'regression tests'],
  'Performance Testing': ['performance testing', 'load testing', 'jmeter', 'k6'],
  'Test Case': ['test case', 'test cases'],
  'Test Plan': ['test plan', 'test plans', 'test planning'],
  'Bug Report': ['bug report', 'bug reports', 'bug reporting', 'defect report'],
  Scrum: ['scrum'],
  Kanban: ['kanban'],
  Agile: ['agile', 'agile methodologies'],
  'Power BI': ['power bi', 'powerbi'],
  Excel: ['excel', 'microsoft excel'],
  Pandas: ['pandas'],
  'Data Analysis': ['data analysis', 'data analytics', 'analytics'],
  Dashboard: ['dashboard', 'dashboards'],
  'Help Desk': ['help desk', 'helpdesk'],
  'Service Desk': ['service desk', 'servicedesk'],
  Troubleshooting: ['troubleshooting'],
  'Customer Support': ['customer support', 'customer service'],
  SLA: ['sla', 'slas'],
  'React Native': ['react native', 'react-native'],
  Flutter: ['flutter'],
  Android: ['android'],
  iOS: ['ios'],
  'CI/CD': ['ci/cd', 'cicd', 'ci cd', 'continuous integration', 'continuous delivery'],
  REST: ['rest', 'rest api', 'restful', 'restful apis'],
  GraphQL: ['graphql'],
  MongoDB: ['mongodb', 'mongo'],
  Jira: ['jira'],
  Figma: ['figma'],
  Terraform: ['terraform'],
  English: ['english'],
};

const ALIAS_TO_CANONICAL = new Map<string, string>();
for (const [canonical, aliases] of Object.entries(CANONICAL_SKILLS)) {
  ALIAS_TO_CANONICAL.set(canonical.toLowerCase(), canonical);
  for (const alias of aliases) {
    ALIAS_TO_CANONICAL.set(alias.toLowerCase(), canonical);
  }
}

export function normalizeSkill(skill: string): string {
  const key = skill.trim().toLowerCase();
  if (!key) return '';
  const canonical = ALIAS_TO_CANONICAL.get(key);
  if (canonical) return canonical;
  // Title-case unknown skills for consistent report output
  return skill
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function normalizeSkills(skills: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const skill of skills) {
    const normalized = normalizeSkill(skill);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(normalized);
    }
  }
  return result;
}
