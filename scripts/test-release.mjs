import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
const tests = readdirSync("tests")
  .filter((f) => f.endsWith(".test.mjs"))
  .map((f) => "tests/" + f);
const r = spawnSync(process.execPath, ["--test", ...tests], {
  stdio: "inherit",
  env: { ...process.env, LITTLE_LINKS_TEST_CODE: "XI9L4GHAEQ93kNMCD07A" },
});
process.exitCode = r.status || 0;
