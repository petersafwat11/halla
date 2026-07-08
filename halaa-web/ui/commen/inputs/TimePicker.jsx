import React, { useState, useRef, useEffect } from 'react';
import styles from './TimePicker.module.css';
import { useFormContext, useController } from 'react-hook-form';
import Image from 'next/image';

const pad = (num) => num.toString().padStart(2, '0');
const formatTime = (hour, minute, ampm) =>
  `${pad(hour)}:${pad(minute)}:${ampm}`;
const parseTime = (str) => {
  if (!str || typeof str !== 'string')
    return { hour: 12, minute: 0, ampm: 'AM' };
  const match = str.match(/(\d{1,2}):(\d{2}):(AM|PM)/);
  if (!match) return { hour: 12, minute: 0, ampm: 'AM' };
  return {
    hour: parseInt(match[1], 10),
    minute: parseInt(match[2], 10),
    ampm: match[3],
  };
};

const TimePicker = ({
  label,
  name,
  required,
  hintMessage,
  validations,
  className,
  style,
}) => {
  const {
    control,
    formState: { errors },
    watch,
  } = useFormContext();
  const {
    field: { value = '12:00:AM', onChange },
    fieldState: { error },
  } = useController({
    name,
    control,
    rules: { required },
    defaultValue: '12:00:AM',
  });

  const time = parseTime(value);
  const [dialogOpen, setDialogOpen] = useState(false);
  const dialogRef = useRef(null);

  // Close dialog on outside click
  useEffect(() => {
    if (!dialogOpen) return;
    const handleClick = (event) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target)) {
        setDialogOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dialogOpen]);

  // Open dialog
  const handleInputClick = () => {
    setDialogOpen(true);
  };

  // Dialog time controls (update value as string)
  const handleHour = (delta) => {
    let next = (time.hour || 12) + delta;
    if (next > 12) next = 1;
    if (next < 1) next = 12;
    onChange(formatTime(next, time.minute, time.ampm));
  };
  const handleMinute = (delta) => {
    let next = (time.minute || 0) + delta;
    if (next > 59) next = 0;
    if (next < 0) next = 59;
    onChange(formatTime(time.hour, next, time.ampm));
  };
  const handleAmpm = () => {
    onChange(
      formatTime(time.hour, time.minute, time.ampm === 'AM' ? 'PM' : 'AM')
    );
  };

  return (
    <div className={`${styles.input_group} ${className || ''}`} style={style}>
      {label && (
        <label className={styles.label} htmlFor={name}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      <div className={styles.input_container}>
        <button
          dir="ltr"
          type="button"
          className={styles.time_input}
          onClick={handleInputClick}
          aria-label="Select time"
        >
          <Image
            src="/svg/events/clock.svg"
            alt="clock"
            width={24}
            height={24}
            className={styles.clock_icon}
          />
          <span className={styles.time_input_text}>
            {formatTime(time.hour, time.minute, time.ampm)}
          </span>
        </button>
        {dialogOpen && (
          <div
            dir="ltr"
            className={styles.time_dialog}
            ref={dialogRef}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.time_picker_box}>
              <div className={styles.time_col}>
                <button
                  type="button"
                  className={styles.arrow_btn}
                  onClick={() => {
                    handleHour(1);
                  }}
                >
                  <span>
                    <Image
                      src="/svg/events/time-arrow.svg"
                      alt="time-arrow"
                      width={16}
                      height={16}
                    />
                  </span>
                </button>
                <div className={styles.time_value}>{pad(time.hour)}</div>
                <button
                  type="button"
                  className={styles.arrow_btn}
                  onClick={() => {
                    handleHour(-1);
                  }}
                >
                  <span>
                    <Image
                      src="/svg/events/time-arrow.svg"
                      alt="time-arrow"
                      width={16}
                      height={16}
                      style={{ transform: 'rotate(180deg)' }}
                    />
                  </span>
                </button>
              </div>
              <div className={styles.time_col}>
                <div className={styles.time_value}>:</div>
              </div>
              <div className={styles.time_col}>
                <button
                  type="button"
                  className={styles.arrow_btn}
                  onClick={() => {
                    handleMinute(1);
                  }}
                >
                  <span>
                    <Image
                      src="/svg/events/time-arrow.svg"
                      alt="time-arrow"
                      width={16}
                      height={16}
                    />
                  </span>
                </button>
                <div className={styles.time_value}>{pad(time.minute)}</div>
                <button
                  type="button"
                  className={styles.arrow_btn}
                  onClick={() => {
                    handleMinute(-1);
                  }}
                >
                  <span>
                    <Image
                      src="/svg/events/time-arrow.svg"
                      alt="time-arrow"
                      width={16}
                      height={16}
                      style={{ transform: 'rotate(180deg)' }}
                    />
                  </span>
                </button>
              </div>
            </div>

            <div className={styles.time_col}>
              <button
                type="button"
                className={styles.arrow_btn}
                onClick={() => {
                  handleAmpm();
                }}
              >
                <span>
                  <Image
                    src="/svg/events/time-arrow.svg"
                    alt="time-arrow"
                    width={16}
                    height={16}
                  />
                </span>
              </button>
              <div className={styles.time_value}>{time.ampm}</div>
              <button
                type="button"
                className={styles.arrow_btn}
                onClick={() => {
                  handleAmpm();
                }}
              >
                <span>
                  <Image
                    src="/svg/events/time-arrow.svg"
                    alt="time-arrow"
                    width={16}
                    height={16}
                    style={{ transform: 'rotate(180deg)' }}
                  />
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
      {error?.message && (
        <div className={styles.error_container}>
          <p className={styles.error}>{error.message}</p>
        </div>
      )}
      {hintMessage && !error && <p className={styles.hint}>{hintMessage}</p>}
      {/* {validations && validations.length > 0 && (
        <div className={styles.validation_rules}>
          {validations.map((rule, index) => (
            <p
              key={index}
              className={`${styles.validation_rule} ${
                rule.isValid ? styles.valid : ''
              }`}
            >
              {rule.text}
            </p>
          ))}
        </div>
      )} */}
    </div>
  );
};

export default TimePicker;
