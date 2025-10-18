import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Image as ImageIcon, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const UploadSection = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(selectedFiles);
      
      const previewUrls = selectedFiles.map(file => URL.createObjectURL(file));
      setPreviews(previewUrls);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(droppedFiles);
    
    const previewUrls = droppedFiles.map(file => URL.createObjectURL(file));
    setPreviews(previewUrls);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const processImages = async () => {
    const geminiApiKey = localStorage.getItem('gemini_api_key');
    
    if (!geminiApiKey) {
      toast({
        title: "API Key Missing",
        description: "Please set your Gemini API key in Settings first.",
        variant: "destructive",
      });
      return;
    }

    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please upload at least one image.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProcessedCount(0);

    try {
      const { data, error } = await supabase.functions.invoke('extract-numbers', {
        body: { 
          images: await Promise.all(files.map(async (file) => {
            const base64 = await fileToBase64(file);
            return base64;
          })),
          apiKey: geminiApiKey 
        }
      });

      if (error) throw error;

      setProcessedCount(data.extractedCount || 0);
      
      toast({
        title: "Success!",
        description: `Extracted ${data.extractedCount} phone numbers from ${files.length} image(s).`,
      });

      setFiles([]);
      setPreviews([]);
    } catch (error) {
      console.error('Error processing images:', error);
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : "Failed to extract phone numbers. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="p-8">
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Upload Screenshots</h2>
            <p className="text-muted-foreground">
              Upload images containing phone numbers to extract and create WhatsApp leads
            </p>
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary transition-colors cursor-pointer bg-accent/20"
          >
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">
                Drag & drop images here
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                or click to browse
              </p>
              <Button variant="outline" type="button">
                Select Files
              </Button>
            </label>
          </div>

          {previews.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Selected Images ({files.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {previews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border border-border"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                      <p className="text-white text-sm font-medium">
                        {files[index].name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {processedCount > 0 && (
            <div className="bg-accent/50 border border-primary/20 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <p className="text-sm font-medium">
                Successfully extracted {processedCount} phone number(s)
              </p>
            </div>
          )}

          <Button
            onClick={processImages}
            disabled={files.length === 0 || isProcessing}
            className="w-full h-12 text-lg font-semibold"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing Images...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 mr-2" />
                Extract Phone Numbers
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default UploadSection;
