import { Router } from "express";
import { sendData } from "../../lib/http.js";
import { currentUser, requireAuth } from "../../middleware/require-auth.js";
import { aiLimiter } from "../../middleware/rate-limit.js";
import { validated } from "../../middleware/validate.js";
import { resumeParams } from "../resumes/resumes.schemas.js";
import {
  createSuggestionBody,
  suggestionListResponse,
  suggestionParams,
  suggestionFeedbackBody,
  suggestionResponse,
} from "./suggestions.schemas.js";
import * as service from "./suggestions.service.js";

export const suggestionsRouter = Router();

suggestionsRouter.get(
  "/resumes/:resumeId/suggestions",
  requireAuth,
  ...validated({ params: resumeParams }, async (req, res) => {
    sendData(res, suggestionListResponse, await service.listSuggestions(currentUser(req).id, req.params.resumeId));
  }),
);

suggestionsRouter.post(
  "/resumes/:resumeId/suggestions",
  requireAuth,
  aiLimiter,
  ...validated({ params: resumeParams, body: createSuggestionBody }, async (req, res) => {
    const suggestion = await service.createSuggestion(currentUser(req).id, req.params.resumeId, req.body);
    sendData(res, suggestionResponse, suggestion, 201);
  }),
);

suggestionsRouter.get(
  "/resumes/:resumeId/suggestions/:suggestionId",
  requireAuth,
  ...validated({ params: suggestionParams }, async (req, res) => {
    const { resumeId, suggestionId } = req.params;
    sendData(res, suggestionResponse, await service.getSuggestion(currentUser(req).id, resumeId, suggestionId));
  }),
);

suggestionsRouter.put(
  "/resumes/:resumeId/suggestions/:suggestionId/feedback",
  requireAuth,
  ...validated({ params: suggestionParams, body: suggestionFeedbackBody }, async (req, res) => {
    const { resumeId, suggestionId } = req.params;
    await service.saveFeedback(currentUser(req).id, resumeId, suggestionId, req.body);
    res.status(204).end();
  }),
);
