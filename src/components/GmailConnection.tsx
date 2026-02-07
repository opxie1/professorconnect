import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  isGmailConnected, 
  getGmailUserEmail, 
  initiateGmailOAuth, 
  clearGmailAuth 
} from "@/lib/gmail-auth";
import { Mail, CheckCircle2, LogOut, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface GmailConnectionProps {
  onConnectionChange?: (connected: boolean) => void;
  className?: string;
}

export function GmailConnection({ onConnectionChange, className }: GmailConnectionProps) {
  const [connected, setConnected] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [clientConfigured, setClientConfigured] = useState(false);

  useEffect(() => {
    const checkConnection = () => {
      const isConnected = isGmailConnected();
      const email = getGmailUserEmail();
      const hasClientId = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;
      
      setConnected(isConnected);
      setUserEmail(email);
      setClientConfigured(hasClientId);
      onConnectionChange?.(isConnected);
    };

    checkConnection();
    
    // Check periodically in case token expires
    const interval = setInterval(checkConnection, 60000);
    return () => clearInterval(interval);
  }, [onConnectionChange]);

  const handleConnect = () => {
    initiateGmailOAuth();
  };

  const handleDisconnect = () => {
    clearGmailAuth();
    setConnected(false);
    setUserEmail(null);
    onConnectionChange?.(false);
  };

  if (!clientConfigured) {
    return null;
  }

  if (connected) {
    return (
      <Card className={cn("border-success/30 bg-success/5", className)}>
        <CardContent className="p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Gmail Connected</p>
              {userEmail && (
                <p className="text-xs text-muted-foreground">{userEmail}</p>
              )}
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleDisconnect}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-primary/20", className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Connect Gmail</p>
              <p className="text-xs text-muted-foreground">
                Auto-attach your resume to drafts
              </p>
            </div>
          </div>
          <Button size="sm" onClick={handleConnect} className="gap-2">
            <Mail className="h-4 w-4" />
            Connect
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
