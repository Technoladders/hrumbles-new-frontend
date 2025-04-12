
import { useState, useEffect } from "react";
import { personalInfoService } from "@/services/employee/personalInfo.service";

export const useEmailValidation = (email: string | undefined) => {
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const checkEmail = async (email: string) => {
      try {
        setIsCheckingEmail(true);
        const exists = await personalInfoService.checkEmailExists(email);
        if (exists) {
          setEmailError(`Email ${email} is already registered`);
          return false;
        } else {
          setEmailError(null);
          return true;
        }
      } catch (error) {
        console.error('Error checking email:', error);
        return false;
      } finally {
        setIsCheckingEmail(false);
      }
    };

    if (email) {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        checkEmail(email);
      }, 500);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [email]);

  return { isCheckingEmail, emailError, setEmailError };
};
