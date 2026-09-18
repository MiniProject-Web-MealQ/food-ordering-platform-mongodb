import { useNavigate } from "react-router";
import { defaultSelections, getMenuItem, missingRequiredGroups } from "./catalog";
import { useCustomer } from "./store";

/**
 * "+" on a menu row adds the item with its default options. Items that still need a choice, or that
 * would replace a cart from another restaurant, open the food detail page instead.
 */
export function useQuickAdd() {
  const navigate = useNavigate();
  const { state, dispatch } = useCustomer();

  return function quickAdd(menuId) {
    const menuItem = getMenuItem(menuId);
    const selections = defaultSelections(menuItem);
    const otherRestaurantInCart =
      state.cart.items.length > 0 && state.cart.restaurantId !== menuItem.restaurantId;

    if (missingRequiredGroups(menuItem, selections).length > 0 || otherRestaurantInCart) {
      navigate(`/customer/restaurants/${menuItem.restaurantId}/menu/${menuId}`);
      return false;
    }
    dispatch({ type: "cart/add", menuId, selections, note: "", qty: 1 });
    return true;
  };
}
