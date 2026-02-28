"use client";

import { useEffect, useRef } from "react";
import type { RefreshScope } from "@/types";

const DATA_REFRESH_EVENT = "fitnova:data-refresh";

type DataRefreshDetail = {
  scopes: RefreshScope[];
};

export function emitDataRefresh(scopes: RefreshScope[]) {
  if (typeof window === "undefined" || scopes.length === 0) return;

  window.dispatchEvent(
    new CustomEvent<DataRefreshDetail>(DATA_REFRESH_EVENT, {
      detail: { scopes },
    })
  );
}

export function useDataRefresh(
  scopes: RefreshScope[],
  handler: () => void
) {
  const handlerRef = useRef(handler);
  const scopeKey = scopes.slice().sort().join("|");

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const scopeList = scopeKey
      ? (scopeKey.split("|") as RefreshScope[])
      : [];

    function onRefresh(event: Event) {
      const detail = (event as CustomEvent<DataRefreshDetail>).detail;
      if (!detail?.scopes?.some((scope) => scopeList.includes(scope))) return;
      handlerRef.current();
    }

    window.addEventListener(DATA_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(DATA_REFRESH_EVENT, onRefresh);
  }, [scopeKey]);
}
