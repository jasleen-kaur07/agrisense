import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LocationPicker from "@/components/location/LocationPicker.vue";
import { i18n } from "@/i18n";
import { clearQueries } from "@/lib/query";
import { json, setLocale, stubFetch } from "./helpers";

function setup() {
  const w = mount(LocationPicker, {
    props: { allowGps: true, modelValue: { stateKey: "", districtKey: "" } },
    global: { plugins: [i18n] },
  });
  return w;
}
const gpsButton = (w: ReturnType<typeof setup>) => w.findAll("button").find((b) => /current location/i.test(b.text()))!;

describe("LocationPicker GPS", () => {
  beforeEach(() => {
    setLocale("en");
    clearQueries();
    stubFetch((url) => {
      if (url.startsWith("/api/v1/locations/states")) return json(200, []);
      if (url.startsWith("/api/v1/locations/nearest")) {
        return url.includes("lat=1&") ? json(404, { title: "Not found", status: 404 }) : json(200, { stateKey: "S", districtKey: "D", state: "State", district: "Dist", latitude: 1, longitude: 1, distanceKm: 12.3 });
      }
      return json(200, []);
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not ask for location until the button is clicked", async () => {
    const getCurrentPosition = vi.fn();
    vi.stubGlobal("navigator", { ...navigator, geolocation: { getCurrentPosition } });
    setup();
    await flushPromises();
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it("preselects the nearest district and shows the distance", async () => {
    const getCurrentPosition = vi.fn((ok: PositionCallback) => ok({ coords: { latitude: 20, longitude: 78 } } as GeolocationPosition));
    vi.stubGlobal("navigator", { ...navigator, geolocation: { getCurrentPosition } });
    const w = setup();
    await gpsButton(w).trigger("click");
    await flushPromises();
    expect(w.emitted("update:modelValue")?.[0]).toEqual([{ stateKey: "S", districtKey: "D" }]);
    expect(w.get("[data-testid=gps-status]").text()).toMatch(/Dist, State.*12/);
  });

  it("shows a calm message on denial and keeps the manual pickers", async () => {
    const getCurrentPosition = vi.fn((_ok: PositionCallback, err: PositionErrorCallback) =>
      err({ code: 1, PERMISSION_DENIED: 1 } as unknown as GeolocationPositionError));
    vi.stubGlobal("navigator", { ...navigator, geolocation: { getCurrentPosition } });
    const w = setup();
    await gpsButton(w).trigger("click");
    await flushPromises();
    expect(w.get("[data-testid=gps-status]").text()).toMatch(/permission was not given/i);
    expect(w.emitted("update:modelValue")).toBeUndefined();
    expect(w.findAll("label").some((l) => l.text() === "State")).toBe(true);
  });

  it("shows a calm message on timeout", async () => {
    const getCurrentPosition = vi.fn((_ok: PositionCallback, err: PositionErrorCallback) =>
      err({ code: 3, PERMISSION_DENIED: 1 } as unknown as GeolocationPositionError));
    vi.stubGlobal("navigator", { ...navigator, geolocation: { getCurrentPosition } });
    const w = setup();
    await gpsButton(w).trigger("click");
    await flushPromises();
    expect(w.get("[data-testid=gps-status]").text()).toMatch(/could not get your location/i);
  });

  it("shows a calm message on 404 (nothing nearby)", async () => {
    const getCurrentPosition = vi.fn((ok: PositionCallback) => ok({ coords: { latitude: 1, longitude: 1 } } as GeolocationPosition));
    vi.stubGlobal("navigator", { ...navigator, geolocation: { getCurrentPosition } });
    const w = setup();
    await gpsButton(w).trigger("click");
    await flushPromises();
    expect(w.get("[data-testid=gps-status]").text()).toMatch(/No supported district was found/i);
    expect(w.emitted("update:modelValue")).toBeUndefined();
  });
});
