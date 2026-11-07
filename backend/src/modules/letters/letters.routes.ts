import { Router } from "express";
import { sendData } from "../../lib/http.js";
import { oneAtATime } from "../../lib/latex/compile.js";
import { aiLimiter, compileLimiter, publicLetterLimiter } from "../../middleware/rate-limit.js";
import { currentUser, requireAuth } from "../../middleware/require-auth.js";
import { validated } from "../../middleware/validate.js";
import { compileOrThrow, pdfFileName, sendPdf } from "../pdfs/pdfs.service.js";
import {
  createLetterBody,
  createPublicCoverLetterBody,
  letterListResponse,
  letterParams,
  letterPdfQuery,
  letterResponse,
  publicCoverLetterResponse,
  updateLetterBody,
} from "./letters.schemas.js";
import * as service from "./letters.service.js";

export const lettersRouter = Router();

// Public: the pasted text is used once and never stored. Mounted first because the routes below need an account.
lettersRouter.post(
  "/public/cover-letters",
  publicLetterLimiter,
  ...validated({ body: createPublicCoverLetterBody }, async (req, res) => {
    const user = req.user;
    const userId = user && !("isAnonymous" in user && user.isAnonymous === true) ? user.id : null;
    sendData(res, publicCoverLetterResponse, await service.writePublicCoverLetter(userId, req.body), 201);
  }),
);

lettersRouter.use("/letters", requireAuth);

lettersRouter.get("/letters", async (req, res) => {
  sendData(res, letterListResponse, await service.listLetters(currentUser(req).id));
});

lettersRouter.post(
  "/letters",
  aiLimiter,
  ...validated({ body: createLetterBody }, async (req, res) => {
    sendData(res, letterResponse, await service.createLetter(currentUser(req).id, req.body), 201);
  }),
);

lettersRouter.get(
  "/letters/:letterId",
  ...validated({ params: letterParams }, async (req, res) => {
    sendData(res, letterResponse, await service.getLetter(currentUser(req).id, req.params.letterId));
  }),
);

lettersRouter.patch(
  "/letters/:letterId",
  ...validated({ params: letterParams, body: updateLetterBody }, async (req, res) => {
    sendData(res, letterResponse, await service.updateLetter(currentUser(req).id, req.params.letterId, req.body));
  }),
);

lettersRouter.delete(
  "/letters/:letterId",
  ...validated({ params: letterParams }, async (req, res) => {
    await service.deleteLetter(currentUser(req).id, req.params.letterId);
    res.status(204).end();
  }),
);

lettersRouter.get(
  "/letters/:letterId/pdf",
  compileLimiter,
  ...validated({ params: letterParams, query: letterPdfQuery }, async (req, res) => {
    const userId = currentUser(req).id;
    const letter = await service.getLetter(userId, req.params.letterId);
    const { tex, name } = await service.letterTex(userId, letter);
    const { pdf, pageCount } = await oneAtATime(userId, () => compileOrThrow(tex));
    sendPdf(res, pdf, pdfFileName(name, letter.title), pageCount, req.query.download);
  }),
);
