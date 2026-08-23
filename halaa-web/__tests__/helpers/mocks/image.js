import React from "react";

export default function Image(props) {
  const { src, alt = "", ...rest } = props;
  return React.createElement("img", { src: typeof src === "string" ? src : "/mock.png", alt, ...rest });
}
