import { Navigate, useParams } from "react-router";

/**
 * /merchant/menu/:id/edit is kept as a deep link: editing now happens in a pop-up
 * over the menu list (see Menu.jsx), so this route just opens it there.
 */
function EditMenu() {
  const { id } = useParams();
  return <Navigate to={`/merchant/menu?edit=${encodeURIComponent(id)}`} replace />;
}

export default EditMenu;
