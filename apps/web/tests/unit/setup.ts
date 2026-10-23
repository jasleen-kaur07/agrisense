import { afterEach } from "vitest";

afterEach(() => {
  document.body.innerHTML = "";
});

// jsdom does not implement scrolling; the router calls it on every navigation.
window.scrollTo = () => undefined;
