let dotenv = require('dotenv');
dotenv.config();

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
    console.log(`Found ${budgets.length} budgets`);
    for (const budget of budgets) {
      await actual.downloadBudget(budget.groupId);
      const accounts = await actual.getAccounts();

      console.log(`${budget.name}: ${budget.groupId}`); 
      for (const account of accounts) {
        console.log(`> ${account.name}: ${account.id}`);
      }
    }

  } catch (err) {
    console.error(err);
  } finally {
    await actual.shutdown();
  }
})();

