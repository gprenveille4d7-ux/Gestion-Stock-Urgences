export type CartBox = 3 | 4;

export type ItemPosition = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  zIndex?: number;
};

export type EmergencyCartItem = {
  id: string;
  name: string;
  specification?: string;
  category: string;
  quantityTarget?: number;
  unit?: string;
  expiryTracked?: boolean;
  location: string;
  note?: string;
  asset?: string;
  position?: ItemPosition;
};

export type EmergencyCartDrawer = {
  id: string;
  label: string;
  category: string;
  topAsset?: string;
  hitArea: ItemPosition;
  items: EmergencyCartItem[];
  available: boolean;
};

export type EmergencyCart = {
  id: string;
  box: CartBox;
  label: string;
  frontAsset: string;
  drawers: EmergencyCartDrawer[];
};
