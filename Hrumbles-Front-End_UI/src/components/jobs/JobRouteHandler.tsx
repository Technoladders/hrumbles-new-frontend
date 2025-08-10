import { useSelector } from "react-redux";
import Jobs from "@/pages/jobs/Jobs"; // Original component for other orgs
import AiJobsDashboard from "@/pages/bg-verification/AiJobsDashboard"; // The new dashboard for Ascendion


// The ID for the Ascendion organization
const ASCENDION_ORGANIZATION_ID = "22068cb4-88fb-49e4-9fb8-4fa7ae9c23e5";

const JobRouteHandler = () => {
  const organizationId = useSelector((state: any) => state.auth.organization_id);

  if (organizationId === ASCENDION_ORGANIZATION_ID) {
    return <AiJobsDashboard />;
  }

  return <Jobs />;
};

export default JobRouteHandler;