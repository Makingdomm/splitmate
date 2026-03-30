// =============================================================================
// api/comments.js — Expense comments endpoints
// =============================================================================
import { supabase } from '../db/client.js';
import { isMember } from '../services/groupService.js';

export default async function commentRoutes(fastify) {

  // GET /api/comments/:expenseId — get comments for an expense
  fastify.get('/:expenseId', async (req, reply) => {
    const { expenseId } = req.params;

    // Verify user is member of the group this expense belongs to
    const { data: expense } = await supabase
      .from('expenses').select('group_id').eq('id', expenseId).maybeSingle();
    if (!expense) return reply.code(404).send({ error: 'Expense not found' });

    const member = await isMember(expense.group_id, req.user.telegram_id);
    if (!member) return reply.code(403).send({ error: 'Unauthorized' });

    const { data, error } = await supabase
      .from('expense_comments')
      .select('*, users!user_id(full_name, username)')
      .eq('expense_id', expenseId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    return { comments: data || [] };
  });

  // POST /api/comments — add a comment
  fastify.post('/', async (req, reply) => {
    const { expenseId, text } = req.body || {};
    if (!expenseId || !text?.trim()) {
      return reply.code(400).send({ error: 'expenseId and text are required' });
    }
    if (text.trim().length > 500) {
      return reply.code(400).send({ error: 'Comment too long (max 500 chars)' });
    }

    const { data: expense } = await supabase
      .from('expenses').select('group_id').eq('id', expenseId).maybeSingle();
    if (!expense) return reply.code(404).send({ error: 'Expense not found' });

    const member = await isMember(expense.group_id, req.user.telegram_id);
    if (!member) return reply.code(403).send({ error: 'Unauthorized' });

    const { data, error } = await supabase
      .from('expense_comments')
      .insert({ expense_id: expenseId, user_id: req.user.telegram_id, text: text.trim() })
      .select('*, users!user_id(full_name, username)')
      .single();

    if (error) throw new Error(error.message);
    return reply.code(201).send({ comment: data });
  });

  // DELETE /api/comments/:id — delete own comment
  fastify.delete('/:id', async (req, reply) => {
    const { data: comment } = await supabase
      .from('expense_comments').select('user_id').eq('id', req.params.id).maybeSingle();
    if (!comment) return reply.code(404).send({ error: 'Comment not found' });
    if (Number(comment.user_id) !== Number(req.user.telegram_id)) {
      return reply.code(403).send({ error: 'Cannot delete another user\'s comment' });
    }
    await supabase.from('expense_comments').delete().eq('id', req.params.id);
    return { success: true };
  });
}
