# 📊 Rust Monitoring Bot

[![Author](https://img.shields.io/badge/Author-Etherinus-blue.svg)](https://github.com/Etherinus)

Hello! This is `rust-monitoring-bot`, created by **Thomas Rendes (aka Etherinus)**. This Discord bot helps Rust server administrators easily display information about their servers and monitor their online status using BattleMetrics.

## ✨ Features

* **Informational Embeds:** Create and manage beautiful embeds with server information (IP, wipe schedule, restarts, rules, mode, map, etc.).
* **BattleMetrics Monitoring:** Automatically track the online/offline status and player count of Rust servers via the BattleMetrics API.
* **Unified Monitoring Message:** Display the status of all monitored servers in a single, automatically updated Discord message.
* **Flexible Customization:** Set custom colors for each monitoring embed.
* **Automatic Updates:** Server statuses update every 15 minutes.
* **Easy Management:** All commands accessible via Discord slash commands (`/`).
* **Data Persistence:** Embed configurations and monitoring server lists saved in JSON files (`embedsData.json`, `monitors_combined_v1.json`).

## ⚙️ Prerequisites

Before you start, ensure you have:

* [Node.js](https://nodejs.org/) (version 16.x or higher recommended)
* [npm](https://www.npmjs.com/) (usually installed with Node.js) or [yarn](https://yarnpkg.com/)
* **Discord Bot Account:** Create an application and bot on the [Discord Developer Portal](https://discord.com/developers/applications). You will need:
    * Bot `TOKEN`
    * Application `CLIENT_ID`
* **Your Discord Server (Guild) ID:** [How to find ID](https://support.discord.com/hc/en-us/articles/206346498-Where-can-I-find-my-User-Server-Message-ID-)
* **(Optional, for monitoring) BattleMetrics API Token:** Obtain a token from [BattleMetrics](https://www.battlemetrics.com/developers).

## 🚀 Installation and Launch

1. **Clone the repository:**
    ```bash
    git clone https://github.com/etherinus/rust-monitoring-bot
    cd rust-monitoring-bot
    ```

2. **Install dependencies:**
    ```bash
    npm install
    # or if using yarn:
    # yarn install
    ```

3. **Create the `.env` configuration file:**
    * Create a file named `.env` **in the project's root directory** (one level above the `src` folder).
    * Copy the content from below and fill in your values.

    ```dotenv
    # .env file

    # Discord Bot Token (Required)
    TOKEN=YOUR_DISCORD_BOT_TOKEN

    # Discord Application Client ID (Required)
    CLIENT_ID=YOUR_APPLICATION_CLIENT_ID

    # Discord Server (Guild) ID (Required) - Server ID where commands will be registered
    GUILD_ID=YOUR_DISCORD_SERVER_ID

    # BattleMetrics API Token (Optional but needed for monitoring)
    BATTLEMETRICS_TOKEN=YOUR_BATTLEMETRICS_API_TOKEN
    ```
    ⚠️ **Important:** Do not add `.env` file to version control (Git). Ensure it is included in your `.gitignore`.

4. **Invite the bot to your server:**
    * Generate a bot invite link from the Discord Developer Portal. Ensure the bot has the required permissions (`bot`, `application.commands`). Embeds and messages require `Send Messages`, `Embed Links`, `Manage Messages` permissions.
    * Follow the link to add the bot to your server (the one you specified in `.env`).

5. **Run the bot:**
    ```bash
    node src/index.js
    ```
    *Or, if you configured a `start` script in `package.json`:*
    ```bash
    npm start
    # or
    # yarn start
    ```

After launch, the bot registers slash commands on your server and will be ready for use.

## 🛠️ Commands

All commands are accessible via `/` and require **Administrator** permissions on the Discord server.

---

### ℹ️ Informational Embed Management

These commands manage static informational embeds about the server(s). All embeds appear in a single message that the bot updates whenever changes are made.

* `/setserverinfo`
  * **Description:** Creates or completely overwrites the *main* (first) embed with server information. Existing embeds, if any, will be removed.
  * **Parameters:**
    * `servername` (Required): Name of the server.
    * `color` (Required): Embed color in HEX format (e.g., `FAA61A`).
    * `ipaddress` (Required): IP address and port of the server (`IP:PORT`).
    * `wipe_day` (Required): Wipe day of the week (selection from list).
    * `wipe_time` (Required): Wipe time in `HH:MM` format (e.g., `16:00`).
    * `restart_time` (Required): Daily restart time in `HH:MM` format (e.g., `05:00`).
    * `mode` (Required): Server mode (Vanilla, Modded, etc., selection from list).
    * `teamlimit` (Required): Team limit (Solo, Duo, etc., selection from list).
    * `map` (Required): Server map (Procedural, Custom, etc., selection from list).
    * `iconurl` (Optional): Server icon URL (default Discord icon used if not specified).

* `/addembed`
  * **Description:** Adds a *new* embed with server information to existing ones.
  * **Parameters:** Same as `/setserverinfo`.

* `/removeembed`
  * **Description:** Removes an embed based on its sequential number (starting from 1).
  * **Parameters:**
    * `index` (Required): Embed number to remove (integer >= 1).

---

### 📈 BattleMetrics Monitoring Management

These commands manage the list of Rust servers monitored through BattleMetrics. The status of all servers appears in one message and automatically updates every 15 minutes.

* `/setrustmonitor`
  * **Description:** Adds a new server to monitoring or updates settings for an existing one (e.g., color).
  * **Parameters:**
    * `bmid` (Required): Server ID on BattleMetrics.
    * `color` (Optional): Embed color for this server in HEX format (6 characters, e.g., `FF0000`). Default color (gray) is used if not specified.

* `/stoprustmonitor`
  * **Description:** Removes a server from monitoring by its BattleMetrics ID.
  * **Parameters:**
    * `bmid` (Required): Server ID on BattleMetrics to remove from monitoring.

---

## 🚀 Required Emojis Setup

Bot uses custom emojis to clearly display server statuses.  
Make sure to upload the following emojis to your bot via the [Discord Developer Portal](https://discord.com/developers):

| Name (exact)         | Used for                          |
|----------------------|-----------------------------------|
| `server`             | General server info               |
| `serveronline`       | Server online status              |
| `servererror`        | Server offline or error status    |
| `connect`            | Server connection info            |

**Important:** Emoji names must exactly match the names shown above to function correctly with the bot's embed messages.

**How to upload emojis:**  
- Go to your bot’s app in the [Discord Developer Portal](https://discord.com/developers).
- Navigate to the **Emoji** tab.
- Upload each emoji, assigning exactly the provided names.

**Emoji file requirements:**  
- Format: PNG, JPEG, GIF  
- Maximum size: 256 KB  
- Recommended dimensions: 128×128 px

⚡ **Why is this specific emoji naming important?**  
Because your code contains constructions like:

```javascript
name: '<:server:1354278159423504559> **Server:**'
```

where:

- `server` — the emoji's name.
- `1354278159423504559` — the emoji's ID (automatically assigned by Discord upon upload).

If the emoji's name on Discord doesn't match the name specified in your code, the emoji simply won't display correctly in embed messages.

🔹 **Important code update:**

Make sure to replace `<:serveronline:1354278141333471302>` and other emoji placeholders in your `battlemetricsUtils.js` file with your actual emoji IDs. Ensure your emojis have been correctly uploaded to Discord, and their IDs match those defined in your JavaScript code.

Example:

```javascript
embed.addFields(
    {
        name: '<:serveronline:YOUR_REAL_EMOJI_ID> **Status:**',
        value: `Online - ${status.currentPlayers}/${status.maxPlayers}`,
        inline: false
    }
);
```

Replace `YOUR_REAL_EMOJI_ID` with the actual ID from your Discord emojis.

---

## 📁 Project Structure

```bash
rust-monitoring-bot/
│
├── src/
│   ├── commands/
│   │   └── registerCommands.js       # Slash commands registration
│   ├── data/
│   │   ├── embedData.js              # Logic for informational embeds
│   │   └── monitorData.js            # Logic for BattleMetrics monitoring
│   ├── events/
│   │   ├── interactionCreate.js      # Command and interaction handling
│   │   └── ready.js                  # Bot ready event handling
│   ├── utils/
│   │   ├── battlemetricsUtils.js     # Functions for BattleMetrics API
│   │   ├── textUtils.js              # Text formatting utilities
│   │   └── timeUtils.js              # Time utilities (wipes, restarts)
│   └── index.js                      # Main entry point
│
├── .env                               # Configuration file (DO NOT ADD TO GIT!)
├── embedsData.json                    # Informational embed data (auto-generated)
├── monitors_combined_v1.json          # BattleMetrics monitoring data (auto-generated)
├── package.json                       # Project dependencies and scripts
├── package-lock.json                  # or yarn.lock
└── README.md                          # This file
```

---

## 🔧 How It Works

* **Informational Embeds:** Commands `/setserverinfo`, `/addembed`, `/removeembed` update the embed array stored in `embedsData.json`. After each update, the bot attempts to delete the old embed message (if it exists) and sends a new message with the updated set of embeds. Channel and message IDs are saved for future updates.
* **BattleMetrics Monitoring:** Commands `/setrustmonitor` and `/stoprustmonitor` manage the list of servers (`monitoredServers`) in `monitors_combined_v1.json`. The bot periodically (every 15 minutes, configurable in `monitorData.js`) fetches each server's status via the BattleMetrics API. It then creates or updates a single Discord message containing individual status embeds for each monitored server. Channel and monitoring message IDs are also stored in `monitors_combined_v1.json`.

---

## 🖼️ Screenshots

1. Informational Embeds  
![Informational Embeds](https://i.imgur.com/oIQrhRU.png)

2. Single Server Monitoring  
![Single Server Monitoring](https://i.imgur.com/9C4B9My.png)

3. Multiple Servers Monitoring  
![Multiple Servers Monitoring](https://i.imgur.com/nZiIsSB.png)

## 🤝 Contribution

If you find a bug or have suggestions for improvements, please create an Issue or Pull Request in this repository.

## 👤 Author

* **Thomas Rendes (Etherinus)**
* GitHub: [Etherinus](https://github.com/Etherinus)

## 📄 License

Distributed under MIT License. See `LICENSE` for additional information.
