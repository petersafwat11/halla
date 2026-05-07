import React from "react";
import TopVendors from "./topVendors/TopVendors";
import styles from "./bottom.module.css";

const Bottom = ({ bestVendors }) => {
  return (
    <div className={styles.container}>
      <TopVendors bestVendors={bestVendors} />
    </div>
  );
};

export default Bottom;
