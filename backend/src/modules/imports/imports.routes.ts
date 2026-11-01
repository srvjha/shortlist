import { Router } from "express";
import { sendData } from "../../lib/http.js";
import { currentUser, requireAuth } from "../../middleware/require-auth.js";
import { aiLimiter } from "../../middleware/rate-limit.js";
import { validated } from "../../middleware/validate.js";
import {
  createDraftBody,
  createImportBody,
  createProjectDraftBody,
  importResponse,
  projectDraftResponse,
} from "./imports.schemas.js";
import { createDraft, createImport } from "./imports.service.js";
import { createProjectDraft } from "./project-drafts.js";

export const importsRouter = Router();

// Returns extracted content; the client saves it with PUT /profile or POST /resumes.
importsRouter.post(
  "/imports",
  requireAuth,
  aiLimiter,
  ...validated({ body: createImportBody }, async (req, res) => {
    sendData(res, importResponse, await createImport(currentUser(req).id, req.body), 201);
  }),
);

// A resume written by AI from the user's notes, returned like an import for the client to review and save.
importsRouter.post(
  "/resume-drafts",
  requireAuth,
  aiLimiter,
  ...validated({ body: createDraftBody }, async (req, res) => {
    sendData(res, importResponse, await createDraft(currentUser(req).id, req.body), 201);
  }),
);

// A projects entry written from a repo, a web page or pasted text, returned for the client to review and place.
importsRouter.post(
  "/project-drafts",
  requireAuth,
  aiLimiter,
  ...validated({ body: createProjectDraftBody }, async (req, res) => {
    sendData(res, projectDraftResponse, await createProjectDraft(currentUser(req).id, req.body), 201);
  }),
);
