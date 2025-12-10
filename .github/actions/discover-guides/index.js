const core = require('@actions/core');
const exec = require('@actions/exec');
const fs = require('fs').promises;

async function run() {
  try {
    const token = core.getInput('token');
    const org = core.getInput('org');

    let repoListOutput = '';
    const options = {
      listeners: {
        stdout: (data) => {
          repoListOutput += data.toString();
        }
      },
      env: {
        ...process.env,
        GH_TOKEN: token
      }
    };

    await exec.exec('gh', ['repo', 'list', org, '--limit', '1000', '--json', 'name'], options);

    const repos = JSON.parse(repoListOutput)
      .map(repo => repo.name)
      .filter(name => name.startsWith('gs-'));

    let matrix = [];
    for (const repo of repos) {
      core.info(`Checking repo: ${repo}`);
      const tempDir = await fs.mkdtemp('guide-repo-');

      try {
        await exec.exec('gh', ['repo', 'clone', `${org}/${repo}`, tempDir, '--', '--depth', '1'], { env: { ...process.env, GH_TOKEN: token } });

        for (const dir of ['initial', 'complete', 'initial-kotlin', 'complete-kotlin']) {
          try {
            const stats = await fs.stat(`${tempDir}/${dir}`);
            if (stats.isDirectory()) {
              core.info(`Found directory: ${dir} in ${repo}`);
              matrix.push({ repo: `${org}/${repo}`, directory: dir });
            }
          } catch (error) {
            // Directory does not exist, which is fine
          }
        }
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    }

    core.setOutput('matrix', JSON.stringify(matrix));

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
