import { describe, expect, it } from "vitest";
import { groundedReview } from "../src/modules/ats/ai-review.js";

const resume = `Software Engineer, Acme | Jul 2021 - Present
• Built billing APIs in Node.js serving 3M requests a day
• Wrote an admin dashboard for the support team`;

const fix = (line: string | null, rewrite: string | null) => ({ title: "t", why: "w", line, rewrite });

describe("groundedReview", () => {
  it("keeps a line only when it is really in the resume, ignoring case and spacing", () => {
    const review = groundedReview(
      {
        verdict: "v",
        strengths: [],
        fixes: [
          fix("•  built billing APIs in node.js   serving 3M requests a day", null),
          fix("Led a team of 12 engineers", "Led a team of 12 engineers to ship faster"),
          fix("Acme", "Acme"),
        ],
        jobFit: null,
      },
      resume,
    );
    expect(review.fixes.map((f) => f.line)).toEqual([
      "built billing APIs in node.js   serving 3M requests a day",
      null,
      null,
    ]);
    expect(review.fixes[1]!.rewrite).toBeNull();
  });

  it("drops a rewrite that brings in a number, but allows placeholders and the line's own numbers", () => {
    const line = "Wrote an admin dashboard for the support team";
    const review = groundedReview(
      {
        verdict: "v",
        strengths: [],
        fixes: [
          fix(line, "Built an admin dashboard used by 40 support agents"),
          fix(line, "wrote an admin dashboard for the support team"),
          fix(line, "Built an admin dashboard used by [number] support agents, cutting reply time by [X%]"),
          fix(
            "Built billing APIs in Node.js serving 3M requests a day",
            "Designed Node.js billing APIs handling 3M requests a day",
          ),
        ],
        jobFit: null,
      },
      resume,
    );
    expect(review.fixes.map((f) => f.rewrite)).toEqual([
      null,
      null,
      "Built an admin dashboard used by [number] support agents, cutting reply time by [X%]",
      "Designed Node.js billing APIs handling 3M requests a day",
    ]);
  });
});
