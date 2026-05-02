import React from 'react';
import styles from './checkBoxItems.module.css';
import { useFormContext, get } from 'react-hook-form';

const CheckBoxItems = ({ items, name, columns = 2, singleMode = false, style }) => {
  const {
    setValue,
    formState: { errors },
    watch,
    clearErrors,
  } = useFormContext();
  const currentValue = watch(name) || (singleMode ? '' : []);
  const error = get(errors, name)?.message;

  const handleCheckboxChange = (itemValue) => {
    if (singleMode) {
      if (currentValue === itemValue) {
        setValue(name, '', { shouldValidate: true }); // Allow un-selecting
      } else {
        setValue(name, itemValue, { shouldValidate: true });
      }
    } else {
      const newChecked = currentValue.includes(itemValue)
        ? currentValue.filter((i) => i !== itemValue)
        : [...currentValue, itemValue];
      setValue(name, newChecked, { shouldValidate: true });
    }
    clearErrors(name);
  };

  return (
    <div
      className={styles.container}
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)`, ...style }}
    >
      {items.map((item, index) => (
        <div className={styles.checkbox_item} key={index}>
          <input
            type="checkbox"
            id={`checkbox-${name}-${index}`}
            name={name}
            checked={
              singleMode
                ? currentValue === item.value
                : currentValue.includes(item.value)
            }
            onChange={() => handleCheckboxChange(item.value)}
          />
          <label htmlFor={`checkbox-${name}-${index}`}>{item.label}</label>
        </div>
      ))}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
};

export default CheckBoxItems;
