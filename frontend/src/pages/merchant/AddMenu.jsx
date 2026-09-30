import { Navigate } from "react-router";

/**
 * /merchant/menu/new is kept as a deep link: adding a menu now happens in a pop-up
 * over the menu list (see Menu.jsx), so this route just opens it there.
 */
function AddMenu() {
  return <Navigate to="/merchant/menu?new=1" replace />;
}

export default AddMenu;
