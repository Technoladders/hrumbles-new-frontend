
import { JobData } from "@/lib/types";
import { DbJob, HrJob } from "./types";

// Re-export the functionality from jobDataTransformer.ts
export { transformToJobData as mapDbJobToJobData, transformToDbJob as mapJobDataToDbJob } from "./jobDataTransformer";
