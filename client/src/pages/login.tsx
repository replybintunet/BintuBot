import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Video, LogIn, Info } from "lucide-react";
import { authService } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [accountCode, setAccountCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!accountCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter an account code",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.login(accountCode);
      
      if (response.success) {
        toast({
          title: "Success",
          description: "Login successful! Welcome to BintuBot",
        });
        onLoginSuccess();
      }
    } catch (error) {
      toast({
        title: "Login Failed",
        description: "Invalid account code. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 via-sky-50 to-blue-50 fade-in">
      <div className="w-full max-w-md">
        {/* Logo and Welcome */}
        <div className="text-center mb-8 slide-in">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-sky-400 to-sky-600 rounded-full mb-6 shadow-lg">
            <Video className="text-white" size={32} />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent mb-3">BintuBot</h1>
          <p className="text-gray-600 text-lg">Professional YouTube Live Streaming Platform</p>
          <div className="w-16 h-1 bg-gradient-to-r from-sky-400 to-blue-500 mx-auto mt-4 rounded-full"></div>
        </div>

        {/* Login Card */}
        <Card className="shadow-xl border-0 slide-in bg-white/80 backdrop-blur-sm">
          <CardContent className="pt-8 pb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-8 text-center">
              Secure Access Portal
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="accountCode" className="text-sm font-medium text-gray-700 mb-3 block">
                  Access Code
                </Label>
                <Input
                  id="accountCode"
                  type="password"
                  placeholder="••••••••"
                  value={accountCode}
                  onChange={(e) => setAccountCode(e.target.value)}
                  className="h-12 text-center text-lg tracking-widest bg-gray-50 border-2 focus:border-sky-400 focus:bg-white transition-all duration-200"
                  disabled={isLoading}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-semibold tracking-wide ripple shadow-lg hover:shadow-xl transition-all duration-200"
                disabled={isLoading}
              >
                <LogIn className="mr-2" size={18} />
                {isLoading ? "Authenticating..." : "Access Dashboard"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <Card className="mt-6 bg-gradient-to-r from-sky-50 to-blue-50 border-sky-200 slide-in">
          <CardContent className="pt-4">
            <p className="text-sm text-sky-800 flex items-center">
              <Info className="mr-2 flex-shrink-0" size={16} />
              Secure access required. Contact administrator for access credentials. Call +254729499463 for Access Code.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}