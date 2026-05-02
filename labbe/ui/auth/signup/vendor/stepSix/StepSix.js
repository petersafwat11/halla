import React from "react";
import styles from "./stepSix.module.css";
import { StepTitle } from "../../../../commen/title/SectionTitle";
import SummarySection from "./SummarySection";
import { useTranslation } from "react-i18next";
import { useFormContext } from "react-hook-form";

const StepSix = ({ goToPreviousStep }) => {
  const { t } = useTranslation("signup");
  const { watch } = useFormContext();
  const vendorData = watch();

  return (
    <div className={styles.container}>
      <StepTitle
        title={t("signupForm.vendor.summary.title")}
        description={t("signupForm.vendor.summary.description")}
        onArrowClick={goToPreviousStep}
      />

      <div className={styles.sections}>
        <SummarySection
          title={t("signupForm.vendor.identity.title")}
          icon="/svg/auth/user.svg"
          data={vendorData.identity}
          fields={[
            {
              key: "brandName",
              label: t("signupForm.vendor.identity.brandName.label"),
              type: "text",
            },
            {
              key: "ownerFullName",
              label: t("signupForm.vendor.identity.ownerFullName.label"),
              type: "text",
            },
            {
              key: "serviceType",
              label: t("signupForm.vendor.identity.serviceType.title"),
              type: "array",
              options: t("signupForm.vendor.identity.serviceType.options", {
                returnObjects: true,
              }),
            },
            {
              key: "phoneNumber",
              label: t("signupForm.vendor.identity.phoneNumber.label"),
              type: "text",
            },
            {
              key: "email",
              label: t("signupForm.vendor.identity.email.label"),
              type: "text",
            },
          ]}
        />

        <SummarySection
          title={t("signupForm.vendor.serviceData.title")}
          icon="/svg/auth/direct-send.svg"
          data={vendorData.serviceData}
          fields={[
            {
              key: "serviceDescription",
              label: t(
                "signupForm.vendor.serviceData.serviceDescription.label"
              ),
              type: "text",
            },
            {
              key: "city",
              label: t("signupForm.vendor.serviceData.city.label"),
              type: "text",
            },
            {
              key: "coverageArea",
              label: t("signupForm.vendor.serviceData.coverageArea.title"),
              type: "array",
              options: t("signupForm.vendor.serviceData.coverageArea.options", {
                returnObjects: true,
              }),
            },
            {
              key: "eventPlanning",
              label: t("signupForm.vendor.serviceData.eventPlanning.title"),
              type: "array",
              options: t(
                "signupForm.vendor.serviceData.eventPlanning.options",
                {
                  returnObjects: true,
                }
              ),
            },
            {
              key: "mediaProduction",
              label: t("signupForm.vendor.serviceData.mediaProduction.title"),
              type: "array",
              options: t(
                "signupForm.vendor.serviceData.mediaProduction.options",
                {
                  returnObjects: true,
                }
              ),
            },
            {
              key: "giftsAndGiveaways",
              label: t("signupForm.vendor.serviceData.giftsAndGiveaways.title"),
              type: "array",
              options: t(
                "signupForm.vendor.serviceData.giftsAndGiveaways.options",
                {
                  returnObjects: true,
                }
              ),
            },
            {
              key: "foodAndBeverages",
              label: t("signupForm.vendor.serviceData.foodAndBeverages.title"),
              type: "array",
              options: t(
                "signupForm.vendor.serviceData.foodAndBeverages.options",
                {
                  returnObjects: true,
                }
              ),
            },
            {
              key: "beautyAndFashion",
              label: t("signupForm.vendor.serviceData.beautyAndFashion.title"),
              type: "array",
              options: t(
                "signupForm.vendor.serviceData.beautyAndFashion.options",
                {
                  returnObjects: true,
                }
              ),
            },
            {
              key: "logisticsAndDelivery",
              label: t(
                "signupForm.vendor.serviceData.logisticsAndDelivery.title"
              ),
              type: "array",
              options: t(
                "signupForm.vendor.serviceData.logisticsAndDelivery.options",
                {
                  returnObjects: true,
                }
              ),
            },
            {
              key: "corporateServices",
              label: t("signupForm.vendor.serviceData.corporateServices.title"),
              type: "array",
              options: t(
                "signupForm.vendor.serviceData.corporateServices.options",
                {
                  returnObjects: true,
                }
              ),
            },
          ]}
        />

        <SummarySection
          title={t("signupForm.vendor.samplesAndPackages.title")}
          icon="/svg/auth/gallery.svg"
          data={vendorData.samplesAndPackages}
          fields={[
            {
              key: "portfolioImages",
              label: t(
                "signupForm.vendor.samplesAndPackages.portfolioImages.label"
              ),
              type: "file",
            },
            {
              key: "businessLogo",
              label: t(
                "signupForm.vendor.samplesAndPackages.businessLogo.label"
              ),
              type: "logo",
            },
            {
              key: "pricePackages",
              label: t(
                "signupForm.vendor.samplesAndPackages.pricePackages.label"
              ),
              type: "file",
            },
          ]}
        />

        <SummarySection
          title={t("signupForm.vendor.paymentData.title")}
          icon="/svg/auth/card-2.svg"
          data={vendorData.paymentData}
          fields={[
            {
              key: "payment_type",
              label: t(
                "signupForm.vendor.paymentData.refundPolicy.options.fullRefund.label"
              ),
              type: "text",
            },
            {
              key: "paymentOptions",
              label: t("signupForm.vendor.paymentData.paymentMethods.title"),
              type: "array",
            },
            {
              key: "termsForRefund",
              label: t(
                "signupForm.vendor.paymentData.refundPolicy.terms.label"
              ),
              type: "text",
            },
          ]}
        />

        <SummarySection
          title={t("signupForm.vendor.commercialVerification.title")}
          icon="/svg/auth/verify.svg"
          data={vendorData.commercialVerification}
          fields={[
            {
              key: "company.name",
              label: t(
                "signupForm.vendor.paymentData.company.fields.name.label"
              ),
              type: "text",
            },
            {
              key: "company.license",
              label: t("z.vendor.paymentData.company.fields.license.label"),
              type: "text",
            },
            {
              key: "company.tax",
              label: t(
                "signupForm.vendor.paymentData.company.fields.tax.label"
              ),
              type: "text",
            },
            {
              key: "address.city",
              label: t(
                "signupForm.vendor.paymentData.address.fields.city.label"
              ),
              type: "text",
            },
            {
              key: "address.neighborhood",
              label: t(
                "signupForm.vendor.paymentData.address.fields.neighborhood.label"
              ),
              type: "text",
            },
            {
              key: "address.street",
              label: t(
                "signupForm.vendor.paymentData.address.fields.street.label"
              ),
              type: "text",
            },
            {
              key: "address.buildingNumber",
              label: t(
                "signupForm.vendor.paymentData.address.fields.buildingNumber.label"
              ),
              type: "text",
            },
            {
              key: "address.additionalNumber",
              label: t(
                "signupForm.vendor.paymentData.address.fields.additionalNumber.label"
              ),
              type: "text",
            },
            {
              key: "address.postalCode",
              label: t(
                "signupForm.vendor.paymentData.address.fields.postalCode.label"
              ),
              type: "text",
            },
            {
              key: "paymentMethods",
              label: t("signupForm.vendor.paymentData.paymentMethods.title"),
              type: "array",
            },
          ]}
        />

        <SummarySection
          title={t("signupForm.vendor.otherLinksAndData.title")}
          icon="/svg/auth/link.svg"
          data={vendorData.otherLinksAndData}
          fields={[
            {
              key: "instagramLink",
              label: t(
                "signupForm.vendor.otherLinksAndData.instagramLink.label"
              ),
              type: "text",
            },
            {
              key: "linkedinLink",
              label: t(
                "signupForm.vendor.otherLinksAndData.linkedinLink.label"
              ),
              type: "text",
            },
            {
              key: "websiteLink",
              label: t("signupForm.vendor.otherLinksAndData.websiteLink.label"),
              type: "text",
            },
            {
              key: "cv",
              label: t("signupForm.vendor.otherLinksAndData.cv.label"),
              type: "file",
            },
            {
              key: "profileFile",
              label: t("signupForm.vendor.otherLinksAndData.profileFile.label"),
              type: "file",
            },
          ]}
        />
      </div>
    </div>
  );
};

export default StepSix;
