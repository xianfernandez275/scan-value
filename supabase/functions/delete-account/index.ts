/**
 * Account deletion (App Store guideline 5.1.1(v) / GDPR).
 *
 * Deletes the authenticated user from auth.users; profiles and
 * collection_items are removed by their ON DELETE CASCADE foreign keys.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    );

    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data?.user) {
      return new Response(JSON.stringify({ error: 'AUTH_REQUIRED' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id);
    if (deleteError) throw deleteError;

    console.log(`Account deleted: ${data.user.id}`);
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('delete-account error', e);
    return new Response(JSON.stringify({ error: 'DELETE_FAILED' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
