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
    const { images, apiKey } = await req.json();
    
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }

    if (!images || images.length === 0) {
      throw new Error('No images provided');
    }

    console.log(`Processing ${images.length} image(s)`);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let extractedCount = 0;

    for (const imageBase64 of images) {
      try {
        // Extract base64 data without the data URI prefix
        const base64Data = imageBase64.split(',')[1];

        // Call Gemini Vision API to extract phone numbers
        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: "Extract all phone numbers and associated names (if visible) from this image. Return ONLY a JSON array of objects with 'phone' and 'name' fields. Phone numbers should be in international format with country code if possible. If no name is visible, use null for the name field. Example format: [{\"phone\": \"+1234567890\", \"name\": \"John Doe\"}, {\"phone\": \"+9876543210\", \"name\": null}]" },
                  {
                    inline_data: {
                      mime_type: "image/jpeg",
                      data: base64Data
                    }
                  }
                ]
              }]
            })
          }
        );

        if (!geminiResponse.ok) {
          const errorText = await geminiResponse.text();
          console.error('Gemini API error:', errorText);
          continue;
        }

        const geminiData = await geminiResponse.json();
        const extractedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        console.log('Extracted text from Gemini:', extractedText);

        // Parse the JSON response
        let phoneData: Array<{ phone: string; name: string | null }> = [];
        
        try {
          // Try to extract JSON from the response
          const jsonMatch = extractedText.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            phoneData = JSON.parse(jsonMatch[0]);
          }
        } catch (parseError) {
          console.error('Error parsing JSON from Gemini response:', parseError);
          // If JSON parsing fails, try to extract phone numbers using regex
          const phoneRegex = /[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{3,4}[-\s\.]?[0-9]{3,4}/g;
          const phones = extractedText.match(phoneRegex);
          if (phones) {
            phoneData = phones.map((phone: string) => ({ phone, name: null }));
          }
        }

        // Insert extracted phone numbers into the database
        for (const item of phoneData) {
          const { error: insertError } = await supabaseClient
            .from('leads')
            .insert({
              phone: item.phone,
              name: item.name,
              status: 'unsent'
            });

          if (insertError) {
            console.error('Error inserting lead:', insertError);
          } else {
            extractedCount++;
          }
        }
      } catch (imageError) {
        console.error('Error processing image:', imageError);
      }
    }

    console.log(`Successfully extracted ${extractedCount} phone number(s)`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        extractedCount,
        message: `Extracted ${extractedCount} phone number(s) from ${images.length} image(s)`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in extract-numbers function:', error);
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
