import { describe, expect, it } from "vitest";
import { pdfFileName } from "../src/modules/pdfs/pdfs.service.js";

describe("pdfFileName", () => {
  it("doesn't repeat a name the title already has", () => {
    expect(pdfFileName("Aniket Patidar", "Aniket_Patidar_Resume")).toBe("aniket-patidar-resume.pdf");
    expect(pdfFileName("Aarav Sharma", "Aarav Sharma")).toBe("aarav-sharma.pdf");
  });

  it("keeps the name and a title that doesn't mention it", () => {
    expect(pdfFileName("Aarav Sharma", "Backend roles")).toBe("aarav-sharma_backend-roles.pdf");
    expect(pdfFileName(undefined, "")).toBe("resume.pdf");
  });

  it("uses a title that names the file as it is", () => {
    expect(pdfFileName("Saurav Jha", "srvjha-latest-resume")).toBe("srvjha-latest-resume.pdf");
    expect(pdfFileName("Saurav Jha", "CV 2026")).toBe("cv-2026.pdf");
  });
});
