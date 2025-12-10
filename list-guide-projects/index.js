const core = require('@actions/core');
const { Octokit } = require('@octokit/rest');

async function run() {
  try {
    const token = core.getInput('token');
    const org = core.getInput('org');
    const octokit = new Octokit({ auth: token });

    const repos = await octokit.paginate(octokit.repos.listForOrg, {
      org,
      type: 'public',
    });

    const guideRepos = repos.filter(repo => repo.name.startsWith('gs-'));

    let matrix = [];
    for (const repo of guideRepos) {
      core.info(`Checking repo: ${repo.name}`);
      for (const dir of ['initial', 'complete', 'initial-kotlin', 'complete-kotlin']) {
        try {
          await octokit.repos.getContent({
            owner: org,
            repo: repo.name,
            path: dir,
          });
          core.info(`Found directory: ${dir} in ${repo.name}`);
          matrix.push({ repo: repo.full_name, dir: dir });
        } catch (error) {
          if (error.status !== 404) {
            throw error;
          }
          // Directory does not exist, which is fine
        }
      }
    }

    core.setOutput('matrix', JSON.stringify(matrix));

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
