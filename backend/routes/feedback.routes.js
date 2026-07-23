import { Router } from "express";
import { z } from "zod";
import { getPublicFeedback, submitPublicFeedback } from "../services/deliveryFeedbackService.js";
import { queueSms } from "../services/smsService.js";

const router = Router();
const feedbackSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  driverBehaviourRating: z.coerce.number().int().min(1).max(5),
  deliverySpeedRating: z.coerce.number().int().min(1).max(5),
  cargoConditionRating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional(),
  cargoReceivedSafely: z.boolean(),
  reportProblem: z.boolean().default(false),
});

router.get("/:token", async (req, res, next) => {
  try {
    const result = await getPublicFeedback(req.params.token);
    if (result.error) return res.status(result.error.status).json({ message: result.error.message });
    res.json(result.data);
  } catch (error) {
    next(error);
  }
});

router.post("/:token", async (req, res, next) => {
  try {
    const parsed = feedbackSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Complete all required feedback fields" });
    const result = await submitPublicFeedback(req.params.token, parsed.data);
    if (result.error) return res.status(result.error.status).json({ message: result.error.message });
    const feedback = result.data;
    const recipients = [
      [feedback.senderName, feedback.senderPhone],
      [feedback.receiverName, feedback.receiverPhone],
    ].filter(([, phone], index, rows) => phone && rows.findIndex(([, value]) => value === phone) === index);
    await Promise.all(recipients.map(([name, phone]) => queueSms({
      entityType: "trip",
      entityId: feedback.tripId,
      event: "feedback.thank_you",
      recipientName: name,
      recipientPhone: phone,
      message: `Thank you for your feedback for cargo ${feedback.tripId}. Your response has been received.`,
    })));
    res.status(201).json({ message: "Thank you. Your feedback has been submitted." });
  } catch (error) {
    next(error);
  }
});

export default router;
