import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey } = await req.json();
    
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }

    console.log('Generating messages for unsent leads');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch all unsent leads without messages
    const { data: leads, error: fetchError } = await supabaseClient
      .from('leads')
      .select('*')
      .is('message', null)
      .eq('status', 'unsent');

    if (fetchError) {
      throw fetchError;
    }

    if (!leads || leads.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          updatedCount: 0,
          message: 'No leads to process'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    console.log(`Processing ${leads.length} lead(s)`);

    let updatedCount = 0;

    for (const lead of leads) {
      try {
        const name = lead.name || 'there';
        
        // Generate personalized message using Gemini
        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `Generate a friendly, personalized WhatsApp message for ${name} from Rahul at Masters Up. The message should:
- Be warm and conversational
- Mention Masters Up's new platform for Masters preparation
- Invite them to check out mastersup.live
- Keep it under 200 characters
- Be professional yet approachable

Return ONLY the message text without any quotation marks or extra formatting.`
                }]
              }]
            })
          }
        );

        if (!geminiResponse.ok) {
          console.error('Gemini API error for lead:', lead.id);
          continue;
        }

        const geminiData = await geminiResponse.json();
        const message = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 
          `Hi ${name}, this is Rahul from Masters Up — we've just launched a new Masters preparation platform. Check mastersup.live to explore free resources!`;

        // Generate WhatsApp link
        const encodedMessage = encodeURIComponent(message);
        const waLink = `https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}?text=${encodedMessage}`;

        // Update the lead with message and link
        const { error: updateError } = await supabaseClient
          .from('leads')
          .update({
            message,
            wa_link: waLink
          })
          .eq('id', lead.id);

        if (updateError) {
          console.error('Error updating lead:', updateError);
        } else {
          updatedCount++;
        }
      } catch (leadError) {
        console.error('Error processing lead:', leadError);
      }
    }

    console.log(`Successfully generated messages for ${updatedCount} lead(s)`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        updatedCount,
        message: `Generated messages for ${updatedCount} lead(s)`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in generate-messages function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
