// Git reads this helper only for github.com. The token is never put in argv,
// the remote URL, repository config, or a persistent credential helper.
const helper = String.raw`!f() { if [ "$1" = get ]; then printf '%s\n' 'username=x-access-token' "password=$RIVET_OAUTH_TOKEN"; fi; }; f`;
function cloneOptions(token) {
  return {
    args: [
      "-c",
      "credential.helper=",
      "-c",
      `credential.https://github.com.helper=${helper}`,
    ],
    env: {
      ...process.env,
      RIVET_OAUTH_TOKEN: token,
      GIT_TERMINAL_PROMPT: "0",
    },
  };
}
module.exports = { cloneOptions };
