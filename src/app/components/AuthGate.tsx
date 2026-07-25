import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

async function checkAuthStatus() {
  const response = await fetch("/api/auth", {
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    return { authRequired: false, ok: false };
  }

  return response.json();
}

async function signIn(password: string) {
  const response = await fetch("/api/auth", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password }),
  });

  const payload = await response.json().catch(() => ({}));
  return {
    ok: response.ok && payload.ok,
    message: payload.error || "Authentication failed",
  };
}

type AuthGateProps = {
  children: React.ReactNode;
};

export function AuthGate({ children }: AuthGateProps) {
  const [ready, setReady] = useState(false);
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    checkAuthStatus()
      .then((result) => {
        if (!active) return;
        if (result.authRequired) {
          setRequiresAuth(true);
        } else {
          setAuthenticated(true);
        }
      })
      .catch(() => {
        if (!active) return;
        setAuthenticated(true);
      })
      .finally(() => {
        if (active) setReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const result = await signIn(password);
    if (result.ok) {
      setAuthenticated(true);
      setRequiresAuth(false);
      setPassword("");
      return;
    }
    setError(result.message);
  };

  if (!ready) return null;

  if (!requiresAuth || authenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <Card className="w-full max-w-md border-slate-800 bg-slate-900/90 text-slate-50">
        <CardHeader>
          <CardTitle>Access protected data</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="portal-password">Portal password</Label>
              <Input
                id="portal-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
              />
            </div>
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            <Button type="submit" className="w-full">
              Continue
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
