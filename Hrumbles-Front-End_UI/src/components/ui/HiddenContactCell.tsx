// components/ui/HiddenContactCell.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TableCell } from "@/components/ui/table";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Mail, Phone, Copy, Check } from "lucide-react";

interface HiddenContactCellProps {
  email?: string;
  phone?: string;
  candidateId: string;
}

const HiddenContactCell = ({ email, phone, candidateId }: HiddenContactCellProps) => {
  const [justCopiedEmail, setJustCopiedEmail] = useState(false);
  const [justCopiedPhone, setJustCopiedPhone] = useState(false);

  const copyToClipboard = (value: string, field: "Email" | "Phone") => {
    navigator.clipboard.writeText(value);
    if (field === "Email") {
      setJustCopiedEmail(true);
      setTimeout(() => setJustCopiedEmail(false), 2000);
    } else {
      setJustCopiedPhone(true);
      setTimeout(() => setJustCopiedPhone(false), 2000);
    }
  };

  if (!email && !phone) {
    return <TableCell className="text-muted-foreground">N/A</TableCell>;
  }

  return (
    <TableCell>
      <div className="flex items-center gap-2">
        {email && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                aria-label="View email"
                className="p-0 h-6 w-6"
              >
                <Mail className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="p-2 flex items-center gap-2 w-auto max-w-[90vw] sm:max-w-[300px] bg-background border shadow-sm"
              side="top"
              align="center"
              sideOffset={8}
              collisionPadding={10}
            >
              <Mail className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm truncate flex-1">{email}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent table row click
                  copyToClipboard(email, "Email");
                }}
                className="h-6 w-6 p-0 flex-shrink-0"
                aria-label="Copy email"
              >
                {justCopiedEmail ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </PopoverContent>
          </Popover>
        )}
        {phone && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                aria-label="View phone"
                className="p-0 h-6 w-6"
              >
                <Phone className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="p-2 flex items-center gap-2 w-auto max-w-[90vw] sm:max-w-[300px] bg-background border shadow-sm"
              side="top"
              align="center"
              sideOffset={8}
              collisionPadding={10}
            >
              <Phone className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm truncate flex-1">{phone}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent table row click
                  copyToClipboard(phone, "Phone");
                }}
                className="h-6 w-6 p-0 flex-shrink-0"
                aria-label="Copy phone"
              >
                {justCopiedPhone ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </PopoverContent>
          </Popover>
        )}
        {!email && !phone && (
          <span className="text-sm text-muted-foreground">No contact info</span>
        )}
      </div>
    </TableCell>
  );
};

export default HiddenContactCell;