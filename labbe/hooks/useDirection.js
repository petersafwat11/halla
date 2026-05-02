import { useParams } from "next/navigation";
import { i18nRouterConfig } from "@/localization/i18nRouterConfig";

export const useDirection = () => {
  const params = useParams();
  const lang = params?.lang || i18nRouterConfig.defaultLocale;

  const direction = i18nRouterConfig.getDirection(lang);
  const isRTL = i18nRouterConfig.isRTL(lang);
  const isLTR = !isRTL;

  return {
    lang,
    direction,
    isRTL,
    isLTR,
  };
};

export default useDirection;
 