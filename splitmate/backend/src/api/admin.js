// Temporary admin migration endpoint — remove after use
export default async function adminRoutes(fastify) {
  fastify.post('/migrate-pro-tier', {
    config: { skipAuth: true }
  }, async (req, reply) => {
    const secret = req.headers['x-admin-secret'];
    if (secret !== process.env.BOT_SECRET) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    try {
      const { default: postgres } = await import('postgres');
      const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1 });

      // Add column
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS pro_tier TEXT DEFAULT 'standard'`;

      // Set Matt to Elite
      const result = await sql`
        UPDATE users 
        SET pro_tier = 'elite', pro_status = true, pro_expires_at = '2099-12-31 23:59:59+00'
        WHERE telegram_id = 646401564
        RETURNING username, pro_tier, pro_expires_at
      `;

      await sql.end();
      return reply.send({ ok: true, updated: result });
    } catch (e) {
      return reply.code(500).send({ error: e.message });
    }
  });
}
