import { query } from './database'

const majorArcana = [
  { name: '愚者', english_name: 'The Fool', number: 0, roman_numeral: '0' },
  { name: '魔术师', english_name: 'The Magician', number: 1, roman_numeral: 'I' },
  { name: '女祭司', english_name: 'The High Priestess', number: 2, roman_numeral: 'II' },
  { name: '皇后', english_name: 'The Empress', number: 3, roman_numeral: 'III' },
  { name: '皇帝', english_name: 'The Emperor', number: 4, roman_numeral: 'IV' },
  { name: '教皇', english_name: 'The Hierophant', number: 5, roman_numeral: 'V' },
  { name: '恋人', english_name: 'The Lovers', number: 6, roman_numeral: 'VI' },
  { name: '战车', english_name: 'The Chariot', number: 7, roman_numeral: 'VII' },
  { name: '力量', english_name: 'Strength', number: 8, roman_numeral: 'VIII' },
  { name: '隐士', english_name: 'The Hermit', number: 9, roman_numeral: 'IX' },
  { name: '命运之轮', english_name: 'Wheel of Fortune', number: 10, roman_numeral: 'X' },
  { name: '正义', english_name: 'Justice', number: 11, roman_numeral: 'XI' },
  { name: '倒吊人', english_name: 'The Hanged Man', number: 12, roman_numeral: 'XII' },
  { name: '死亡', english_name: 'Death', number: 13, roman_numeral: 'XIII' },
  { name: '节制', english_name: 'Temperance', number: 14, roman_numeral: 'XIV' },
  { name: '恶魔', english_name: 'The Devil', number: 15, roman_numeral: 'XV' },
  { name: '高塔', english_name: 'The Tower', number: 16, roman_numeral: 'XVI' },
  { name: '星星', english_name: 'The Star', number: 17, roman_numeral: 'XVII' },
  { name: '月亮', english_name: 'The Moon', number: 18, roman_numeral: 'XVIII' },
  { name: '太阳', english_name: 'The Sun', number: 19, roman_numeral: 'XIX' },
  { name: '审判', english_name: 'Judgement', number: 20, roman_numeral: 'XX' },
  { name: '世界', english_name: 'The World', number: 21, roman_numeral: 'XXI' }
]

const minorSuits = [
  { suit: 'cups', cn: '圣杯' },
  { suit: 'pentacles', cn: '钱币' },
  { suit: 'swords', cn: '宝剑' },
  { suit: 'wands', cn: '权杖' }
]

const rankMap = [
  { en: 'Ace', cn: '一' },
  { en: 'Two', cn: '二' },
  { en: 'Three', cn: '三' },
  { en: 'Four', cn: '四' },
  { en: 'Five', cn: '五' },
  { en: 'Six', cn: '六' },
  { en: 'Seven', cn: '七' },
  { en: 'Eight', cn: '八' },
  { en: 'Nine', cn: '九' },
  { en: 'Ten', cn: '十' },
  { en: 'Page', cn: '侍者' },
  { en: 'Knight', cn: '骑士' },
  { en: 'Queen', cn: '女王' },
  { en: 'King', cn: '国王' }
]

const buildMajor = () => {
  return majorArcana.map(m => ({
    name: m.name,
    english_name: m.english_name,
    card_type: 'major',
    suit: null,
    number: m.number,
    roman_numeral: m.roman_numeral,
    image_url: `/images/cards/major/${m.number}.jpg`,
    thumbnail_url: `/images/cards/major/thumb/${m.number}.jpg`,
    upright_keywords: '启程,成长,觉察,命运',
    reversed_keywords: '停滞,阻碍,混乱,考验',
    upright_meaning: `${m.name}象征关键课题与生命阶段。正位代表积极推动与内在力量。`,
    reversed_meaning: `${m.name}逆位提示需要调整方向或处理阻碍。`,
    description: `${m.name}体现原型能量与深层意义。`,
    element: null,
    planet: null,
    zodiac_sign: null,
    season: null,
    direction: null,
    color: null
  }))
}

const buildMinor = () => {
  const items: any[] = []
  minorSuits.forEach(s => {
    rankMap.forEach((r, idx) => {
      const num = idx + 1
      const name = `${s.cn}${r.cn}`
      const english = `${r.en} of ${s.suit.charAt(0).toUpperCase() + s.suit.slice(1)}`
      items.push({
        name,
        english_name: english,
        card_type: 'minor',
        suit: s.suit,
        number: num,
        roman_numeral: null,
        image_url: `/images/cards/minor/${s.suit}_${r.en.toLowerCase()}.jpg`,
        thumbnail_url: `/images/cards/minor/thumb/${s.suit}_${r.en.toLowerCase()}.jpg`,
        upright_keywords: '情感,资源,思考,行动',
        reversed_keywords: '失衡,阻碍,犹疑,偏激',
        upright_meaning: `${name}正位提示该领域的积极进展与成长。`,
        reversed_meaning: `${name}逆位提示需要修正策略与重新平衡。`,
        description: `${name}对应${s.cn}的主题与该阶位的具体课题。`,
        element: null,
        planet: null,
        zodiac_sign: null,
        season: null,
        direction: null,
        color: null
      })
    })
  })
  return items
}

export const seedCards = async () => {
  const totalRows: any = await query('SELECT COUNT(1) AS total FROM tarot_cards')
  const total = totalRows[0]?.total || 0
  const majorsRows: any = await query("SELECT COUNT(1) AS c FROM tarot_cards WHERE card_type='major'")
  const minorsCups: any = await query("SELECT COUNT(1) AS c FROM tarot_cards WHERE card_type='minor' AND suit='cups'")
  const minorsPent: any = await query("SELECT COUNT(1) AS c FROM tarot_cards WHERE card_type='minor' AND suit='pentacles'")
  const minorsSwords: any = await query("SELECT COUNT(1) AS c FROM tarot_cards WHERE card_type='minor' AND suit='swords'")
  const minorsWands: any = await query("SELECT COUNT(1) AS c FROM tarot_cards WHERE card_type='minor' AND suit='wands'")

  const needSeed = total < 78 || majorsRows[0]?.c < 22 || minorsCups[0]?.c < 14 || minorsPent[0]?.c < 14 || minorsSwords[0]?.c < 14 || minorsWands[0]?.c < 14
  const data = [...buildMajor(), ...buildMinor()]

  if (!needSeed) {
    for (const d of data) {
      const exist: any = await query('SELECT id FROM tarot_cards WHERE english_name = ? LIMIT 1', [d.english_name])
      if (exist.length) {
        await query(
          'UPDATE tarot_cards SET name=?, card_type=?, suit=?, number=?, roman_numeral=?, image_url=?, thumbnail_url=?, upright_keywords=?, reversed_keywords=?, upright_meaning=?, reversed_meaning=?, description=?, element=?, planet=?, zodiac_sign=?, season=?, direction=?, color=? WHERE id=?',
          [d.name, d.card_type, d.suit, d.number, d.roman_numeral, d.image_url, d.thumbnail_url, d.upright_keywords, d.reversed_keywords, d.upright_meaning, d.reversed_meaning, d.description, d.element, d.planet, d.zodiac_sign, d.season, d.direction, d.color, exist[0].id]
        )
      }
    }
    return
  }

  for (const d of data) {
    const exist: any = await query('SELECT id FROM tarot_cards WHERE english_name = ? LIMIT 1', [d.english_name])
    if (exist.length) {
      await query(
        'UPDATE tarot_cards SET name=?, card_type=?, suit=?, number=?, roman_numeral=?, image_url=?, thumbnail_url=?, upright_keywords=?, reversed_keywords=?, upright_meaning=?, reversed_meaning=?, description=?, element=?, planet=?, zodiac_sign=?, season=?, direction=?, color=? WHERE id=?',
        [d.name, d.card_type, d.suit, d.number, d.roman_numeral, d.image_url, d.thumbnail_url, d.upright_keywords, d.reversed_keywords, d.upright_meaning, d.reversed_meaning, d.description, d.element, d.planet, d.zodiac_sign, d.season, d.direction, d.color, exist[0].id]
      )
    } else {
      await query(
        'INSERT INTO tarot_cards (name, english_name, card_type, suit, number, roman_numeral, image_url, thumbnail_url, upright_keywords, reversed_keywords, upright_meaning, reversed_meaning, description, element, planet, zodiac_sign, season, direction, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [d.name, d.english_name, d.card_type, d.suit, d.number, d.roman_numeral, d.image_url, d.thumbnail_url, d.upright_keywords, d.reversed_keywords, d.upright_meaning, d.reversed_meaning, d.description, d.element, d.planet, d.zodiac_sign, d.season, d.direction, d.color]
      )
    }
  }
}

export default seedCards