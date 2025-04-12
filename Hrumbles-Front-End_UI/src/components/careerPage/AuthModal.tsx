
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/careerPage/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/careerPage/ui/tabs';
import { Button } from '@/components/careerPage/ui/button';
import { Input } from '@/components/careerPage/ui/input';
import { Label } from '@/components/careerPage/ui/label';
import { useToast } from '@/hooks/use-toast';
import { LogIn, UserPlus, ArrowRight } from 'lucide-react';
import '../../careerpage.css'

interface AuthModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onOpenChange }) => {
  const [activeTab, setActiveTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would authenticate with a backend
    toast({
      title: "Login Successful",
      description: "Welcome back to Hrumbles.ai Career Portal",
    });
    onOpenChange(false);
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would register with a backend
    toast({
      title: "Registration Successful",
      description: "Your employer account has been created",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden rounded-xl">
        <DialogHeader className="pt-6 px-6">
          <DialogTitle className="text-2xl font-bold text-center">
            {activeTab === 'login' ? 'Welcome Back' : 'Create Account'}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 w-full mb-6">
            <TabsTrigger value="login" className="data-[state=active]:bg-hrumbles-accent data-[state=active]:text-white">
              <LogIn size={16} className="mr-2" /> Login
            </TabsTrigger>
            <TabsTrigger value="signup" className="data-[state=active]:bg-hrumbles-accent data-[state=active]:text-white">
              <UserPlus size={16} className="mr-2" /> Sign Up
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="login" className="px-6 pb-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="you@example.com" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Button type="button" variant="link" className="p-0 h-auto font-normal text-xs">
                    Forgot password?
                  </Button>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-hrumbles-accent hover:bg-hrumbles-accent/90 group"
              >
                Sign In <ArrowRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
            </form>
          </TabsContent>
          
          <TabsContent value="signup" className="px-6 pb-6">
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  id="name" 
                  placeholder="John Doe" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="company">Company Name</Label>
                <Input 
                  id="company" 
                  placeholder="Acme Inc." 
                  required
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input 
                  id="signup-email" 
                  type="email" 
                  placeholder="you@example.com" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input 
                  id="signup-password" 
                  type="password" 
                  placeholder="••••••••" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-hrumbles-accent hover:bg-hrumbles-accent/90 group"
              >
                Create Account <ArrowRight size={16} className="ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
              
              <p className="text-xs text-center text-hrumbles-muted">
                By creating an account, you agree to our Terms of Service and Privacy Policy.
              </p>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
