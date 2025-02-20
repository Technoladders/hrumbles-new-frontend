import { useSelector } from "react-redux";

const PermissionWrapper = ({ permission, children }) => {
  const { permissions } = useSelector((state) => state.auth);

  return permissions.includes(permission) ? children : null;
};

export default PermissionWrapper;
