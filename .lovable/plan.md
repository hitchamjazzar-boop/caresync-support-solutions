

## Summary
Add a way for admins to view the complete Campaign Summary Report (showing scores from ALL reviewers) directly from the individual Evaluation Detail page.

## Current Situation
- **EvaluationDetail page** (`/evaluations/{id}`) - Shows a single reviewer's evaluation with only their individual score
- **CampaignDetail page** (`/campaign/{id}`) - Shows the full summary report with scores aggregated from all reviewers
- There is no link between these pages, making it difficult to see the overall picture when viewing an individual evaluation

## Proposed Solution
Add a "View Campaign Summary" button on the EvaluationDetail page that navigates admins to the full Campaign Summary Report.

## Technical Details

### File Changes

**1. Edit `src/pages/EvaluationDetail.tsx`**

Add navigation to campaign summary:

- Import `BarChart3` icon from lucide-react
- Add a new Button in the header area (visible only to admins when `evaluation.campaign_id` exists)
- Button navigates to `/campaign/{campaign_id}` where the full summary report is displayed

Location: In the Action Buttons section (around line 480), add:
```tsx
{isAdmin && evaluation.campaign_id && (
  <Button variant="outline" onClick={() => navigate(`/campaign/${evaluation.campaign_id}`)}>
    <BarChart3 className="h-4 w-4 mr-2" />
    View Campaign Summary
  </Button>
)}
```

## User Experience

### Before
- Admin views an individual evaluation
- Can only see that single reviewer's scores
- No way to see how this evaluation compares to others or see the overall summary

### After
- Admin views an individual evaluation
- Sees a "View Campaign Summary" button in the header
- Clicking it navigates to the full Campaign Summary showing:
  - Overall percentage score from all submitted evaluations
  - Individual reviewer breakdown with their scores
  - Section-by-section analysis with min/max ranges
  - Highlights showing highest/lowest rated areas

## Summary
This is a straightforward navigation enhancement that connects the individual evaluation view to the campaign-wide summary report, giving admins quick access to the aggregated performance data they need.

