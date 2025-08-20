import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import JobView from "@/pages/jobs/JobView"; // Your original component
import AiJobView from "@/pages/bg-verification/AiJobView"; // The new component


const ASCENDION_ORGANIZATION_ID = "22068cb4-88fb-49e4-9fb8-4fa7ae9c2";

const JobViewRouteHandler = () => {
  const { id } = useParams<{ id: string }>();
  const organizationId = useSelector((state: any) => state.auth.organization_id);

  if (organizationId === ASCENDION_ORGANIZATION_ID) {
    return <AiJobView jobId={id} />;
  }

  // Pass the `id` to the original component if needed, or let it use useParams itself
  return <JobView />;
};

export default JobViewRouteHandler;