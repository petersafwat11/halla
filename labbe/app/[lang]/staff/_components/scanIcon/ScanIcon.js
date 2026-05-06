"use client";
import React from "react";

/**
 * QR scan icon used in the floating scan button.
 */
export default function ScanIcon({ width = 30, height = 30 }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 30 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2.5 11.25V8.125C2.5 5.0125 5.0125 2.5 8.125 2.5H11.25"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18.75 2.5H21.875C24.9875 2.5 27.5 5.0125 27.5 8.125V11.25"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M27.5 20V21.875C27.5 24.9875 24.9875 27.5 21.875 27.5H20"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.25 27.5H8.125C5.0125 27.5 2.5 24.9875 2.5 21.875V18.75"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.125 8.75V11.25C13.125 12.5 12.5 13.125 11.25 13.125H8.75C7.5 13.125 6.875 12.5 6.875 11.25V8.75C6.875 7.5 7.5 6.875 8.75 6.875H11.25C12.5 6.875 13.125 7.5 13.125 8.75Z"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M23.125 8.75V11.25C23.125 12.5 22.5 13.125 21.25 13.125H18.75C17.5 13.125 16.875 12.5 16.875 11.25V8.75C16.875 7.5 17.5 6.875 18.75 6.875H21.25C22.5 6.875 23.125 7.5 23.125 8.75Z"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.125 18.75V21.25C13.125 22.5 12.5 23.125 11.25 23.125H8.75C7.5 23.125 6.875 22.5 6.875 21.25V18.75C6.875 17.5 7.5 16.875 8.75 16.875H11.25C12.5 16.875 13.125 17.5 13.125 18.75Z"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M23.125 18.75V21.25C23.125 22.5 22.5 23.125 21.25 23.125H18.75C17.5 23.125 16.875 22.5 16.875 21.25V18.75C16.875 17.5 17.5 16.875 18.75 16.875H21.25C22.5 16.875 23.125 17.5 23.125 18.75Z"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
