import { Writable } from "node:stream";
import { pino } from "pino";
import { describe, expect, it } from "vitest";
import { redact } from "../src/lib/logger.js";

describe("log redaction", () => {
  it("never writes sessions, passwords, signatures or visitor IPs", () => {
    let line = "";
    const out = new Writable({
      write(chunk, _encoding, done) {
        line += String(chunk);
        done();
      },
    });
    pino({ redact }, out).info({
      req: {
        remoteAddress: "10.0.0.5",
        headers: {
          cookie: "__Secure-session=SECRET1",
          authorization: "Bearer SECRET2",
          "x-share-password": "SECRET3",
          "x-share-contact-password": "SECRET4",
          "x-razorpay-signature": "SECRET5",
          "webhook-signature": "SECRET6",
          "x-share-visitor": "203.0.113.9",
          "x-forwarded-for": "203.0.113.9",
          "user-agent": "Mozilla/5.0",
        },
      },
      res: { headers: { "set-cookie": "__Secure-session=SECRET1" } },
    });
    for (const secret of ["SECRET1", "SECRET2", "SECRET3", "SECRET4", "SECRET5", "SECRET6", "203.0.113.9", "10.0.0.5"])
      expect(line).not.toContain(secret);
    expect(line).toContain("Mozilla/5.0");
    expect(line).toContain("[redacted]");
  });
});
