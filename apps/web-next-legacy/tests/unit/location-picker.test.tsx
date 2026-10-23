import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocationPicker } from "@/components/location/LocationPicker";

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function setup(onChange = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <LocationPicker allowGps value={{ stateKey: "", districtKey: "" }} onChange={onChange} />
    </QueryClientProvider>,
  );
  return onChange;
}

describe("LocationPicker GPS", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.startsWith("/api/v1/locations/states")) return json(200, []);
      if (url.startsWith("/api/v1/locations/nearest")) {
        return url.includes("lat=1&") ? json(404, { title: "Not found", status: 404 }) : json(200, { stateKey: "S", districtKey: "D", state: "State", district: "Dist", latitude: 1, longitude: 1, distanceKm: 12.3 });
      }
      return json(200, []);
    }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not ask for location until the button is clicked", () => {
    const getCurrentPosition = vi.fn();
    vi.stubGlobal("navigator", { ...navigator, geolocation: { getCurrentPosition } });
    setup();
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it("preselects the nearest district and shows the distance", async () => {
    const getCurrentPosition = vi.fn((ok: PositionCallback) => ok({ coords: { latitude: 20, longitude: 78 } } as GeolocationPosition));
    vi.stubGlobal("navigator", { ...navigator, geolocation: { getCurrentPosition } });
    const onChange = setup();
    await userEvent.click(screen.getByRole("button", { name: /current location/i }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ stateKey: "S", districtKey: "D" }));
    expect(await screen.findByTestId("gps-status")).toHaveTextContent(/Dist, State.*12/);
  });

  it("shows a calm message on denial and keeps the manual pickers", async () => {
    const getCurrentPosition = vi.fn((_ok: PositionCallback, err: PositionErrorCallback) =>
      err({ code: 1, PERMISSION_DENIED: 1 } as unknown as GeolocationPositionError));
    vi.stubGlobal("navigator", { ...navigator, geolocation: { getCurrentPosition } });
    const onChange = setup();
    await userEvent.click(screen.getByRole("button", { name: /current location/i }));
    expect(await screen.findByTestId("gps-status")).toHaveTextContent(/permission was not given/i);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByLabelText("State")).toBeInTheDocument();
  });

  it("shows a calm message on 404 (nothing nearby)", async () => {
    const getCurrentPosition = vi.fn((ok: PositionCallback) => ok({ coords: { latitude: 1, longitude: 1 } } as GeolocationPosition));
    vi.stubGlobal("navigator", { ...navigator, geolocation: { getCurrentPosition } });
    setup();
    await userEvent.click(screen.getByRole("button", { name: /current location/i }));
    expect(await screen.findByTestId("gps-status")).toHaveTextContent(/No supported district was found/i);
  });
});
