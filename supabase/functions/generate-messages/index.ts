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
    const { apiKey, templateId, templateText, isCustom } = await req.json();
    
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }

    if (!templateText) {
      throw new Error('Message template is required');
    }

    console.log('Generating messages with template:', templateId, 'isCustom:', isCustom);

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
        
        // Replace {name} placeholder in template
        const baseMessage = templateText.replace(/\{name\}/g, name);
        
        // Choose model based on whether it's custom or template
        const model = isCustom ? 'gemini-2.0-flash-thinking-exp' : 'gemini-2.0-flash-exp';
        
        // Generate varied message using Gemini
        const prompt = isCustom 
          ? `You are a creative message writer. Create a unique variation of the following message while keeping the EXACT same tone, style, emojis, and vibe. Make it feel natural and personal to avoid spam detection.

Important rules:
- Keep the same casual/fun/serious tone as the original
- Use similar emojis but you can rearrange them slightly
- Keep the same line breaks and structure
- Vary word choices and sentence structure slightly
- Keep the same overall length
- If there are links, keep them EXACTLY as is
- DO NOT change the core message or meaning

Original message:
${baseMessage}

Return ONLY the varied message text without quotation marks, explanations, or any extra formatting.`
          : `Create a slight variation of this message to make it feel natural and avoid spam detection. Keep the core meaning and tone exactly the same, but vary:
- Word choice (use synonyms)
- Sentence structure slightly
- Punctuation placement
- Emoji placement (if any)

DO NOT change:
- The main message or intent
- Links (keep them exactly as is)
- The person's name
- The overall length (keep it similar)

Original message:
${baseMessage}

Return ONLY the varied message text without quotation marks, explanations, or extra formatting.`;

        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: prompt
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
        const message = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || baseMessage;

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
