import { renderInventory } from '../inventory/InventoryView.js';
import { state as appState } from '../../store/state.js';

export function renderProducts(state = appState) {
  state.inventoryTab = 'catalog';
  return renderInventory(state);
}
