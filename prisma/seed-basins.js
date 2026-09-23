/**
 * FieldCompliance — seed AAPG basins from EPA's published table.
 *
 * Source: EPA GHG HelpDesk "Subpart W Basin and County Combinations",
 * the authoritative basin<->county mapping used by e-GGRT. Basin codes
 * are AAPG geologic provinces per 40 CFR 98.238.
 *
 * DRY RUN FIRST. This parses a third-party HTML page, so verify the
 * output before writing:
 *
 *   node prisma/seed-basins.js              # parse + report, writes nothing
 *   node prisma/seed-basins.js --commit     # parse + write
 *   node prisma/seed-basins.js --file /tmp/basins.html --commit
 *
 * If the fetch is blocked, save the page manually and pass --file.
 */

require("dotenv").config();
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const SOURCE_URL =
  "https://uat.ccdsupport.com/help/Subpart+W+Basin+and+County+Combinations";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const argv = process.argv.slice(2);
const COMMIT = argv.includes("--commit");
const fileIdx = argv.indexOf("--file");
const FILE = fileIdx !== -1 ? argv[fileIdx + 1] : null;

function stripTags(s) {
  return s
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Tolerant parser. EPA renders the table with a rowspan'd basin cell
 * followed by many county-only rows, so we carry the current basin
 * forward until a new basin cell appears.
 *
 * Basin cell:  "160A - Appalachian Basin (Eastern Overthrust Area)"
 * County cell: "MIDLAND, TX (329)"
 */
const BASIN_RE = /^([0-9]{2,3}[A-Z]?)\s*[-–]\s*(.+)$/;
const COUNTY_RE = /^(.+?),\s*([A-Z]{2})\s*\((\d+)\)$/;

function parse(html) {
  const rows = html.split(/<tr[^>]*>/i).slice(1);
  const basins = new Map(); // code -> name
  const counties = []; // { basinCode, county, state, countyFips }
  let current = null;
  let unmatched = 0;

  for (const row of rows) {
    const cells = row
      .split(/<t[dh][^>]*>/i)
      .slice(1)
      .map((c) => stripTags(c.split(/<\/t[dh]>/i)[0]));
    if (cells.length === 0) continue;

    for (const cell of cells) {
      if (!cell) continue;
      const b = cell.match(BASIN_RE);
      if (b) {
        current = b[1].toUpperCase();
        basins.set(current, b[2].trim());
        continue;
      }
      const c = cell.match(COUNTY_RE);
      if (c && current) {
        counties.push({
          basinCode: current,
          county: c[1].trim().toUpperCase(),
          state: c[2].toUpperCase(),
          countyFips: parseInt(c[3], 10),
        });
      } else if (c && !current) {
        unmatched++;
      }
    }
  }
  return { basins, counties, unmatched };
}

async function main() {
  let html;
  if (FILE) {
    console.log(`Reading ${FILE}...`);
    html = fs.readFileSync(FILE, "utf-8");
  } else {
    console.log(`Fetching ${SOURCE_URL} ...`);
    const res = await fetch(SOURCE_URL);
    if (!res.ok) {
      console.error(
        `Fetch failed (${res.status}). Save the page manually and re-run with --file.`,
      );
      process.exit(1);
    }
    html = await res.text();
  }
  console.log(`  ${html.length.toLocaleString()} bytes\n`);

  const { basins, counties, unmatched } = parse(html);

  console.log(`Parsed ${basins.size} basins, ${counties.length} county rows.`);
  if (unmatched) console.log(`  (${unmatched} county rows had no basin context)`);

  if (basins.size === 0 || counties.length === 0) {
    console.error(
      "\nParse produced nothing usable — the page structure likely changed.\n" +
        "Save the HTML and inspect it, then adjust the parser.",
    );
    process.exit(1);
  }

  const sample = [...basins.entries()].slice(0, 8);
  console.log("\nSample basins:");
  for (const [code, name] of sample) {
    const n = counties.filter((c) => c.basinCode === code).length;
    console.log(`  ${code.padEnd(6)} ${name}  (${n} counties)`);
  }

  // Spot-check a few states an operator would actually care about.
  for (const st of ["TX", "NM", "ND", "OK", "CO"]) {
    const inState = counties.filter((c) => c.state === st);
    const distinct = new Set(inState.map((c) => c.basinCode));
    console.log(
      `\n${st}: ${inState.length} counties across ${distinct.size} basins` +
        (distinct.size ? ` [${[...distinct].slice(0, 8).join(", ")}]` : ""),
    );
  }

  if (!COMMIT) {
    console.log("\nDRY RUN — nothing written. Re-run with --commit when this looks right.");
    return;
  }

  console.log("\nWriting...");
  for (const [code, name] of basins) {
    await prisma.basin.upsert({
      where: { code },
      update: { name },
      create: { code, name },
    });
  }
  console.log(`  \u2713 ${basins.size} basins`);

  let written = 0;
  const seen = new Set();
  for (const c of counties) {
    const key = `${c.state}|${c.county}|${c.basinCode}`;
    if (seen.has(key)) continue;
    seen.add(key);
    await prisma.basinCounty.upsert({
      where: {
        state_county_basinCode: {
          state: c.state,
          county: c.county,
          basinCode: c.basinCode,
        },
      },
      update: { countyFips: c.countyFips },
      create: c,
    });
    written++;
    if (written % 500 === 0) console.log(`    ...${written}`);
  }
  console.log(`  \u2713 ${written} county mappings`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
