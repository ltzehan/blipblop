let dotenv = require('dotenv');
dotenv.config();

let fs = require('fs');
let actual = require('@actual-app/api');

const ACTUAL_SERVER = 'https://localhost:5006';

(async () => {
  try {
    await actual.init({
      dataDir: '/tmp',
      serverURL: ACTUAL_SERVER,
      password: process.env.ACTUAL_PASSWORD,
    });

    const budgets = await actual.getBudgets();

    // NOTE: Not sure why but budget is duplicated
    seen = new Set();
    d = [];

    for (const budget of budgets) {
      if (seen.has(budget.groupId)) {
        continue;
      }

      seen.add(budget.groupId);
      await actual.downloadBudget(budget.groupId);
      const accounts = await actual.getAccounts();

      accs = [];
      for (const account of accounts) {
        accs.push({
          "name": account.name,
          "id": account.id,
        });
      }

      d.push({
        "budget": budget.name,
        "id": budget.groupId,
        "accounts": accs,
      });
    }

    console.log("Found accounts:");
    console.dir(d, {
      depth: null,
      colors: true,
    });

    fs.writeFileSync('accounts.json', JSON.stringify(d, null, 2), 'utf8');

  } catch (err) {
    console.error(err);
  } finally {
    await actual.shutdown();
  }
})();

