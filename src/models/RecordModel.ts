import { query, transaction } from '../utils/database'

export const createRecord = async (params: { userId: number, typeId: number, question: string, ai?: { interpretation?: string, advice?: string, confidence?: number }, status?: string }) => {
  const sql = `INSERT INTO divination_records (user_id, type_id, question, status, ai_interpretation, ai_advice, ai_confidence) VALUES (?, ?, ?, ?, ?, ?, ?)`
  const values = [params.userId, params.typeId, params.question, params.status || 'completed', params.ai?.interpretation || null, params.ai?.advice || null, params.ai?.confidence || null]
  const res: any = await query(sql, values)
  return res.insertId
}

export const addCardResults = async (recordId: number, results: { card_id: number, position: number, position_name?: string, is_reversed?: boolean, interpretation?: string, keywords?: string, position_meaning?: string }[]) => {
  if (!results || results.length === 0) return
  await transaction(async (conn) => {
    for (const r of results) {
      const sql = `INSERT INTO card_draw_results (record_id, card_id, position, position_name, is_reversed, interpretation, keywords, position_meaning) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      const values = [recordId, r.card_id, r.position, r.position_name || null, !!r.is_reversed, r.interpretation || null, r.keywords || null, r.position_meaning || null]
      await conn.execute(sql, values)
    }
  })
}

export const getTypeIdByName = async (name: string) => {
  const findSql = `SELECT id FROM divination_types WHERE name = ? LIMIT 1`
  const rows: any = await query(findSql, [name])
  if (rows.length) return rows[0].id
  const insertSql = `INSERT INTO divination_types (name, card_count, status) VALUES (?, ?, 1)`
  const count = name === 'single' ? 1 : name === 'three' ? 3 : name === 'celtic' ? 10 : 3
  const res: any = await query(insertSql, [name, count])
  return res.insertId
}

export const getHistory = async (userId: number, page = 1, limit = 10) => {
  const offset = (page - 1) * limit
  const sql = `SELECT r.id, r.question, dt.name AS type, r.status, r.created_at AS createdAt FROM divination_records r JOIN divination_types dt ON r.type_id = dt.id WHERE r.user_id = ? ORDER BY r.created_at DESC LIMIT ? OFFSET ?`
  const rows: any = await query(sql, [userId, limit, offset])
  const countRows: any = await query(`SELECT COUNT(1) AS total FROM divination_records WHERE user_id = ?`, [userId])
  return { records: rows, total: countRows[0]?.total || 0 }
}

export const getResult = async (recordId: number) => {
  const recRows: any = await query(`SELECT r.id, r.question, dt.name AS type, r.ai_interpretation AS aiInterpretation, r.ai_advice AS aiAdvice, r.created_at AS createdAt FROM divination_records r JOIN divination_types dt ON r.type_id = dt.id WHERE r.id = ? LIMIT 1`, [recordId])
  const cards: any = await query(`SELECT cdr.card_id AS id, tc.name, tc.image_url AS imageUrl, cdr.position, cdr.position_name AS positionName, cdr.is_reversed AS isReversed, cdr.interpretation FROM card_draw_results cdr JOIN tarot_cards tc ON cdr.card_id = tc.id WHERE cdr.record_id = ? ORDER BY cdr.position ASC`, [recordId])
  const rec = recRows[0] || null
  if (!rec) return null
  return { ...rec, cards }
}