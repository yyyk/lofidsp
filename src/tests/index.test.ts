import { describe, expect, test } from "vitest";
import { bitReduce, bitReduceSample } from "../bitReduce";
import { downSample } from "../downSample";
import { upSample } from "../upSample";
import { repitch } from "../repitch";
import { lowPassIIR } from "../lowPassIIR";

describe("main", () => {
  describe("bitReduce", () => {
    test("bitReduceSample returns known quantized value", () => {
      const s = 0.333;
      const crushed = bitReduceSample(s, 2);
      expect(crushed).toBeCloseTo(0, 2);
    });

    test("bitReduce quantizes all samples as expected", () => {
      const input = new Float32Array([0, 0.333, 0.666, 1]);
      const output = bitReduce(input, 2);
      expect(output[0]).toBeCloseTo(0, 2);
      expect(output[1]).toBeCloseTo(0, 2);
      expect(output[2]).toBeCloseTo(1, 2);
      expect(output[3]).toBeCloseTo(1, 2);
    });
  });

  test("downSample with known step drops samples correctly", () => {
    const input = new Float32Array([0, 1, 2, 3, 4, 5]);
    const output = downSample(input, 6, 3);
    expect(output).toEqual(new Float32Array([0, 2, 4]));
  });

  test("upSample interpolates linearly between samples", () => {
    const input = new Float32Array([0, 1]);
    const output = upSample(input, 2, 3);
    expect(output[0]).toBeCloseTo(0, 2);
    expect(output[1]).toBeCloseTo(0.6667, 2);
    expect(output[2]).toBeCloseTo(1, 2);
  });

  describe("repitch", () => {
    test("repitch shifts sample content correctly (up)", () => {
      const input = new Float32Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
      const semitones = 12;
      const expectedLength = Math.floor(
        input.length / Math.pow(2, semitones / 12)
      );
      const output = repitch(input, semitones);
      expect(output.length).toBe(expectedLength);
      expect(output[1]).toBeCloseTo(2, 2);
    });

    test("repitch shifts sample content correctly (down)", () => {
      const input = new Float32Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
      const semitones = -12;
      const expectedLength = Math.floor(
        input.length * Math.pow(2, Math.abs(semitones) / 12)
      );
      const output = repitch(input, semitones);
      expect(output.length).toBe(expectedLength);
      expect(output[1]).toBeCloseTo(0.5, 2);
    });
  });

  describe("lowPassIIR", () => {
    test("lowPassIIR smooths alternating signal", () => {
      const input = new Float32Array([1, -1, 1, -1, 1, -1]);
      const output = lowPassIIR(input, 48000, 1000);
      for (let i = 1; i < output.length; i++) {
        expect(Math.abs(output[i] - output[i - 1])).toBeLessThan(2);
      }
    });

    test("lowPassIIR passes slow ramp mostly unchanged", () => {
      const input = new Float32Array([0, 0.2, 0.4, 0.6, 0.8, 1]);
      const output = lowPassIIR(input, 48000, 10000);
      for (let i = 0; i < input.length; i++) {
        expect(output[i]).toBeCloseTo(input[i], 0);
      }
    });
  });
});
