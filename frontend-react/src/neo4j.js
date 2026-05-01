import neo4j from 'neo4j-driver'

const URI = 'neo4j://127.0.0.1:7687'
const USER = 'neo4j'
const PASSWORD = '12345678'
const DATABASE = 'neo4j'

let driver = null

export function getDriver() {
  if (!driver) {
    driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD))
  }
  return driver
}

export async function runQuery(cypher, params = {}) {
  const d = getDriver()
  const session = d.session({ database: DATABASE })
  try {
    const result = await session.run(cypher, params)
    return result.records.map(record => {
      const obj = {}
      record.keys.forEach(key => {
        const val = record.get(key)
        obj[key] = neo4j.isInt(val) ? val.toNumber() : val
      })
      return obj
    })
  } finally {
    await session.close()
  }
}

export async function testConnection() {
  try {
    const result = await runQuery('RETURN 1 AS ok')
    return result[0]?.ok === 1
  } catch (e) {
    console.error('Neo4j connection failed:', e)
    return false
  }
}

// Helper to convert Neo4j integers in nested objects
export function toNumber(val) {
  if (neo4j.isInt(val)) return val.toNumber()
  if (typeof val === 'object' && val !== null && 'low' in val && 'high' in val) {
    return neo4j.integer.toNumber(val)
  }
  return val
}
