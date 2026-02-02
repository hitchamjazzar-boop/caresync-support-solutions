

# Employee Performance Evaluation System

## Overview
This plan implements a comprehensive employee evaluation system based on CareSync Support Solutions' performance evaluation form. The system allows administrators to create detailed evaluations with 10 scoring categories, KPI tracking, feedback sections, and generate reports per employee. Admins can also request self-evaluations from employees.

## Database Design

### New Tables

**1. `evaluation_periods`**
Stores evaluation periods/cycles:
- `id` (uuid, primary key)
- `name` (text) - e.g., "Q1 2026 Review"
- `review_type` (text) - probation, quarterly, bi_annual, annual, promotion
- `start_date`, `end_date` (date)
- `is_active` (boolean)
- `created_by` (uuid)
- `created_at`, `updated_at` (timestamp)

**2. `employee_evaluations`**
Main evaluation records:
- `id` (uuid, primary key)
- `period_id` (uuid, nullable - for ad-hoc evaluations)
- `employee_id` (uuid) - who is being evaluated
- `reviewer_id` (uuid) - who is doing the evaluation
- `evaluation_type` (text) - 'admin_review' or 'self_evaluation'
- `status` (text) - draft, submitted, reviewed, finalized
- `include_leadership` (boolean) - whether section 9 applies
- `total_score` (numeric)
- `max_possible_score` (numeric) - 50 or 45 depending on leadership
- `overall_result` (text)
- `strengths`, `areas_for_improvement`, `training_needed`, `goals_next_period`, `action_plan` (text)
- `created_at`, `submitted_at`, `finalized_at` (timestamp)

**3. `evaluation_section_scores`**
Scores for each of the 10 sections:
- `id` (uuid, primary key)
- `evaluation_id` (uuid)
- `section_number` (integer, 1-10)
- `section_name` (text)
- `rating` (integer, 1-5)
- `comments` (text)

**4. `evaluation_kpis`**
Optional KPI/measurable results:
- `id` (uuid, primary key)
- `evaluation_id` (uuid)
- `metric_name`, `target_value`, `actual_value`, `notes` (text)

**5. `evaluation_requests`**
Admin requests for self-evaluations:
- `id` (uuid, primary key)
- `admin_id` (uuid) - who requested
- `employee_id` (uuid) - who should submit
- `period_id` (uuid, nullable)
- `review_type` (text)
- `message` (text, nullable) - instructions from admin
- `status` (text) - pending, submitted, expired
- `due_date` (date, nullable)
- `created_at` (timestamp)
- `expires_at` (timestamp, nullable)

### RLS Policies

**evaluation_periods:**
- Admins can manage all periods
- Everyone can view active periods

**employee_evaluations:**
- Admins can manage all evaluations
- Employees can INSERT their own self-evaluations (when requested)
- Employees can UPDATE their own draft self-evaluations
- Employees can VIEW their own finalized evaluations

**evaluation_section_scores & evaluation_kpis:**
- Admins can manage all
- Employees can manage scores/KPIs for their own draft self-evaluations
- Employees can view their own finalized evaluation scores

**evaluation_requests:**
- Admins can manage all requests
- Employees can view their own pending requests
- Employees can update status when submitting

## Frontend Structure

### New Page: `/evaluations`
```
src/pages/Evaluations.tsx
```
Main dashboard for admins showing:
- Evaluation periods management
- All evaluations list with filters
- Pending evaluation requests
- Quick actions

### New Page: `/evaluations/:id`
```
src/pages/EvaluationDetail.tsx
```
Full evaluation view/edit page

### Components
```
src/components/evaluations/
├── EvaluationPeriodManager.tsx      # Create/manage evaluation periods
├── CreateEvaluationDialog.tsx       # Admin starts new evaluation
├── RequestEvaluationDialog.tsx      # Admin requests self-evaluation from employee
├── EvaluationForm.tsx               # Main 10-section form
├── EvaluationSectionCard.tsx        # Individual section with criteria + rating
├── KPISection.tsx                   # KPI metrics input
├── FeedbackSection.tsx              # Strengths, goals, action plan
├── ScoreSummary.tsx                 # Score display with result badge
├── EvaluationList.tsx               # Filterable list of evaluations
├── EvaluationViewDialog.tsx         # Read-only view
├── EvaluationRequestCard.tsx        # Employee sees pending request
├── EmployeeEvaluationHistory.tsx    # All evaluations for one employee
└── EvaluationPDFGenerator.tsx       # Export to PDF
```

## Evaluation Form - 10 Sections

### Section 1: Task Completion & Reliability
Criteria: Completes tasks on time, Meets deadlines consistently, Follows SOPs correctly, Requires minimal supervision, Submits complete outputs, Handles urgent requests responsibly, Tracks tasks accurately in systems, Rarely misses deliverables

### Section 2: Productivity & Efficiency
Criteria: Maintains steady output, Manages workload independently, Prioritizes effectively, Uses tools/automation efficiently, Minimizes idle time, Meets daily/weekly targets, Works efficiently without sacrificing quality

### Section 3: Quality & Accuracy of Work
Criteria: Attention to detail, Low error rate, Professional presentation, Clear documentation, Client-ready outputs, Follows brand/process standards, Double-checks work

### Section 4: Initiative & Ownership
Criteria: Proactively solves problems, Suggests improvements/automations, Works independently, Takes accountability, Volunteers for responsibilities, Anticipates team/client needs, Shows leadership potential

### Section 5: Communication
Criteria: Clear and professional writing, Timely responses, Gives regular updates, Documents work properly, Escalates issues early, Asks smart clarifying questions, Effective meeting participation

### Section 6: Teamwork & Collaboration
Criteria: Works well with others, Shares knowledge, Supports teammates, Reliable in group tasks, Accepts feedback positively, Maintains respectful attitude, Contributes to positive culture

### Section 7: Client Service & Professionalism
Criteria: Professional with clients, Maintains confidentiality, Handles concerns calmly, Builds trust, Represents CareSync well, Follows service standards, Reliable and dependable

### Section 8: Technical Skills & Systems
Criteria: CRM/system proficiency, Tool/automation knowledge, Accurate data handling, Organized files/docs, Troubleshoots basic issues, Learns new tech quickly, Maintains system integrity

### Section 9: Leadership (If Applicable)
Criteria: Guides/mentors others, Delegates effectively, Holds team accountable, Makes sound decisions, Keeps projects on track, Encourages ownership, Supports morale

### Section 10: Learning, Growth & Attitude
Criteria: Open to feedback, Shows improvement, Participates in training, Adapts to change, Professional behavior, Positive mindset, Commitment to company goals

## Score Calculation

**Rating Scale:**
- 5: Outstanding, consistently exceeds expectations
- 4: Above expectations
- 3: Meets expectations
- 2: Needs improvement
- 1: Unsatisfactory

**Total Score:**
- With Leadership: Max 50 points (10 sections x 5)
- Without Leadership: Max 45 points (9 sections x 5)

**Result Mapping:**
| Score Range | Result |
|-------------|--------|
| 90-100% | Outstanding |
| 80-89% | Very Good |
| 60-79% | Meets Expectations |
| 40-59% | Needs Improvement |
| Below 40% | Unsatisfactory |

## User Flows

### Admin Flow: Direct Evaluation
1. Go to Evaluations page
2. Click "Create Evaluation"
3. Select employee and review type
4. Fill out all 10 sections with ratings and comments
5. Add KPIs (optional)
6. Write feedback (strengths, areas, goals, action plan)
7. Save as draft or finalize
8. Employee can view once finalized

### Admin Flow: Request Self-Evaluation
1. Go to Evaluations page or Employee profile
2. Click "Request Evaluation"
3. Select employee, review type, optional message and due date
4. Employee receives notification
5. Employee completes self-evaluation
6. Admin reviews and can add notes/finalize

### Employee Flow: Self-Evaluation
1. See notification/request on Dashboard
2. Go to Evaluations or click notification
3. Fill out self-evaluation form
4. Submit for admin review
5. View finalized evaluation after admin review

## Navigation Updates

### Layout.tsx - Add to settings navigation (admin only)
```typescript
{ 
  name: 'Evaluations', 
  href: '/evaluations', 
  icon: ClipboardCheck, 
  adminOnly: true 
}
```

### App.tsx - Add routes
```typescript
<Route path="/evaluations" element={<ProtectedRoute><Layout><Evaluations /></Layout></ProtectedRoute>} />
<Route path="/evaluations/:id" element={<ProtectedRoute><Layout><EvaluationDetail /></Layout></ProtectedRoute>} />
```

### Dashboard Enhancement
- Show pending evaluation requests for employees
- Show recent evaluations for admins

### Employee Profile Enhancement
- Add "Evaluations" tab showing history for that employee
- Add "Request Evaluation" button for admins

## PDF Export
Using existing jsPDF library to generate professional evaluation documents matching the CareSync template format with:
- Company header
- Employee information
- All 10 sections with ratings and comments
- KPI table
- Score summary
- Feedback sections
- Signatures area

## Implementation Order

1. **Database Migration** - Create all 5 tables with RLS policies
2. **Constants & Types** - Define evaluation sections, criteria, score mappings
3. **Core Components** - EvaluationSectionCard, ScoreSummary, FeedbackSection
4. **Evaluation Form** - Main form component with all sections
5. **Request System** - RequestEvaluationDialog, EvaluationRequestCard
6. **Pages** - Evaluations list page, EvaluationDetail page
7. **Integration** - Dashboard widget, Employee profile tab
8. **PDF Export** - Generate professional evaluation documents
9. **Navigation** - Add routes and menu items

