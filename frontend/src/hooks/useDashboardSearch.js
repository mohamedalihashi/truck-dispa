import { useOutletContext } from "react-router-dom";

export function useDashboardSearch() {
  const { search = "" } = useOutletContext() || {};
  const term = search.trim();
  return { search: term, hasSearch: term.length > 0 };
}
