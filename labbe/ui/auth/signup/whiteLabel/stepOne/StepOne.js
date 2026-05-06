import React from "react";
import styles from "./stepOne.module.css";
import InputGroup from "@/ui/commen/inputs/inputGroup/InputGroup";
import InputSelect from "@/ui/commen/inputs/inputGroup/InputSelect";
import { StepTitle } from "../../../../commen/title/SectionTitle";
import SectionTitle from "../../../../commen/title/SectionTitle";
import { useTranslation } from "react-i18next";

const StepOne = () => {
  const { t } = useTranslation("signup");

  return (
    <div className={styles.container}>
      <StepTitle
        title={t("signupForm.whiteLabel.identity.title")}
        description={t("signupForm.whiteLabel.identity.description")}
      />
      <form className={styles.form}>
        <div className={styles.sections}>
          <div className={styles.section}>
            <SectionTitle
              title={t("signupForm.whiteLabel.identity.facilityInfo")}
              icon="/svg/auth/building.svg"
              height={24}
              width={24}
            />
            <div className={styles.inputs}>
              <InputGroup
                label={t("signupForm.whiteLabel.identity.arabicName.label")}
                type="text"
                placeholder={t(
                  "signupForm.whiteLabel.identity.arabicName.placeholder"
                )}
                required
                name="identity.arabicName"
                iconPath="auth/building.svg"
              />
              <InputGroup
                label={t("signupForm.whiteLabel.identity.englishName.label")}
                type="text"
                placeholder={t(
                  "signupForm.whiteLabel.identity.englishName.placeholder"
                )}
                required
                name="identity.englishName"
                iconPath="auth/building.svg"
              />
            </div>
          </div>

          {/* Company Information Section */}
          <div className={styles.section}>
            <SectionTitle
              title={t("signupForm.whiteLabel.payment.company.title")}
              icon="/svg/auth/building.svg"
              height={24}
              width={24}
            />
            <div className={styles.inputs}>
              <InputGroup
                label={t(
                  "signupForm.whiteLabel.payment.company.fields.name.label"
                )}
                type="text"
                placeholder={t(
                  "signupForm.whiteLabel.payment.company.fields.name.placeholder"
                )}
                required
                name="identity.companyName"
                iconPath="auth/building.svg"
              />
              <InputGroup
                label={t(
                  "signupForm.whiteLabel.payment.company.fields.license.label"
                )}
                type="text"
                placeholder={t(
                  "signupForm.whiteLabel.payment.company.fields.license.placeholder"
                )}
                required
                name="identity.licenseNumber"
                iconPath="auth/document.svg"
                hintMessage={t(
                  "signupForm.whiteLabel.payment.company.fields.license.hint"
                )}
              />
              <InputGroup
                label={t(
                  "signupForm.whiteLabel.payment.company.fields.tax.label"
                )}
                type="text"
                placeholder={t(
                  "signupForm.whiteLabel.payment.company.fields.tax.placeholder"
                )}
                name="identity.taxNumber"
                iconPath="auth/document.svg"
                hintMessage={t(
                  "signupForm.whiteLabel.payment.company.fields.tax.hint"
                )}
              />
            </div>
          </div>

          {/* National Address Section */}
          <div className={styles.section}>
            <SectionTitle
              title={t("signupForm.whiteLabel.payment.address.title")}
              icon="/svg/auth/location.svg"
              height={24}
              width={24}
            />
            <div className={styles.inputs}>
              <div className={styles.row}>
                <InputGroup
                  label={t(
                    "signupForm.whiteLabel.payment.address.fields.city.label"
                  )}
                  type="text"
                  placeholder={t(
                    "signupForm.whiteLabel.payment.address.fields.city.placeholder"
                  )}
                  required
                  name="identity.address.city"
                  iconPath="auth/location.svg"
                />
                <InputGroup
                  label={t(
                    "signupForm.whiteLabel.payment.address.fields.neighborhood.label"
                  )}
                  type="text"
                  placeholder={t(
                    "signupForm.whiteLabel.payment.address.fields.neighborhood.placeholder"
                  )}
                  required
                  name="identity.address.neighborhood"
                  iconPath="auth/location.svg"
                />
              </div>
              <InputGroup
                label={t(
                  "signupForm.whiteLabel.payment.address.fields.street.label"
                )}
                type="text"
                placeholder={t(
                  "signupForm.whiteLabel.payment.address.fields.street.placeholder"
                )}
                required
                name="identity.address.street"
                iconPath="auth/location.svg"
              />
              <div className={styles.row}>
                <InputGroup
                  label={t(
                    "signupForm.whiteLabel.payment.address.fields.buildingNumber.label"
                  )}
                  type="number"
                  placeholder={t(
                    "signupForm.whiteLabel.payment.address.fields.buildingNumber.placeholder"
                  )}
                  required
                  name="identity.address.buildingNumber"
                  iconPath="auth/location.svg"
                  maxLength={4}
                />
                <InputGroup
                  label={t(
                    "signupForm.whiteLabel.payment.address.fields.additionalNumber.label"
                  )}
                  type="number"
                  placeholder={t(
                    "signupForm.whiteLabel.payment.address.fields.additionalNumber.placeholder"
                  )}
                  required
                  name="identity.address.additionalNumber"
                  iconPath="auth/location.svg"
                  maxLength={4}
                />
              </div>
              <div className={styles.row}>
                <InputGroup
                  label={t(
                    "signupForm.whiteLabel.payment.address.fields.placeType.label"
                  )}
                  type="text"
                  placeholder={t(
                    "signupForm.whiteLabel.payment.address.fields.placeType.placeholder"
                  )}
                  name="identity.address.placeType"
                  iconPath="auth/location.svg"
                />
                <InputGroup
                  label={t(
                    "signupForm.whiteLabel.payment.address.fields.placeNumber.label"
                  )}
                  type="number"
                  placeholder={t(
                    "signupForm.whiteLabel.payment.address.fields.placeNumber.placeholder"
                  )}
                  name="identity.address.placeNumber"
                  iconPath="auth/location.svg"
                  maxLength={4}
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default StepOne;
