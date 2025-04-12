
import { useState } from "react";
import { Button } from "@/components/jobs/ui/button";
import { Copy, Edit, Check, Share2, Linkedin, Twitter, Send } from "lucide-react";
import { Input } from "@/components/jobs/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/jobs/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/jobs/ui/tooltip";

interface JobShareActionsProps {
  jobId: string;
}

export default function JobShareActions({ jobId }: JobShareActionsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [customSuffix, setCustomSuffix] = useState(jobId);
  const baseUrl = "https://jobsportal.com/job/";
  
  const jobUrl = `${baseUrl}${customSuffix}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(jobUrl);
    toast.success("Link copied to clipboard");
  };

  const handleSaveCustomSuffix = () => {
    // In a real app, we would update this on the backend
    setIsEditing(false);
    toast.success("Custom URL updated successfully");
  };

  const shareToSocial = (platform: string) => {
    let shareUrl = "";
    
    switch(platform) {
      case "linkedin":
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(jobUrl)}`;
        break;
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(jobUrl)}`;
        break;
      case "whatsapp":
        shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(jobUrl)}`;
        break;
      case "naukri":
        // Placeholder - Naukri doesn't have a direct sharing API
        shareUrl = `https://www.naukri.com/`;
        toast.info("Naukri sharing would be integrated here");
        break;
      default:
        break;
    }
    
    if (shareUrl) {
      window.open(shareUrl, "_blank");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-grow max-w-md">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <div className="flex-grow flex items-center gap-0 border rounded-md overflow-hidden">
              <span className="text-sm px-2 py-1 bg-gray-50 border-r text-gray-500 whitespace-nowrap">
                {baseUrl}
              </span>
              <Input 
                value={customSuffix}
                onChange={(e) => setCustomSuffix(e.target.value)}
                className="border-0 h-9"
              />
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="icon" 
                    variant="outline" 
                    className="h-9 w-9"
                    onClick={handleSaveCustomSuffix}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Save custom URL</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex-grow">
              <Input
                readOnly
                value={jobUrl}
                className="bg-gray-50 pr-20 text-sm"
              />
            </div>
            <div className="flex absolute right-0 mr-16">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Edit URL</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        )}
      </div>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon" 
              className="h-9 w-9"
              onClick={handleCopyLink}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Copy link</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DropdownMenu>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon" 
                  className="h-9 w-9"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Share job</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => shareToSocial("linkedin")}>
            <Linkedin className="mr-2 h-4 w-4 text-blue-600" />
            <span>LinkedIn</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => shareToSocial("twitter")}>
            <Twitter className="mr-2 h-4 w-4 text-blue-400" />
            <span>Twitter/X</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => shareToSocial("whatsapp")}>
            <div className="mr-2 h-4 w-4 flex items-center justify-center bg-green-500 rounded-full">
              <Send className="h-3 w-3 text-white" />
            </div>
            <span>WhatsApp</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => shareToSocial("naukri")}>
            <div className="mr-2 h-4 w-4 flex items-center justify-center bg-purple-500 rounded-full">
              <span className="text-white text-xs font-bold">N</span>
            </div>
            <span>Naukri</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
