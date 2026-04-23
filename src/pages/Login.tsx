import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LoginForm, SmokeyBackground } from "@/components/ui/login-form";
import { toast } from "@/hooks/use-toast";
import { createAccountWithEmail, signInWithEmail, signInWithGoogle } from "@/lib/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  const handleAuth = async (credentials: { email: string; password: string }) => {
    setIsSubmitting(true);

    try {
      const email = credentials.email.trim();
      const password = credentials.password;

      if (!email || password.length < 6) {
        throw new Error("Enter a valid email and password (minimum 6 characters).");
      }

      if (mode === "signup") {
        await createAccountWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }

      toast({
        title: mode === "signup" ? "Account created" : "Signed in",
        description: "Welcome to DocuMind Insight.",
      });
      navigate("/landing", { replace: true });
    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Unable to sign in.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);

    try {
      await signInWithGoogle();
      toast({
        title: "Signed in",
        description: "Welcome to DocuMind Insight.",
      });
      navigate("/landing", { replace: true });
    } catch (error) {
      toast({
        title: "Google login failed",
        description: error instanceof Error ? error.message : "Unable to sign in with Google.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden" style={{ backgroundColor: '#0f172a' }}>
      <SmokeyBackground className="absolute inset-0" />
      <div className="relative z-10 flex h-full w-full items-center justify-center p-4">
        <LoginForm
          onSubmit={handleAuth}
          onGoogleSignIn={handleGoogleSignIn}
          isLoading={isSubmitting}
          mode={mode}
          onModeChange={setMode}
        />
      </div>
    </main>
  );
}
