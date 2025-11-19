import { query } from '../utils/database'

export const getCards = async (params: { type?: string, suit?: string, page?: number, limit?: number }) => {
  const page = params.page || 1
  const limit = params.limit || 78
  const offset = (page - 1) * limit
  const where: string[] = []
  const values: any[] = []
  if (params.type) { where.push('card_type = ?'); values.push(params.type) }
  if (params.suit) { where.push('suit = ?'); values.push(params.suit) }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const sql = `SELECT id, name, english_name AS englishName, card_type AS type, suit, number, roman_numeral AS romanNumeral, image_url AS imageUrl, thumbnail_url AS thumbnailUrl, upright_meaning AS uprightMeaning, reversed_meaning AS reversedMeaning, upright_keywords AS uprightKeywords, reversed_keywords AS reversedKeywords FROM tarot_cards ${whereSql} ORDER BY id LIMIT ? OFFSET ?`
  values.push(limit, offset)
  const rows: any = await query(sql, values)
  return rows
}

export const getCardById = async (id: number) => {
  const sql = `SELECT id, name, english_name AS englishName, card_type AS type, suit, number, roman_numeral AS romanNumeral, image_url AS imageUrl, thumbnail_url AS thumbnailUrl, upright_meaning AS uprightMeaning, reversed_meaning AS reversedMeaning, upright_keywords AS uprightKeywords, reversed_keywords AS reversedKeywords, description, element, planet, zodiac_sign AS zodiacSign, season, direction, color FROM tarot_cards WHERE id = ?`
  const rows: any = await query(sql, [id])
  return rows[0] || null
}

export const countCards = async (params: { type?: string, suit?: string }) => {
  const where: string[] = []
  const values: any[] = []
  if (params.type) { where.push('card_type = ?'); values.push(params.type) }
  if (params.suit) { where.push('suit = ?'); values.push(params.suit) }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const sql = `SELECT COUNT(1) AS total FROM tarot_cards ${whereSql}`
  const rows: any = await query(sql, values)
  return rows[0]?.total || 0
}