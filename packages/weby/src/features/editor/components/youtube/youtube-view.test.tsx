import { describe, expect, it } from "vitest";
import { parseYoutubeUrl } from "./youtube-view";

describe("parseYoutubeUrl", () => {
  const cases = [
    {
      expected: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
      input: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    },
    {
      expected: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
      input: "https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s",
    },
    {
      expected: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
      input: "https://youtu.be/dQw4w9WgXcQ",
    },
    {
      expected: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
      input: "https://www.youtu.be/dQw4w9WgXcQ?t=10",
    },
    {
      expected: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
      input: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    },
    {
      expected: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
      input: "https://youtube-nocookie.com/embed/dQw4w9WgXcQ",
    },
    {
      expected: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
      input: "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    },
    {
      expected: null,
      input: "https://www.google.com/watch?v=dQw4w9WgXcQ",
    },
    {
      expected: null,
      input: "https://youtube.com.malicious.com/watch?v=dQw4w9WgXcQ",
    },
    {
      expected: null,
      input: "https://www.youtube.com/watch?v=shortID",
    },
    {
      expected: null,
      input: "https://www.youtube.com/watch?v=tooLongVideoIDhere",
    },
    {
      expected: null,
      input: "https://www.youtube.com/watch?v=",
    },
    {
      expected: null,
      input: "https://youtu.be/short",
    },
    {
      expected: null,
      input: "https://www.youtube.com/about",
    },
    {
      expected: null,
      input: "not-a-url",
    },
    {
      expected: null,
      input: "",
    },
  ];

  for (const { input, expected } of cases) {
    it(`should parse "${input}" and return ${expected}`, () => {
      expect(parseYoutubeUrl(input)).toBe(expected);
    });
  }
});
