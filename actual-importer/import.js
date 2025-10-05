let dotenv = require('dotenv');
dotenv.config();

let fs = require('fs');
let path = require('path');
let csv = require('csv-parser');
let actual = require('@actual-app/api');

const ACTUAL_SERVER = 'https://localhost:5006';
const BUDGET_NAME = "Personal"; // NOTE: Hardcoded budget name
const ACCOUNTS_FILE = "./accounts.json";

function loadActualIds() {
  const data = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8'));
  return data.find(d => d["budget"] === BUDGET_NAME);
}

function getRelevantIds(filePath) {
  // Guess the account ID based on the default output of the PDF parser
  // - Pattern: "<bank>-[debit|credit]-YYYY-MM-<hash>.csv"
  // - <bank> : "dbs", "trust"

  const BANK_MAPPING = {
    "dbs": "POSB",
    "trust": "Trust",
  };
  base = path.basename(filePath, '.csv');
  bank = BANK_MAPPING[base.split("-")[0]];

  const ids = loadActualIds();
  const account = ids["accounts"].find(x => x["name"] === bank);
  return [ids["id"], account["id"]];
}

async function loadTransactions(filePath, accountId) {
  const transactions = [];

  let checkHeaders = (headers) => {
    const EXPECTED = ['date', 'description', 'amount'];
    const ok = EXPECTED.every(
      (exp, i) => headers[i] === exp
    );

    if (!ok) {
      return reject(
        new Error(`CSV header mismatch, got: ${headers}`)
      );
    }
  };

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('header', checkHeaders)
      .on('data', (row) => {
        const date = row.date.trim();
        const desc = row.description.trim();
        // Expects integer
        const amount = Math.round(parseFloat(row.amount) * 100);

        transactions.push({
          account: accountId,
          date,
          amount,
          imported_payee: desc,
          notes: '',
        });
      })
      .on('end', () => resolve(transactions))
      .on('error', reject);
  });
}

async function run() {
  if (process.argv.length < 3) {
    console.error("Expects path to CSV containing transactions as argument");
    process.exit(1);
  }

  const csvPath = process.argv[2];
  const [budgetId, accountId] = getRelevantIds(csvPath);
  const transactions = await loadTransactions(csvPath, accountId); 

  console.log(`Loaded ${transactions.length} transactions from ${path.basename(csvPath)}`);

  try {
    await actual.init({
      dataDir: '/tmp',
      serverURL: ACTUAL_SERVER,
      password: process.env.ACTUAL_PASSWORD,
    });

    await actual.downloadBudget(budgetId);
    await actual.addTransactions(accountId, transactions);
    await actual.sync();

  } catch (err) {
    console.err(err);
  } finally {
    await actual.shutdown();
  }
}

run();
