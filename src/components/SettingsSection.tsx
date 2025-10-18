import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Key, Save, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SettingsSection = () => {
  const [apiKey, setApiKey] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
      setApiKey(savedKey);
      setIsSaved(true);
    }
  }, []);

  const handleSave = () => {
    if (!apiKey.trim()) {
      toast({
        title: "Invalid API Key",
        description: "Please enter a valid Gemini API key",
        variant: "destructive",
      });
      return;
    }

    localStorage.setItem('gemini_api_key', apiKey);
    setIsSaved(true);
    toast({
      title: "Settings saved",
      description: "Your Gemini API key has been saved successfully",
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="p-8">
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Key className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">API Settings</h2>
              <p className="text-sm text-muted-foreground">
                Configure your Gemini API key
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-key">Gemini API Key</Label>
              <Input
                id="api-key"
                type="password"
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setIsSaved(false);
                }}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Your API key is stored locally in your browser and never sent to our servers.
              </p>
            </div>

            {isSaved && (
              <div className="flex items-center gap-2 text-sm text-primary">
                <CheckCircle2 className="w-4 h-4" />
                <span>API key saved successfully</span>
              </div>
            )}

            <Button onClick={handleSave} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </Button>
          </div>

          <div className="pt-6 border-t border-border space-y-3">
            <h3 className="font-semibold text-sm">How to get your Gemini API key:</h3>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Visit <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google AI Studio</a></li>
              <li>Sign in with your Google account</li>
              <li>Click "Get API Key" or "Create API Key"</li>
              <li>Copy the generated key and paste it above</li>
            </ol>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SettingsSection;
