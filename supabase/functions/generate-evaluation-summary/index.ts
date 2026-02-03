import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { employeeName, reviewType, sectionScores, reviewerComments, overallScore, overallPercentage } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build the prompt with all the evaluation data
    const systemPrompt = `You are an HR performance evaluation analyst. Your task is to analyze employee evaluation data and generate a comprehensive summary report with actionable insights.

You must respond with a JSON object containing these fields:
- executiveSummary: A 2-3 paragraph executive summary of the employee's performance
- keyStrengths: Array of 3-5 key strengths identified from the evaluation
- areasForImprovement: Array of 3-5 areas that need improvement
- suggestedKPIs: Array of 4-6 measurable KPIs for the next review period (each with "metric" and "target" fields)
- actionPlan: Array of 4-6 specific action items with timelines (each with "action", "timeline", and "priority" fields where priority is "high", "medium", or "low")
- overallAssessment: A brief 1-2 sentence overall assessment`;

    const userPrompt = `Please analyze the following evaluation data for ${employeeName} (${reviewType} Review):

OVERALL PERFORMANCE:
- Overall Score: ${overallScore}
- Overall Percentage: ${overallPercentage}%

SECTION SCORES:
${sectionScores.map((s: any) => `- ${s.section_name}: ${s.average_rating}/5 (${s.responses_count} reviewers, range: ${s.min_rating}-${s.max_rating})`).join('\n')}

REVIEWER COMMENTS:
${reviewerComments.length > 0 ? reviewerComments.map((c: any) => `[${c.section}]: "${c.comment}"`).join('\n') : 'No detailed comments available.'}

Please generate a comprehensive performance summary with suggested KPIs and action plan.`;

    console.log("Calling AI gateway for evaluation summary...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON response
    let summary;
    try {
      summary = JSON.parse(content);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse AI response");
    }

    console.log("Successfully generated evaluation summary");

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Error generating evaluation summary:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
