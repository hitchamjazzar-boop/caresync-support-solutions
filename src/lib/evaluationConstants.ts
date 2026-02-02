export const EVALUATION_SECTIONS = [
  {
    number: 1,
    name: "Task Completion & Reliability",
    criteria: [
      "Completes tasks on time",
      "Meets deadlines consistently",
      "Follows SOPs correctly",
      "Requires minimal supervision",
      "Submits complete outputs",
      "Handles urgent requests responsibly",
      "Tracks tasks accurately in systems",
      "Rarely misses deliverables"
    ]
  },
  {
    number: 2,
    name: "Productivity & Efficiency",
    criteria: [
      "Maintains steady output",
      "Manages workload independently",
      "Prioritizes effectively",
      "Uses tools/automation efficiently",
      "Minimizes idle time",
      "Meets daily/weekly targets",
      "Works efficiently without sacrificing quality"
    ]
  },
  {
    number: 3,
    name: "Quality & Accuracy of Work",
    criteria: [
      "Attention to detail",
      "Low error rate",
      "Professional presentation",
      "Clear documentation",
      "Client-ready outputs",
      "Follows brand/process standards",
      "Double-checks work"
    ]
  },
  {
    number: 4,
    name: "Initiative & Ownership",
    criteria: [
      "Proactively solves problems",
      "Suggests improvements/automations",
      "Works independently",
      "Takes accountability",
      "Volunteers for responsibilities",
      "Anticipates team/client needs",
      "Shows leadership potential"
    ]
  },
  {
    number: 5,
    name: "Communication",
    criteria: [
      "Clear and professional writing",
      "Timely responses",
      "Gives regular updates",
      "Documents work properly",
      "Escalates issues early",
      "Asks smart clarifying questions",
      "Effective meeting participation"
    ]
  },
  {
    number: 6,
    name: "Teamwork & Collaboration",
    criteria: [
      "Works well with others",
      "Shares knowledge",
      "Supports teammates",
      "Reliable in group tasks",
      "Accepts feedback positively",
      "Maintains respectful attitude",
      "Contributes to positive culture"
    ]
  },
  {
    number: 7,
    name: "Client Service & Professionalism",
    criteria: [
      "Professional with clients",
      "Maintains confidentiality",
      "Handles concerns calmly",
      "Builds trust",
      "Represents CareSync well",
      "Follows service standards",
      "Reliable and dependable"
    ]
  },
  {
    number: 8,
    name: "Technical Skills & Systems",
    criteria: [
      "CRM/system proficiency",
      "Tool/automation knowledge",
      "Accurate data handling",
      "Organized files/docs",
      "Troubleshoots basic issues",
      "Learns new tech quickly",
      "Maintains system integrity"
    ]
  },
  {
    number: 9,
    name: "Leadership (If Applicable)",
    criteria: [
      "Guides/mentors others",
      "Delegates effectively",
      "Holds team accountable",
      "Makes sound decisions",
      "Keeps projects on track",
      "Encourages ownership",
      "Supports morale"
    ],
    optional: true
  },
  {
    number: 10,
    name: "Learning, Growth & Attitude",
    criteria: [
      "Open to feedback",
      "Shows improvement",
      "Participates in training",
      "Adapts to change",
      "Professional behavior",
      "Positive mindset",
      "Commitment to company goals"
    ]
  }
];

export const RATING_SCALE = [
  { value: 5, label: "Outstanding", description: "Consistently exceeds expectations" },
  { value: 4, label: "Above Expectations", description: "Frequently exceeds expectations" },
  { value: 3, label: "Meets Expectations", description: "Consistently meets expectations" },
  { value: 2, label: "Needs Improvement", description: "Sometimes meets expectations" },
  { value: 1, label: "Unsatisfactory", description: "Rarely meets expectations" }
];

export const REVIEW_TYPES = [
  { value: 'probation', label: 'Probation Review' },
  { value: 'quarterly', label: 'Quarterly Review' },
  { value: 'bi_annual', label: 'Bi-Annual Review' },
  { value: 'annual', label: 'Annual Review' },
  { value: 'promotion', label: 'Promotion Review' }
];

export const getOverallResult = (score: number, maxScore: number): string => {
  const percentage = (score / maxScore) * 100;
  if (percentage >= 90) return 'Outstanding';
  if (percentage >= 80) return 'Very Good';
  if (percentage >= 60) return 'Meets Expectations';
  if (percentage >= 40) return 'Needs Improvement';
  return 'Unsatisfactory';
};

export const getResultColor = (result: string): string => {
  switch (result) {
    case 'Outstanding': return 'bg-emerald-500';
    case 'Very Good': return 'bg-blue-500';
    case 'Meets Expectations': return 'bg-amber-500';
    case 'Needs Improvement': return 'bg-orange-500';
    case 'Unsatisfactory': return 'bg-red-500';
    default: return 'bg-muted';
  }
};

export const getResultBadgeVariant = (result: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (result) {
    case 'Outstanding':
    case 'Very Good':
      return 'default';
    case 'Meets Expectations':
      return 'secondary';
    case 'Needs Improvement':
    case 'Unsatisfactory':
      return 'destructive';
    default:
      return 'outline';
  }
};
