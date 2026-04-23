import whoamiHandler from "../whoami/index";

export const command = { name: "session", description: "Alias for `ki whoami` — print the current tmux session name." };

export default whoamiHandler;
