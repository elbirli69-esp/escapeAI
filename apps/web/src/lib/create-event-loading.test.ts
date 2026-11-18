import { describe, expect, it } from "vitest";
import { FetchTimeoutError } from "./fetch-json";
import { createEventLoadingHint, mapCreateEventClientError } from "./create-event-loading";

describe("createEventLoadingHint", () => {
  it("escala el mensaje según el tiempo transcurrido", () => {
    expect(createEventLoadingHint(0)).toMatch(/Generando tu escape/);
    expect(createEventLoadingHint(9_000)).toMatch(/No cierres esta pantalla/);
    expect(createEventLoadingHint(25_000)).toMatch(/red va lenta/);
    expect(createEventLoadingHint(80_000)).toMatch(/reintentar/);
  });
});

describe("mapCreateEventClientError", () => {
  it("marca timeout y red como reintentables", () => {
    expect(mapCreateEventClientError(new FetchTimeoutError()).retryable).toBe(true);
    expect(mapCreateEventClientError(new TypeError("Failed to fetch")).retryable).toBe(true);
  });

  it("no marca validación como reintentable", () => {
    const mapped = mapCreateEventClientError(new Error("Indica el nombre central (mínimo 2 caracteres)."));
    expect(mapped.retryable).toBe(false);
  });
});