// Gmail OAuth configuration
// Uses Google OAuth 2.0 with Gmail compose scope

const GOOGLE_CLIENT_ID = '395015459000-gtqtea4on362rtukvrfhesp2agt5fq2h.apps.googleusercontent.com';
const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  refresh_token?: string;
  id_token?: string;
}

interface GmailAuthState {
  accessToken: string | null;
  expiresAt: number | null;
  userEmail: string | null;
}

const STORAGE_KEY = 'professorConnect_gmailAuth';

export function getStoredGmailAuth(): GmailAuthState | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  
  try {
    const auth = JSON.parse(stored) as GmailAuthState;
    // Check if token is expired (with 5 min buffer)
    if (auth.expiresAt && Date.now() > auth.expiresAt - 300000) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return auth;
  } catch {
    return null;
  }
}

export function storeGmailAuth(auth: GmailAuthState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
}

export function clearGmailAuth(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function isGmailConnected(): boolean {
  const auth = getStoredGmailAuth();
  return !!auth?.accessToken;
}

export function getGmailUserEmail(): string | null {
  const auth = getStoredGmailAuth();
  return auth?.userEmail || null;
}

export function initiateGmailOAuth(): void {
  if (!GOOGLE_CLIENT_ID) {
    console.error('Google Client ID not configured');
    return;
  }

  const redirectUri = `${window.location.origin}/gmail-callback`;
  const state = crypto.randomUUID();
  
  // Store state for CSRF protection
  sessionStorage.setItem('gmail_oauth_state', state);
  
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'token',
    scope: GMAIL_SCOPES.join(' '),
    state: state,
    access_type: 'online',
    prompt: 'consent',
  });
  
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function handleGmailCallback(): Promise<GmailAuthState | null> {
  // Parse the hash fragment for implicit grant flow
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  
  const accessToken = params.get('access_token');
  const expiresIn = params.get('expires_in');
  const state = params.get('state');
  const error = params.get('error');
  
  if (error) {
    console.error('Gmail OAuth error:', error);
    return null;
  }
  
  // Verify state for CSRF protection
  const storedState = sessionStorage.getItem('gmail_oauth_state');
  if (state !== storedState) {
    console.error('State mismatch in OAuth callback');
    return null;
  }
  sessionStorage.removeItem('gmail_oauth_state');
  
  if (!accessToken) {
    console.error('No access token in callback');
    return null;
  }
  
  // Fetch user email using the token
  let userEmail: string | null = null;
  try {
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (userInfoRes.ok) {
      const userInfo = await userInfoRes.json();
      userEmail = userInfo.email;
    }
  } catch (e) {
    console.error('Failed to fetch user info:', e);
  }
  
  const auth: GmailAuthState = {
    accessToken,
    expiresAt: Date.now() + (parseInt(expiresIn || '3600') * 1000),
    userEmail,
  };
  
  storeGmailAuth(auth);
  
  // Clean up URL
  window.history.replaceState({}, document.title, window.location.pathname);
  
  return auth;
}

export function getGmailAccessToken(): string | null {
  const auth = getStoredGmailAuth();
  return auth?.accessToken || null;
}
