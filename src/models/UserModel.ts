import { query } from '../utils/database'

export const getByOpenId = async (openid: string) => {
  const rows: any = await query(`SELECT id, openid, nickname, avatar_url AS avatarUrl, is_vip AS isVip, vip_expire_at AS vipExpireAt, ai_persona AS aiPersona FROM users WHERE openid = ? LIMIT 1`, [openid])
  return rows[0] || null
}

export const createUser = async (params: { openid: string, nickname?: string, avatarUrl?: string }) => {
  const res: any = await query(`INSERT INTO users (openid, nickname, avatar_url) VALUES (?, ?, ?)`, [params.openid, params.nickname || null, params.avatarUrl || null])
  const rows: any = await query(`SELECT id, openid, nickname, avatar_url AS avatarUrl, is_vip AS isVip, vip_expire_at AS vipExpireAt, ai_persona AS aiPersona FROM users WHERE id = ?`, [res.insertId])
  return rows[0]
}

export const updateLastLogin = async (openid: string) => {
  await query(`UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE openid = ?`, [openid])
}

export const getById = async (id: number) => {
  const rows: any = await query(`SELECT id, openid, nickname, avatar_url AS avatarUrl, is_vip AS isVip, vip_expire_at AS vipExpireAt, ai_persona AS aiPersona FROM users WHERE id = ? LIMIT 1`, [id])
  return rows[0] || null
}

export const getStats = async (userId: number) => {
  const totalRows: any = await query(`SELECT COUNT(1) AS total FROM divination_records WHERE user_id = ?`, [userId])
  const totalDivinations = totalRows[0]?.total || 0

  const monthRows: any = await query(`SELECT COUNT(1) AS total FROM divination_records WHERE user_id = ? AND created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')`, [userId])
  const thisMonthDivinations = monthRows[0]?.total || 0

  const weekRows: any = await query(`SELECT COUNT(1) AS total FROM divination_records WHERE user_id = ? AND YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)`, [userId])
  const thisWeekDivinations = weekRows[0]?.total || 0

  const favTypeRows: any = await query(`SELECT dt.name AS name, COUNT(1) AS c FROM divination_records r JOIN divination_types dt ON r.type_id = dt.id WHERE r.user_id = ? GROUP BY r.type_id ORDER BY c DESC LIMIT 1`, [userId])
  const favoriteType = favTypeRows[0]?.name || null

  const categoryRows: any = await query(`SELECT question_category AS category, COUNT(1) AS c FROM divination_records WHERE user_id = ? AND question_category IS NOT NULL AND question_category <> '' GROUP BY question_category ORDER BY c DESC LIMIT 1`, [userId])
  const mostAskedCategory = categoryRows[0]?.category || null

  const ratingRows: any = await query(`SELECT AVG(user_rating) AS avg FROM divination_records WHERE user_id = ? AND user_rating IS NOT NULL`, [userId])
  const averageRating = ratingRows[0]?.avg ? Number(ratingRows[0].avg) : null

  const favCardsRows: any = await query(`SELECT cdr.card_id AS id, tc.name AS name, COUNT(1) AS count FROM card_draw_results cdr JOIN divination_records r ON r.id = cdr.record_id JOIN tarot_cards tc ON tc.id = cdr.card_id WHERE r.user_id = ? GROUP BY cdr.card_id, tc.name ORDER BY count DESC LIMIT 5`, [userId])
  const favoriteCards = favCardsRows.map((r: any) => ({ id: r.id, name: r.name, count: r.count }))

  const trendRows: any = await query(`SELECT DATE(created_at) AS date, COUNT(1) AS count FROM divination_records WHERE user_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL 14 DAY) GROUP BY DATE(created_at) ORDER BY DATE(created_at) ASC`, [userId])
  const days: string[] = []
  const now = new Date()
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }
  const trendMap = new Map<string, number>()
  for (const r of trendRows) {
    const d = typeof r.date === 'string' ? r.date : (r.date?.toISOString?.() || '').slice(0, 10)
    if (d) trendMap.set(d, Number(r.count) || 0)
  }
  const divinationTrend = days.map(d => ({ date: d, count: trendMap.get(d) || 0 }))

  const userRows: any = await query(`SELECT is_vip AS isVip, vip_expire_at AS vipExpireAt FROM users WHERE id = ? LIMIT 1`, [userId])
  const isVip = !!userRows[0]?.isVip
  const vipExpireAt = userRows[0]?.vipExpireAt || null

  return {
    totalDivinations,
    thisMonthDivinations,
    thisWeekDivinations,
    favoriteType,
    mostAskedCategory,
    averageRating,
    favoriteCards,
    divinationTrend,
    isVip,
    vipExpireAt
  }
}

export const getPersona = async (userId: number) => {
  const rows: any = await query(`SELECT ai_persona AS aiPersona FROM users WHERE id = ? LIMIT 1`, [userId])
  return rows[0]?.aiPersona || null
}

export const setPersona = async (userId: number, persona: string) => {
  await query(`UPDATE users SET ai_persona = ? WHERE id = ?`, [persona, userId])
}

export const setDailyPushEnabled = async (userId: number, enabled: boolean) => {
  await query(`UPDATE users SET daily_push_enabled = ? WHERE id = ?`, [enabled ? 1 : 0, userId])
}