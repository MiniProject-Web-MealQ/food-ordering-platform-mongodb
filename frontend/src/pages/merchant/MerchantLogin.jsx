import { Navigate, useLocation } from "react-router";

// Keep existing merchant login links working through the shared login page.
export default function MerchantLogin() {
  const location = useLocation();
  return <Navigate to="/login?role=merchant" replace state={location.state} />;
}
