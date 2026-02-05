import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { handleGmailCallback } from "@/lib/gmail-auth";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const GmailCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      const auth = await handleGmailCallback();
      
      if (auth?.accessToken) {
        setStatus('success');
        setEmail(auth.userEmail);
        
        // Redirect back to main page after a short delay
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 2000);
      } else {
        setStatus('error');
        
        // Redirect back after showing error
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 3000);
      }
    };

    processCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-elevated">
        <CardContent className="p-8 text-center space-y-4">
          {status === 'loading' && (
            <>
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
              <h2 className="text-xl font-semibold">Connecting to Gmail...</h2>
              <p className="text-muted-foreground">Please wait while we complete the authorization.</p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <CheckCircle2 className="h-12 w-12 mx-auto text-success" />
              <h2 className="text-xl font-semibold text-success">Gmail Connected!</h2>
              {email && <p className="text-muted-foreground">Signed in as {email}</p>}
              <p className="text-sm text-muted-foreground">Redirecting you back...</p>
            </>
          )}
          
          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 mx-auto text-destructive" />
              <h2 className="text-xl font-semibold text-destructive">Connection Failed</h2>
              <p className="text-muted-foreground">Could not connect to Gmail. Please try again.</p>
              <p className="text-sm text-muted-foreground">Redirecting you back...</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GmailCallback;
