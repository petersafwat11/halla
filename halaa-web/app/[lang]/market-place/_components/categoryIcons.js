import {
  LayoutGrid,
  CalendarHeart,
  Clapperboard,
  Gift,
  UtensilsCrossed,
  Sparkles,
  Truck,
  Briefcase,
  LifeBuoy,
  Wrench,
  PartyPopper,
  Building2,
} from "lucide-react";

/**
 * Canonical service-category → icon map. Keys mirror the backend
 * SERVICE_CATEGORY_LABELS contract (shared/constants/serviceCategories).
 * `all` is the marketplace-only "show everything" pseudo-category.
 */
const CATEGORY_ICONS = {
  all: LayoutGrid,
  eventPlanning: CalendarHeart,
  mediaProduction: Clapperboard,
  giftsAndGiveaways: Gift,
  foodAndBeverages: UtensilsCrossed,
  beautyAndFashion: Sparkles,
  logisticsAndDelivery: Truck,
  corporateServices: Briefcase,
  supportServices: LifeBuoy,
  technicalServices: Wrench,
  soundLightingEntertainment: PartyPopper,
  hallsAndVenues: Building2,
};

export const getCategoryIcon = (key) => CATEGORY_ICONS[key] || LayoutGrid;

export default CATEGORY_ICONS;
