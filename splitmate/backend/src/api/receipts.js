// =============================================================================
// api/receipts.js — Receipt scanning endpoint (Pro only)
// =============================================================================

import { scanReceipt } from '../services/receiptService.js';
import { isProUser } from '../services/userService.js';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];

export default async function receiptRoutes(fastify) {

  // POST /api/receipts/scan
  // Body: { image: "<base64>", mimeType: "image/jpeg" }
  fastify.post('/scan', async (req, reply) => {
    // Pro gate
    const isPro = await isProUser(req.user.telegram_id);
    if (!isPro) {
      return reply.code(403).send({
        error: 'PRO_REQUIRED',
        message: 'Receipt scanning is a Pro feature. Upgrade to use it.',
      });
    }

    const { image, mimeType = 'image/jpeg' } = req.body || {};
    if (!image) return reply.code(400).send({ error: 'Missing image data' });

    // Validate mime type
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return reply.code(400).send({ error: 'Invalid image type. Use JPEG, PNG, or WebP.' });
    }

    // Validate base64 size (~5MB max)
    const sizeBytes = Buffer.byteLength(image, 'base64');
    if (sizeBytes > 5 * 1024 * 1024) {
      return reply.code(413).send({ error: 'Image too large. Max 5MB.' });
    }

    const result = await scanReceipt(image, mimeType);
    return { success: true, data: result };
  });
}
