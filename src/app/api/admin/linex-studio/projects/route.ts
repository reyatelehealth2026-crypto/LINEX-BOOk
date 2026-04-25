import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { generateContentPackage } from "@/lib/linex-studio/generator";
import type { StudioBrief, ScoredVariation, TTSVoiceoverMeta } from "@/lib/linex-studio/types";

async function logAgentRun(projectId: number, agentName: string, input: unknown, output: unknown, startedAt: number) {
  try {
    await supabaseAdmin().from("linex_studio_agent_runs").insert({
      project_id: projectId,
      agent_name: agentName,
      input_json: input,
      output_json: output,
      status: "completed",
      latency_ms: Date.now() - startedAt,
    });
  } catch (error) {
    console.error("linex_studio_agent_run_log_failed", { agentName, error });
  }
}

async function storeTTSOutput(
  projectId: number,
  voiceover: TTSVoiceoverMeta | null,
  variationId?: number
) {
  if (!voiceover) return;
  const db = supabaseAdmin();
  const { error } = await db.from("linex_studio_tts_outputs").insert({
    project_id: projectId,
    variation_id: variationId ?? null,
    provider: voiceover.provider,
    voice_id: voiceover.voice_config.name,
    ssml_input: voiceover.ssml_input,
    audio_url: null, // dry-run: no audio yet
    duration_sec: voiceover.estimated_duration_sec,
    cost_usd: voiceover.estimated_cost_usd,
    cache_hit: voiceover.cache_hit,
  });
  if (error) {
    console.error("linex_studio_tts_output_insert_failed", error);
  }
}

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("linex_studio_video_projects")
    .select("*, linex_studio_video_project_outputs(*), linex_studio_output_variations(*)")
    .eq("shop_id", admin.shopId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ projects: data ?? [] });
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Partial<StudioBrief>;
  const started = Date.now();
  const pkg = generateContentPackage(body);
  const brief = pkg.structuredBrief;
  const db = supabaseAdmin();

  const { data: profile, error: profileError } = await db
    .from("linex_studio_business_profiles")
    .insert({
      shop_id: admin.shopId,
      business_name: brief.businessName,
      business_type: brief.businessType,
      brand_tone: brief.tone,
      brand_colors: ["#074226", "#186845", "#0b412a"],
      services_json: [brief.offer],
      target_audience: brief.targetAudience,
    })
    .select("id")
    .single();

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

  const { data: project, error: projectError } = await db
    .from("linex_studio_video_projects")
    .insert({
      shop_id: admin.shopId,
      business_profile_id: profile.id,
      title: brief.title,
      business_type: brief.businessType,
      goal: brief.goal,
      platform: brief.platform,
      duration_seconds: brief.durationSeconds,
      tone: brief.tone,
      brief: brief.brief,
      status: "completed",
    })
    .select("*")
    .single();

  if (projectError) return NextResponse.json({ error: projectError.message }, { status: 500 });

  await logAgentRun(project.id, "brief_intake", body, pkg.structuredBrief, started);
  await logAgentRun(project.id, "content_strategist", pkg.structuredBrief, pkg.strategy, started);
  await logAgentRun(project.id, "script_writer", pkg.strategy, { script: pkg.script, variations: pkg.scriptVariations?.map((v) => v.name) }, started);

  if (pkg.voiceover) {
    await logAgentRun(project.id, "tts_director", { tone: brief.tone }, pkg.voiceover, started);
  }

  const { data: output, error: outputError } = await db
    .from("linex_studio_video_project_outputs")
    .insert({
      project_id: project.id,
      strategy_json: pkg.strategy,
      script_text: pkg.script,
      storyboard_json: pkg.storyboard,
      visual_direction_json: pkg.visualDirection,
      asset_prompts_json: pkg.assetPrompts,
      caption_json: pkg.caption,
      editor_notes_text: pkg.editorNotes,
      markdown_export: pkg.markdown,
    })
    .select("*")
    .single();

  if (outputError) return NextResponse.json({ error: outputError.message }, { status: 500 });

  // Store script variations with scores
  if (pkg.scriptVariations && pkg.scriptVariations.length > 0) {
    const variationRows = pkg.scriptVariations.map((v: ScoredVariation, idx: number) => ({
      project_id: project.id,
      agent_name: "script_writer",
      section: "script",
      variation_index: idx,
      output_json: { name: v.name, script: v.script, scoreBreakdown: v.scoreBreakdown },
      score_total: v.score,
      score_breakdown_json: v.scoreBreakdown,
      selected: idx === 0,
      selected_by: "auto",
    }));
    const { error: varError } = await db.from("linex_studio_output_variations").insert(variationRows);
    if (varError) {
      console.error("linex_studio_variations_insert_failed", varError);
    }
  }

  // Fetch inserted variations for the response
  const { data: variations } = await db
    .from("linex_studio_output_variations")
    .select("*")
    .eq("project_id", project.id)
    .eq("section", "script")
    .order("variation_index", { ascending: true });

  // Persist dry-run TTS metadata (audio_url=null until synthesis happens)
  await storeTTSOutput(project.id, pkg.voiceover);

  return NextResponse.json({ project, output, package: pkg, variations: variations ?? [] });
}
