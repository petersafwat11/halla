export function validateStep({ schema, fields, watch, setError }) {
  const formValues = watch();
  let valuesToValidate;
  let pickedSchema = schema;
  console.log("formValues", formValues);
  if (fields) {
    const fieldList = Array.isArray(fields) ? fields : [fields];
    valuesToValidate = {};
    fieldList.forEach((fieldPath) => {
      const value = fieldPath
        .split(".")
        .reduce((obj, key) => (obj ? obj[key] : undefined), formValues);
      valuesToValidate[fieldPath] = value;
    });
    pickedSchema = schema.pick(
      fieldList.reduce((acc, field) => {
        acc[field] = true;
        return acc;
      }, {})
    );
  } else {
    valuesToValidate = formValues;
  }

  const result = pickedSchema.safeParse(valuesToValidate);
  console.log("result", result);
  if (!result.success) {
    result.error.errors.forEach((err) => {
      setError(
        err.path.join("."),
        { type: "manual", message: err.message, ref: err.name },
        { shouldFocus: true }
      );
    });
    return false;
  }
  return true;
}

export function createStepHandler({ schema, fields, watch, setError }) {
  return function (e) {
    e.preventDefault();
    validateStep({
      schema,
      fields,
      watch,
      setError,
    });
  };
}

export function setNestedValue(obj, path, value) {
  let curr = obj;
  for (let i = 0; i < path.length - 1; i++) {
    if (!curr[path[i]]) curr[path[i]] = {};
    curr = curr[path[i]];
  }
  curr[path[path.length - 1]] = value;
}

export function handleSetStep({
  newStep,
  currentStep,
  currentStepValidity,
  router,
  maxStep = 6,
  validationRequired = true,
}) {
  // Prevent moving to the next step if the current one is invalid and validation is required
  if (
    validationRequired &&
    newStep > currentStep &&
    !currentStepValidity &&
    currentStep !== maxStep
  ) {
    return false;
  }

  // Update URL parameters
  const params = new URLSearchParams(window.location.search);
  params.set("step", newStep);
  router.push(`?${params.toString()}`);

  return true;
}

// Template utility functions
export function formatDateForDisplay(date, t) {
  if (!date) return t("event_date_placeholder");
  try {
    return new Date(date).toLocaleDateString();
  } catch (error) {
    return t("event_date_placeholder");
  }
}

export function formatDateWithSpans(date, t, styles) {
  if (!date) {
    return <span>{t("event_date_placeholder")}</span>;
  }

  try {
    const dateObj = new Date(date);
    const monthIndex = dateObj.getMonth();
    const dayOfWeek = dateObj.getDay();
    const dayOfMonth = dateObj.getDate();
    const year = dateObj.getFullYear();

    const monthName = t(`months.${monthIndex}`);
    const dayName = t(`days.${dayOfWeek}`);

    return (
      <>
        <span className={styles.monthName}>{monthName}</span>
        <div className={styles.dayInfo}>
          {dayName}
          <span style={{ display: "block" }}>{dayOfMonth} </span>
        </div>
        <span className={styles.yearInfo}>{year}</span>
      </>
    );
  } catch (error) {
    return <span>{t("event_date_placeholder")}</span>;
  }
}

export function formatTimeWithSpans(timeString, locale, t) {
  if (!timeString) {
    return <span>12:00:AM</span>;
  }

  try {
    // Parse time format like "04:50:PM"
    const timeParts = timeString.split(":");
    const hour = parseInt(timeParts[0]);
    const minute = parseInt(timeParts[1]);
    const ampm = timeParts[2];

    // Check if we're in Arabic locale using the component's locale
    const isArabic = locale === "ar";

    if (isArabic) {
      // Arabic format: "فى تمام الساعة الثامنة و الدقائق مساءا"
      const arabicNumbers = [
        "",
        "الواحدة",
        "الثانية",
        "الثالثة",
        "الرابعة",
        "الخامسة",
        "السادسة",
        "السابعة",
        "الثامنة",
        "التاسعة",
        "العاشرة",
        "الحادية عشرة",
        "الثانية عشرة",
      ];

      // Convert 24-hour to 12-hour for Arabic display
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const hourInArabic = arabicNumbers[displayHour] || displayHour;
      const timeOfDay = ampm === "AM" ? t("time_am") : t("time_pm");

      return (
        <>
          <span>{t("time_prefix")}</span>
          <span> {hourInArabic}</span>
          {minute > 0 && (
            <>
              <span> {t("time_and")} </span>
              <span>
                {minute} {t("time_minutes")}
              </span>
            </>
          )}
          <span> {timeOfDay}</span>
        </>
      );
    } else {
      // English format: "at 4:50pm"
      const hourDisplay = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const minuteDisplay = minute.toString().padStart(2, "0");
      const timeOfDay = ampm === "AM" ? t("time_am") : t("time_pm");

      return (
        <>
          <span>{t("time_prefix")} </span>
          <span>
            {hourDisplay}:{minuteDisplay}
          </span>
          <span>{timeOfDay}</span>
        </>
      );
    }
  } catch (error) {
    return <span>{timeString}</span>;
  }
}

export async function htmlToImageConvert(
  imageRef,
  fileName = "template-image",
  options = {}
) {
  const { autoDownload = false, returnBlob = false } = options;

  // Use html2canvas as it handles CSS better than html-to-image
  const html2canvas = (await import('html2canvas')).default;

  try {
    // Configure html2canvas options
    const canvas = await html2canvas(imageRef.current, {
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      scale: 2, // Higher quality
      logging: false,
      // Ignore elements that might cause issues
      ignoreElements: (element) => {
        return element.tagName === 'SCRIPT' || element.tagName === 'NOSCRIPT';
      },
    });

    // Convert canvas to blob
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to generate image blob'));
          return;
        }

        // Create dataUrl from blob
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result;
          
          console.log("Image generated successfully");

          // Auto-download if enabled
          if (autoDownload) {
            const link = document.createElement("a");
            link.download = `${fileName}.png`;
            link.href = dataUrl;
            link.click();
          }

          // Return different formats based on options
          if (returnBlob) {
            resolve({
              dataUrl,
              blob,
              file: new File([blob], `${fileName}.png`, { type: "image/png" }),
            });
          } else {
            resolve(dataUrl);
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }, 'image/png');
    });
  } catch (err) {
    console.error("Error converting HTML to image:", err);
    throw err;
  }
}

// Helper function to convert dataUrl to blob
export function dataUrlToBlob(dataUrl) {
  return fetch(dataUrl).then((res) => res.blob());
}

// Helper function to convert dataUrl to file
export function dataUrlToFile(dataUrl, fileName) {
  return fetch(dataUrl)
    .then((res) => res.blob())
    .then((blob) => new File([blob], fileName, { type: blob.type }));
}

// Helper function to preview image in new tab
export function previewImage(dataUrl) {
  const newWindow = window.open();
  newWindow.document.write(
    `<img src="${dataUrl}" style="max-width: 100%; height: auto;">`
  );
}

// Helper function to upload image to server
export async function uploadImage(imageFile, endpoint = "/api/upload") {
  const formData = new FormData();
  formData.append("image", imageFile);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
}
