const KNOWN_LOGOS = {
  'google': 'https://logo.clearbit.com/google.com',
  'microsoft': 'https://logo.clearbit.com/microsoft.com',
  'amazon': 'https://logo.clearbit.com/amazon.com',
  'meta': 'https://logo.clearbit.com/meta.com',
  'facebook': 'https://logo.clearbit.com/facebook.com',
  'apple': 'https://logo.clearbit.com/apple.com',
  'netflix': 'https://logo.clearbit.com/netflix.com',
  'ibm': 'https://logo.clearbit.com/ibm.com',
  'infosys': 'https://logo.clearbit.com/infosys.com',
  'tcs': 'https://logo.clearbit.com/tcs.com',
  'wipro': 'https://logo.clearbit.com/wipro.com',
  'accenture': 'https://logo.clearbit.com/accenture.com',
  'adobe': 'https://logo.clearbit.com/adobe.com',
  'oracle': 'https://logo.clearbit.com/oracle.com',
  'salesforce': 'https://logo.clearbit.com/salesforce.com',
  'abb': 'https://logo.clearbit.com/abb.com',
  'kyndryl': 'https://logo.clearbit.com/kyndryl.com',
  'crestron electronics': 'https://logo.clearbit.com/crestron.com'
};

function findKnownLogo(companyName) {
  const key = companyName.toLowerCase().trim();
  return KNOWN_LOGOS[key] || null;
}

const COMMON_SKILLS = [
  'javascript', 'python', 'java', 'react', 'angular', 'vue', 'node', 'express',
  'sql', 'mysql', 'postgresql', 'html', 'css', 'sass', 'tailwind', 'bootstrap',
  'git', 'github', 'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins',
  'typescript', 'mongodb', 'redis', 'django', 'flask', 'spring', 'php', 'laravel',
  'c++', 'c#', '.net', 'ruby', 'rails', 'go', 'rust', 'swift', 'kotlin',
  'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'pandas', 'numpy',
  'data analysis', 'data science', 'sql server', 'excel', 'tableau', 'power bi',
  'figma', 'sketch', 'photoshop', 'illustrator', 'ui/ux', 'wireframing', 'prototyping',
  'communication', 'leadership', 'project management', 'agile', 'scrum', 'jira',
  'rest api', 'graphql', 'microservices', 'ci/cd', 'testing', 'selenium', 'linux',
  'networking', 'cybersecurity', 'devops', 'terraform', 'ansible', 'streamlit',
  'fastapi', 'spring boot', 'react native', 'flutter', 'android', 'ios'
];
function calculateMatch(resumeText, jobText) {
  const resumeLower = resumeText.toLowerCase();
  const jobLower = jobText.toLowerCase();

  // Part 1: known-skill matching (as before)
  const relevantSkills = COMMON_SKILLS.filter(skill => jobLower.includes(skill));
  const matched = relevantSkills.filter(skill => resumeLower.includes(skill));
  const missing = relevantSkills.filter(skill => !resumeLower.includes(skill));
  const skillRatio = relevantSkills.length ? (matched.length / relevantSkills.length) : 0;

  // Part 2: general word-overlap similarity (adds natural variation)
  const stopWords = new Set(['the','and','for','with','you','your','are','this','that','from','will','have','has','job','role','team','work','our','all','can','who','into','not','but']);
  const wordsFrom = (text) => text
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w));

  const jobWords = new Set(wordsFrom(jobLower));
  const resumeWords = new Set(wordsFrom(resumeLower));
  const overlap = [...jobWords].filter(w => resumeWords.has(w));
  const overlapRatio = jobWords.size ? (overlap.length / jobWords.size) : 0;

  // Blend both signals for a smoother, more varied score
  const rawScore = (skillRatio * 65) + (overlapRatio * 350);
  const score = Math.min(100, Math.round(rawScore));

  return { score, matched, missing };
}function guessRole(resumeText) {
  const text = resumeText.toLowerCase();

  const roleMap = [
    { keywords: ['mechanical'], role: 'mechanical engineer' },
    { keywords: ['electronics', 'ece', 'communication engineering'], role: 'electronics engineer' },
    { keywords: ['electrical'], role: 'electrical engineer' },
    { keywords: ['civil engineering', 'civil'], role: 'civil engineer' },
    { keywords: ['chemical engineering'], role: 'chemical engineer' },
    { keywords: ['data scientist', 'data science'], role: 'data scientist' },
    { keywords: ['frontend'], role: 'frontend developer' },
    { keywords: ['backend'], role: 'backend developer' },
    { keywords: ['full stack', 'fullstack'], role: 'full stack developer' },
    { keywords: ['ui/ux', 'ui designer', 'ux designer'], role: 'ui/ux designer' },
    { keywords: ['computer science', 'software engineering', 'cse'], role: 'software engineer' }
  ];

  for (const entry of roleMap) {
    if (entry.keywords.some(k => text.includes(k))) {
      return entry.role;
    }
  }

  return 'engineer'; // generic fallback instead of defaulting to software
}
async function loadMatches() {
  const resumeText = sessionStorage.getItem('resumeText') || '';
  console.log('Resume text length:', resumeText.length);
  console.log('Resume text preview:', resumeText);
  const query = guessRole(resumeText);

  try {
    const res = await fetch(`/api/jobs?q=${encodeURIComponent(query)}`);
    const data = await res.json();

    document.getElementById('loading').style.display = 'none';
    const list = document.getElementById('job-list');

    if (!data.jobs || !data.jobs.length) {
      list.innerHTML = '<p style="text-align:center; color:var(--ink-dim);">No matches found right now — try again later.</p>';
      return;
    }

    const scoredJobs = data.jobs
  .map(job => ({ job, ...calculateMatch(resumeText, job.description) }))
  .filter(item => item.score >= 5);

if (!scoredJobs.length) {
  list.innerHTML = '<p style="text-align:center; color:var(--ink-dim);">No strong matches found — try uploading a more detailed resume.</p>';
  return;
}

scoredJobs.forEach(({ job, score, matched, missing }, i) => {
  const card = document.createElement('div');
      card.className = 'job-card';
      card.style.animationDelay = `${i * 60}ms`;

      const companyName = job.company || 'Unknown Company';
      const initial = companyName.charAt(0).toUpperCase();
      const knownLogo = findKnownLogo(companyName);

      const logoHtml = knownLogo
        ? `<div class="company-logo"><img src="${knownLogo}" style="width:100%;height:100%;object-fit:contain;border-radius:10px;" onerror="this.parentElement.outerHTML='<div class=\\'company-logo logo-fallback\\'>${initial}</div>';" /></div>`
        : `<div class="company-logo logo-fallback">${initial}</div>`;

      card.innerHTML = `
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:10px;">
          ${logoHtml}
          <div>
            <h3 style="margin:0;">${job.title}</h3>
            <div class="job-meta" style="margin:0;">${companyName} · ${job.location} · ${job.salary}</div>
          </div>
        </div>
        <div class="match-bar-track"><div class="match-bar-fill" style="width:${score}%"></div></div>
        <div style="font-size:13px; color:var(--ink-dim);">Match: ${score}%</div>
        ${matched.length ? `<div style="font-size:13px; margin-top:6px;">✅ Matched: ${matched.join(', ')}</div>` : ''}
        <a href="${job.url}" target="_blank" class="btn btn-primary" style="display:inline-block; margin-top:14px; text-decoration:none;">View & Apply</a>
      `;
      list.appendChild(card);
    });

  } catch (err) {
    document.getElementById('loading').textContent = 'Could not load matches right now.';
  }
}

loadMatches();