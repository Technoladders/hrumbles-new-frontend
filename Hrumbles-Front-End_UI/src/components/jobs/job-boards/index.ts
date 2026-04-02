// src/components/jobs/job-boards/index.ts
export { JobBoardsHub }       from "./JobBoardsHub";
export { JobBoardShareModal } from "./JobBoardShareModal";
export { ConfigureModal }     from "./ConfigureModal";
export { BoardLogo, BOARD_LOGOS } from "./BoardLogos";
export {
  JOB_BOARDS, getBoardById,
  BOARDS_COUNT, FREE_REACH, TOTAL_REACH,
  getJobPosts, recordPost, formatPostedDate,
} from "./jobBoardsData";
export type { JobBoard, BoardStatus, BoardTier, PostRecord } from "./jobBoardsData";


