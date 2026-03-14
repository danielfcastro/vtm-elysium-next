"use client";

import React, { useEffect, useState } from "react";

export default function ClientDateTime(props: { iso: string }) {
  const { iso } = props;
  const [text, setText] = useState<string>("");

  useEffect(() => {
    setText(new Date(iso).toLocaleString());
  }, [iso]);

  // SSR renderiza vazio; client preenche depois -> sem mismatch
  return <>{text}</>;
}
