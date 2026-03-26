/**
 * indianStates.ts
 *
 * State/UT list for the ImportHolidaysDialog UI.
 * libraryCode = the code that date-holidays uses (may differ from ISO/RGI code).
 */

export interface IndianState {
  code: string;          // Our internal code (shown in UI, stored in DB)
  libraryCode: string;   // Code expected by date-holidays npm package
  name: string;
  region: "North" | "South" | "East" | "West" | "Central" | "Northeast" | "UT";
}

export const INDIAN_STATES: IndianState[] = [
  // States
  { code: "AP", libraryCode: "AP", name: "Andhra Pradesh",       region: "South"     },
  { code: "AR", libraryCode: "AR", name: "Arunachal Pradesh",    region: "Northeast" },
  { code: "AS", libraryCode: "AS", name: "Assam",                region: "Northeast" },
  { code: "BR", libraryCode: "BR", name: "Bihar",                region: "East"      },
  { code: "CT", libraryCode: "CT", name: "Chhattisgarh",         region: "Central"   },
  { code: "GA", libraryCode: "GA", name: "Goa",                  region: "West"      },
  { code: "GJ", libraryCode: "GJ", name: "Gujarat",              region: "West"      },
  { code: "HR", libraryCode: "HR", name: "Haryana",              region: "North"     },
  { code: "HP", libraryCode: "HP", name: "Himachal Pradesh",     region: "North"     },
  { code: "JH", libraryCode: "JH", name: "Jharkhand",            region: "East"      },
  { code: "KA", libraryCode: "KA", name: "Karnataka",            region: "South"     },
  { code: "KL", libraryCode: "KL", name: "Kerala",               region: "South"     },
  { code: "MP", libraryCode: "MP", name: "Madhya Pradesh",       region: "Central"   },
  { code: "MH", libraryCode: "MH", name: "Maharashtra",          region: "West"      },
  { code: "MN", libraryCode: "MN", name: "Manipur",              region: "Northeast" },
  { code: "ML", libraryCode: "ML", name: "Meghalaya",            region: "Northeast" },
  { code: "MZ", libraryCode: "MZ", name: "Mizoram",              region: "Northeast" },
  { code: "NL", libraryCode: "NL", name: "Nagaland",             region: "Northeast" },
  { code: "OD", libraryCode: "OR", name: "Odisha",               region: "East"      }, // library uses OR
  { code: "PB", libraryCode: "PB", name: "Punjab",               region: "North"     },
  { code: "RJ", libraryCode: "RJ", name: "Rajasthan",            region: "North"     },
  { code: "SK", libraryCode: "SK", name: "Sikkim",               region: "Northeast" },
  { code: "TN", libraryCode: "TN", name: "Tamil Nadu",           region: "South"     },
  { code: "TS", libraryCode: "TG", name: "Telangana",            region: "South"     }, // library uses TG
  { code: "TR", libraryCode: "TR", name: "Tripura",              region: "Northeast" },
  { code: "UK", libraryCode: "UT", name: "Uttarakhand",          region: "North"     }, // library uses UT
  { code: "UP", libraryCode: "UP", name: "Uttar Pradesh",        region: "North"     },
  { code: "WB", libraryCode: "WB", name: "West Bengal",          region: "East"      },
  // Union Territories
  { code: "AN", libraryCode: "AN", name: "Andaman & Nicobar",    region: "UT"        },
  { code: "CH", libraryCode: "CH", name: "Chandigarh",           region: "UT"        },
  { code: "DL", libraryCode: "DL", name: "Delhi",                region: "UT"        },
  { code: "DN", libraryCode: "DN", name: "Dadra & Nagar Haveli", region: "UT"        },
  { code: "DD", libraryCode: "DD", name: "Daman & Diu",          region: "UT"        },
  { code: "JK", libraryCode: "JK", name: "Jammu & Kashmir",      region: "UT"        },
  { code: "LA", libraryCode: "JK", name: "Ladakh",               region: "UT"        }, // no separate entry in library
  { code: "LD", libraryCode: "LD", name: "Lakshadweep",          region: "UT"        },
  { code: "PY", libraryCode: "PY", name: "Puducherry",           region: "UT"        },
];

export const ALL_STATE_CODES = INDIAN_STATES.map(s => s.code);

/** Lookup libraryCode by our internal code */
export function toLibraryCode(code: string): string {
  return INDIAN_STATES.find(s => s.code === code)?.libraryCode ?? code;
}