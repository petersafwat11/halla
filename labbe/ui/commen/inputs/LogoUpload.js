import React from "react";
import Image from "next/image";
import { useFormContext, get } from "react-hook-form";

const LogoUpload = ({
  t,
  styles,
  name = "logo",
  icon = "/svg/auth/logo-2.svg",
  descriptionKey = "signupForm.whiteLabel.identity.logo.description",
  buttonKey = "signupForm.whiteLabel.identity.logo.button",
  selectedKey = "selected",
  label,
  onFileChange,
}) => {
  const {
    register,
    setValue,
    formState: { errors },
    watch,
    clearErrors,
  } = useFormContext();
  const fileValue = watch(name);
  const error = get(errors, name)?.message;

  const handleFileChange = async (event) => {
    clearErrors(name);
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setValue(name, "");
        if (onFileChange) onFileChange(null);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setValue(name, "");
        if (onFileChange) onFileChange(null);
        return;
      }
      setValue(name, file);
      if (onFileChange) onFileChange(file);
    } else {
      setValue(name, "");
      if (onFileChange) onFileChange(null);
    }
  };

  return (
    <div className={styles.logo_upload}>
      {icon && <Image src={icon} alt="logo" width={24} height={24} />}
      <p className={styles.section_description}>
        {t ? t(descriptionKey) : label}
      </p>
      <label className={styles.upload_button}>
        <input
          type="file"
          accept="image/*"
          {...register(name)}
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
        {t ? t(buttonKey) : "Upload"}
      </label>
      {fileValue && fileValue.name && (
        <p className={styles.file_selected}>
          {t ? t(selectedKey) : "Selected"}: {fileValue.name}
        </p>
      )}
      {error && (
        <div className={styles.error_container}>
          <p className={styles.error}>{error}</p>
        </div>
      )}
    </div>
  );
};

export default LogoUpload;
