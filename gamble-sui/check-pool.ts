/**
 * check-pool.ts
 * Fetches a live pool from testnet and validates the winnerCopyIds extraction logic.
 *
 * Run:  npx tsx check-pool.ts
 */

const POOL_ID = "0x3aa11f079373cb7231cecff1ba84fb322ffd3d75292ee8b857ceb5c7374d3643";
const GQL_URL = "https://graphql.testnet.sui.io/graphql";

const QUERY = `
  query FetchPool($id: SuiAddress!) {
    object(address: $id) {
      address
      asMoveObject {
        contents {
          json
        }
      }
    }
  }
`;

async function fetchPool(id: string): Promise<Record<string, any>> {
  const res = await fetch(GQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: QUERY, variables: { id } }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const { data, errors } = await res.json();
  if (errors?.length) throw new Error(errors.map((e: any) => e.message).join("\n"));
  const json = data?.object?.asMoveObject?.contents?.json;
  if (!json) throw new Error("Pool not found or not a Move object");
  return json;
}

/** Mirrors the logic in ticket.tsx fetchPools */
function extractWinnerCopyIds(jsonData: Record<string, any>): string[] {
  const idT: any[] = jsonData.idT ?? jsonData.id_t ?? [];
  const rawIndices: any[] = jsonData.indices ?? [];

  return rawIndices
    .map((idx: any) => {
      const i = Number(idx);
      const entry = idT[i];
      if (!entry) return null;
      const cid = entry.copy_id ?? entry.copyId;
      return typeof cid === "string" ? cid : null;
    })
    .filter(Boolean) as string[];
}

async function main() {
  console.log(`\nFetching pool ${POOL_ID} from testnet...\n`);

  const json = await fetchPool(POOL_ID);

  // ── Raw fields ───────────────────────────────────────────────────────────────
  console.log("=== Raw pool JSON ===");
  console.log(JSON.stringify(json, null, 2));

  // ── Key fields ───────────────────────────────────────────────────────────────
  const canRedeem: boolean = Boolean(json.canRedeem ?? json.can_redeem);
  const fixedPrice: string = String(json.fixed_price ?? json.fixedPrice ?? "N/A");
  const idT: any[] = json.idT ?? json.id_t ?? [];
  const indices: any[] = json.indices ?? [];

  console.log("\n=== Settlement state ===");
  console.log("canRedeem   :", canRedeem);
  console.log("fixed_price :", fixedPrice);
  console.log("indices     :", indices);
  console.log("idT length  :", idT.length);

  console.log("\n=== All tickets in pool ===");
  idT.forEach((t, i) => {
    console.log(`  [${i}] copy_id=${t.copy_id ?? t.copyId}  price=${t.price}`);
  });

  // ── Winner extraction ────────────────────────────────────────────────────────
  const winnerCopyIds = extractWinnerCopyIds(json);

  console.log("\n=== Winner copy IDs (original Ticket object IDs) ===");
  if (winnerCopyIds.length === 0) {
    console.log("  (none — pool not settled or indices empty)");
  } else {
    winnerCopyIds.forEach((id) => console.log(" ", id));
  }

  // ── Correctness checks ───────────────────────────────────────────────────────
  console.log("\n=== Checks ===");

  let passed = 0;
  let failed = 0;

  function check(label: string, condition: boolean) {
    const mark = condition ? "✓" : "✗";
    console.log(`  ${mark} ${label}`);
    condition ? passed++ : failed++;
  }

  check(
    "idT and indices arrays are present",
    Array.isArray(idT) && Array.isArray(indices)
  );

  check(
    "every index is within idT bounds",
    indices.every((idx) => Number(idx) < idT.length)
  );

  check(
    "every winning entry has a copy_id string",
    indices.every((idx) => {
      const entry = idT[Number(idx)];
      const cid = entry?.copy_id ?? entry?.copyId;
      return typeof cid === "string" && cid.startsWith("0x");
    })
  );

  check(
    "winnerCopyIds count matches indices count",
    winnerCopyIds.length === indices.length
  );

  if (canRedeem) {
    check("pool is settled (canRedeem = true)", true);
    check(
      "at least one winner found",
      winnerCopyIds.length > 0
    );
  } else {
    check("pool is NOT yet settled — run redeem_setting first", false);
  }

  console.log(`\n  ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
