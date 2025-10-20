import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Key, Save, CheckCircle2, Plus, Trash2, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MessageTemplate {
  id: string;
  name: string;
  template: string;
}

const SettingsSection = () => {
  const [apiKey, setApiKey] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateText, setNewTemplateText] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
      setApiKey(savedKey);
      setIsSaved(true);
    }

    const savedTemplates = localStorage.getItem('message_templates');
    if (savedTemplates) {
      setTemplates(JSON.parse(savedTemplates));
    } else {
      // Default templates
      const defaultTemplates = [
        {
          id: 'promotional',
          name: 'Promotional (Masters Up)',
          template: 'Hi {name}, this is Rahul from Masters Up — we\'ve just launched a new Masters preparation platform. Check mastersup.live to explore free resources!'
        }
      ];
      setTemplates(defaultTemplates);
      localStorage.setItem('message_templates', JSON.stringify(defaultTemplates));
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

  const addTemplate = () => {
    if (!newTemplateName.trim() || !newTemplateText.trim()) {
      toast({
        title: "Invalid Template",
        description: "Please provide both template name and message",
        variant: "destructive",
      });
      return;
    }

    const newTemplate: MessageTemplate = {
      id: Date.now().toString(),
      name: newTemplateName,
      template: newTemplateText
    };

    const updatedTemplates = [...templates, newTemplate];
    setTemplates(updatedTemplates);
    localStorage.setItem('message_templates', JSON.stringify(updatedTemplates));
    
    setNewTemplateName("");
    setNewTemplateText("");
    
    toast({
      title: "Template added",
      description: "Your custom message template has been saved",
    });
  };

  const deleteTemplate = (id: string) => {
    const updatedTemplates = templates.filter(t => t.id !== id);
    setTemplates(updatedTemplates);
    localStorage.setItem('message_templates', JSON.stringify(updatedTemplates));
    
    toast({
      title: "Template deleted",
      description: "Message template removed successfully",
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

      {/* Message Templates */}
      <Card className="p-8 mt-6">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Message Templates</h2>
              <p className="text-sm text-muted-foreground">
                Create custom message templates. Use {"{name}"} as placeholder.
              </p>
            </div>
          </div>

          {/* Existing Templates */}
          <div className="space-y-3">
            {templates.map((template) => (
              <div key={template.id} className="flex items-start gap-3 p-4 border border-border rounded-lg">
                <div className="flex-1">
                  <p className="font-semibold text-sm mb-1">{template.name}</p>
                  <p className="text-sm text-muted-foreground">{template.template}</p>
                </div>
                {template.id !== 'promotional' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteTemplate(template.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Add New Template */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="font-semibold">Add New Template</h3>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  placeholder="e.g., Fun Diwali Message"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-text">Message Template</Label>
                <Textarea
                  id="template-text"
                  placeholder="Happy Diwali {name} 🪔&#10;Never think you are alone 👁&#10;Masters Up promotion messages always there🫂"
                  value={newTemplateText}
                  onChange={(e) => setNewTemplateText(e.target.value)}
                  rows={5}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Use {"{name}"} where you want the person's name. AI will create slight variations to avoid spam detection.
                </p>
              </div>
              <Button onClick={addTemplate} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Template
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SettingsSection;
