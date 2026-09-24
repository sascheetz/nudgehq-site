// Nudge HQ sync endpoint — public, no JWT verification required
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const url = new URL(req.url);

    // GET /sync?userId=50904
    if (req.method === "GET") {
      const userId = url.searchParams.get("userId");
      if (!userId) {
        return new Response(JSON.stringify({ error: "Missing userId" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await supabase
        .from("assignment_sync")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("sync GET failed:", error);
        return new Response(JSON.stringify({ error: "Request failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!data) {
        return new Response(JSON.stringify({ ok: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        ok: true,
        data: {
          upcoming_raw: data.upcoming_raw,
          missing_raw: data.missing_raw,
          zeros_raw: data.zeros_raw,
          hac_zeros: data.zeros_raw,
          course_map: data.course_map,
          submitted_ids: data.submitted_ids,
          completed_subs: data.completed_subs,
          name: data.name,
        },
        synced_at: data.synced_at,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /sync
    if (req.method === "POST") {
      const body = await req.json();
      const {
        userId,
        upcoming_raw,
        missing_raw,
        zeros_raw,
        course_map,
        submitted_ids,
        completed_subs,
        synced_at,
        name,
      } = body;

      if (!userId) {
        return new Response(JSON.stringify({ error: "Missing userId" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabase
        .from("assignment_sync")
        .upsert({
          user_id: userId,
          upcoming_raw: upcoming_raw || "[]",
          missing_raw: missing_raw || "[]",
          zeros_raw: zeros_raw || "[]",
          course_map: course_map || "{}",
          submitted_ids: submitted_ids || "[]",
          completed_subs: completed_subs || "[]",
          synced_at: synced_at || "",
          name: name || "Student",
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error("sync POST failed:", error);
        return new Response(JSON.stringify({ error: "Request failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("sync unhandled error:", err);
    return new Response(JSON.stringify({ error: "Request failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
