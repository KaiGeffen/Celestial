// Generates single-use redeem codes and inserts them into redeem_codes.
// Run inside the container that already has the right DATABASE_URL, e.g.:
//   docker compose exec backend npm run redeem-codes -- --count 50 --coins 1000
//   docker compose exec backend-staging npm run redeem-codes -- --count 5 --item 2001
// Locally: npm run redeem-codes -- --count 5 --gems 100
import { randomBytes } from 'crypto'
import { db } from '../db/db'
import { redeemCodes } from '../db/schema'

// No 0/O, 1/I/L — avoids ambiguity when someone types a code by hand
const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const GROUP_LENGTH = 4
const GROUPS = 3

function generateCode(): string {
  const groups: string[] = []
  for (let g = 0; g < GROUPS; g++) {
    let group = ''
    for (let i = 0; i < GROUP_LENGTH; i++) {
      group += CHARSET[randomBytes(1)[0] % CHARSET.length]
    }
    groups.push(group)
  }
  return groups.join('-')
}

interface Args {
  count: number
  coins: number
  gems: number
  itemId: number | null
}

function parseArgs(): Args {
  const argv = process.argv.slice(2)
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag)
    return i === -1 ? undefined : argv[i + 1]
  }

  const count = Number(get('--count'))
  if (!Number.isInteger(count) || count <= 0) {
    console.error(
      'Usage: npm run redeem-codes -- --count <n> [--coins <n>] [--gems <n>] [--item <id>]',
    )
    process.exit(1)
  }

  const itemArg = get('--item')

  return {
    count,
    coins: Number(get('--coins') ?? 0),
    gems: Number(get('--gems') ?? 0),
    itemId: itemArg !== undefined ? Number(itemArg) : null,
  }
}

async function main(): Promise<void> {
  const { count, coins, gems, itemId } = parseArgs()

  // Charset^length is astronomically larger than any realistic batch size,
  // so an in-batch Set is enough to avoid duplicates without checking the DB
  const codes = new Set<string>()
  while (codes.size < count) {
    codes.add(generateCode())
  }
  const codeList = [...codes]

  await db.insert(redeemCodes).values(
    codeList.map((code) => ({
      code,
      amount_coins: coins,
      amount_gems: gems,
      item_id: itemId,
    })),
  )

  const rewardDesc = [
    coins ? `${coins.toLocaleString()} coins` : null,
    gems ? `${gems.toLocaleString()} gems` : null,
    itemId !== null ? `item ${itemId}` : null,
  ]
    .filter(Boolean)
    .join(', ')

  console.log(`Created ${count} code(s) worth: ${rewardDesc || 'nothing (!)'}\n`)
  codeList.forEach((code) => console.log(code))

  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
