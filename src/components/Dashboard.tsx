import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Search, 
  MessageCircle, 
  Download, 
  CheckCircle2, 
  Clock,
  Loader2,
  RefreshCcw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Lead {
  id: string;
  phone: string;
  name: string | null;
  message: string | null;
  wa_link: string | null;
  status: string;
  created_at: string;
}

const Dashboard = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "sent" | "unsent">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
      setFilteredLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast({
        title: "Error",
        description: "Failed to fetch leads",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  useEffect(() => {
    let filtered = leads;

    if (statusFilter !== "all") {
      filtered = filtered.filter(lead => lead.status === statusFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(lead => 
        lead.phone.includes(searchQuery) || 
        lead.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredLeads(filtered);
  }, [searchQuery, statusFilter, leads]);

  const generateMessages = async () => {
    const geminiApiKey = localStorage.getItem('gemini_api_key');
    
    if (!geminiApiKey) {
      toast({
        title: "API Key Missing",
        description: "Please set your Gemini API key in Settings first.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-messages', {
        body: { apiKey: geminiApiKey }
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: `Generated messages for ${data.updatedCount} lead(s).`,
      });

      fetchLeads();
    } catch (error) {
      console.error('Error generating messages:', error);
      toast({
        title: "Error",
        description: "Failed to generate messages",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const markAsSent = async (id: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: 'sent' })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Marked as sent",
        description: "Lead status updated successfully",
      });

      fetchLeads();
    } catch (error) {
      console.error('Error updating lead:', error);
      toast({
        title: "Error",
        description: "Failed to update lead status",
        variant: "destructive",
      });
    }
  };

  const openWhatsApp = (waLink: string | null, id: string) => {
    if (!waLink) {
      toast({
        title: "No WhatsApp link",
        description: "Generate messages first to create WhatsApp links",
        variant: "destructive",
      });
      return;
    }

    window.open(waLink, '_blank');
    markAsSent(id);
  };

  const downloadCSV = () => {
    const csvContent = [
      ['Name', 'Phone', 'Message', 'WhatsApp Link', 'Status'],
      ...filteredLeads.map(lead => [
        lead.name || '',
        lead.phone,
        lead.message || '',
        lead.wa_link || '',
        lead.status
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wa_urls.csv';
    a.click();
  };

  const stats = {
    total: leads.length,
    sent: leads.filter(l => l.status === 'sent').length,
    unsent: leads.filter(l => l.status === 'unsent').length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Leads</p>
              <p className="text-3xl font-bold">{stats.total}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Sent</p>
              <p className="text-3xl font-bold text-primary">{stats.sent}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Unsent</p>
              <p className="text-3xl font-bold text-muted-foreground">{stats.unsent}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Clock className="w-6 h-6 text-muted-foreground" />
            </div>
          </div>
        </Card>
      </div>

      {/* Controls */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-1 gap-2 w-full md:w-auto">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 border border-border rounded-md bg-background"
            >
              <option value="all">All</option>
              <option value="sent">Sent</option>
              <option value="unsent">Unsent</option>
            </select>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={fetchLeads}
              size="sm"
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={generateMessages}
              disabled={isGenerating || leads.length === 0}
              size="sm"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <MessageCircle className="w-4 h-4 mr-2" />
              )}
              Generate Messages
            </Button>
            <Button
              onClick={downloadCSV}
              disabled={filteredLeads.length === 0}
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </Card>

      {/* Leads Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No leads found. Upload screenshots to get started.
                </TableCell>
              </TableRow>
            ) : (
              filteredLeads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">
                    {lead.name || "—"}
                  </TableCell>
                  <TableCell>{lead.phone}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {lead.message || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={lead.status === 'sent' ? 'default' : 'secondary'}>
                      {lead.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      onClick={() => openWhatsApp(lead.wa_link, lead.id)}
                      disabled={!lead.wa_link}
                    >
                      <MessageCircle className="w-4 h-4 mr-1" />
                      Send
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default Dashboard;
